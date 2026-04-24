/**
 * STAGE 4 of Drishti flow — Rule engine (deterministic decision logic).
 */

import type {
  MaterialRecord,
  ScoredCandidate,
  SetupInput,
} from "@/lib/types";
import { clamp, normalizeTag } from "@/lib/utils";

const DOMAIN_FAMILY_HINTS: Record<string, string[]> = {
  Hygienic: ["austenitic", "stainless"],
  Cryogenics: ["austenitic", "nickel", "aluminum"],
  "Oil & Gas": ["duplex", "super-duplex", "nickel", "martensitic"],
  Subsea: ["super-duplex", "nickel", "duplex"],
  Mining: ["martensitic", "high-strength", "tool-steel"],
  "Power Systems": ["austenitic", "ferritic", "nickel"],
};

export function runRuleEngine(
  input: SetupInput,
  dataset: MaterialRecord[]
): ScoredCandidate[] {
  const scored: ScoredCandidate[] = [];

  for (const m of dataset) {
    const c = scoreSingle(input, m);
    scored.push(c);
  }

  scored.sort((a, b) => b.score - a.score);

  // Deduplicate by alloy — keep only the highest-scoring form of each material.
  // Identity = normalized name + family. This prevents 5 versions of 2 alloys
  // (e.g. Duplex 2205 in A182/A276/A790 forms all making the top 5).
  const byAlloy = new Map<string, ScoredCandidate>();
  for (const c of scored) {
    const key = `${c.material.name.toLowerCase().trim()}::${(c.material.family || "").toLowerCase()}`;
    const existing = byAlloy.get(key);
    if (!existing || c.score > existing.score) {
      byAlloy.set(key, c);
    }
  }

  return Array.from(byAlloy.values()).sort((a, b) => b.score - a.score);
}

function scoreSingle(
  input: SetupInput,
  m: MaterialRecord
): ScoredCandidate {
  let score = 55; // baseline
  const reasons: string[] = [];
  const penalties: string[] = [];

  const tmin = m.temp_min_c ?? -273;
  const tmax = m.temp_max_c ?? 2000;

  // ---- Hard filter: temperature ----
  const tempOk = input.minTempC >= tmin && input.maxTempC <= tmax;
  if (tempOk) {
    const margin = Math.min(input.minTempC - tmin, tmax - input.maxTempC);
    score += margin > 50 ? 20 : 15;
    reasons.push(`Temperature window fits (${tmin}°C to ${tmax}°C).`);
  } else {
    const deltaLow = Math.max(0, tmin - input.minTempC);
    const deltaHigh = Math.max(0, input.maxTempC - tmax);
    const penalty = clamp((deltaLow + deltaHigh) * 0.4, 10, 40);
    score -= penalty;
    penalties.push(`Outside recommended temp range (${tmin}°C to ${tmax}°C).`);
  }

  // ---- Service medium ----
  const serviceTag = normalizeTag(input.serviceMedium || "unknown");
  const fit = (m.service_fit || []).map(normalizeTag);
  if (fit.includes(serviceTag)) {
    score += 14;
    reasons.push(`Rated for ${input.serviceMedium}.`);
  } else if (serviceTag !== "unknown") {
    score -= 8;
    penalties.push(`Not a first-choice for ${input.serviceMedium}.`);
  }

  // ---- Exposure drivers ----
  const drivers = new Set(input.exposureDrivers);
  const tagSet = new Set((m.tags || []).map(normalizeTag));
  const fam = (m.family || "").toLowerCase();

  if (drivers.has("chlorides_high")) {
    if (
      tagSet.has("chloride_resistant") ||
      fit.includes("seawater") ||
      fam.includes("super-duplex") ||
      fam.includes("nickel")
    ) {
      score += 12;
      reasons.push("Strong chloride resistance.");
    } else {
      score -= 14;
      penalties.push("High chlorides — pitting/crevice risk.");
    }
  }

  if (drivers.has("H2S_yes")) {
    if (
      fit.includes("sour_gas_h2s") ||
      tagSet.has("nace_mr0175") ||
      tagSet.has("sour_service")
    ) {
      score += 12;
      reasons.push("NACE-ready for sour (H₂S) service.");
    } else {
      score -= 14;
      penalties.push("H₂S present — not flagged for sour service.");
    }
  }

  if (
    drivers.has("CO2_yes") &&
    !fit.includes("sweet_gas_co2") &&
    !tagSet.has("co2_resistant")
  ) {
    score -= 4;
    penalties.push("CO₂ present — verify corrosion allowance.");
  }

  if (drivers.has("abrasives_high") || drivers.has("erosion_high_velocity")) {
    const isHard =
      tagSet.has("high_strength") ||
      tagSet.has("hardened") ||
      fam.includes("martensitic") ||
      fam.includes("tool");
    if (isHard) {
      score += 8;
      reasons.push("Hardened / high-strength family helps abrasion.");
    } else {
      score -= 10;
      penalties.push("Abrasives/erosion — consider hardfacing or liners.");
    }
  }

  if (drivers.has("CIP") || drivers.has("SIP")) {
    if (
      fam.includes("austenitic") ||
      fit.includes("food_product") ||
      fit.includes("disinfectants")
    ) {
      score += 10;
      reasons.push("Suitable for CIP/SIP hygienic cleaning.");
    } else {
      score -= 8;
      penalties.push("CIP/SIP not typical for this family.");
    }
  }

  if (
    drivers.has("crevice") &&
    !tagSet.has("crevice_resistant") &&
    !fam.includes("super-duplex")
  ) {
    score -= 6;
    penalties.push("Crevice risk — confirm geometry + grade.");
  }

  if (drivers.has("UV_outdoor") && tagSet.has("uv_sensitive")) {
    score -= 6;
    penalties.push("UV-sensitive — avoid outdoor exposure.");
  }

  // ---- Weldability ----
  if (input.weldabilityRequired === "Yes") {
    const w = (m.weldability || "").toLowerCase();
    if (w.includes("excellent") || w.includes("good")) {
      score += 6;
      reasons.push(
        `${w.includes("excellent") ? "Excellent" : "Good"} weldability.`
      );
    } else {
      score -= 10;
      penalties.push("Weldability may be a limiting factor.");
    }
  }

  // ---- Cost preference ----
  if (input.costSensitivity === "High sensitivity (cost-first)") {
    if (m.cost_band === "high") {
      score -= 12;
      penalties.push("High cost vs cost-first preference.");
    } else if (m.cost_band === "low") {
      score += 6;
      reasons.push("Low cost fits budget-first priority.");
    }
  } else if (input.costSensitivity === "Low sensitivity (performance-first)") {
    if (m.cost_band === "high") {
      score += 3;
    }
  }

  // ---- Sustainability ----
  if (input.sustainabilityPreferred === "Strong") {
    if (m.sustainability === "high") {
      score += 5;
      reasons.push("High recyclability / sustainability rating.");
    } else if (m.sustainability === "low") {
      score -= 4;
      penalties.push("Lower sustainability rating.");
    }
  }

  // ---- Domain family hints ----
  const hints = DOMAIN_FAMILY_HINTS[input.domain] || [];
  if (hints.length && m.family) {
    if (hints.some((h) => fam.includes(h))) {
      score += 5;
      reasons.push(`${m.family} family typical for ${input.domain}.`);
    }
  }

  // ---- Criticality ----
  if (input.criticality === "Safety critical") {
    if (
      tagSet.has("safety_critical") ||
      tagSet.has("top_corrosion") ||
      tagSet.has("asme_code")
    ) {
      score += 6;
      reasons.push("Code-pedigreed for safety-critical duty.");
    } else {
      score -= 3;
      penalties.push("Safety-critical — validate margins + code.");
    }
  }

  // =================================================================
  // ENHANCED RULES — sharper engineering judgment
  // =================================================================

  // ---- Seawater & high-chloride duty — discriminate between stainless grades
  if (input.serviceMedium === "Seawater" || drivers.has("chlorides_high")) {
    const isSuperDuplex = fam.includes("super-duplex");
    const isDuplex = fam.includes("duplex") && !isSuperDuplex;
    const isNickel = fam.includes("nickel");
    const isPlain300Series =
      /(?:304|316)(?:l)?$/i.test(m.name) &&
      !(m.tags || []).some((t) => /(?:super|mo|moly)/i.test(t));

    if (isSuperDuplex || isNickel) {
      score += 6;
      reasons.push("Top-tier pitting resistance for chloride duty.");
    } else if (isDuplex) {
      score += 3;
      reasons.push("Good chloride margin vs standard austenitic grades.");
    } else if (isPlain300Series && input.designLife !== "1–3") {
      score -= 8;
      penalties.push("Standard 304/316 may pit in long-term chloride service.");
    }
  }

  // ---- Long design life (25+ yr) — reward track record
  if (input.designLife === "25+") {
    const hasTrackRecord = (m.tags || []).some((t) =>
      /(?:proven|field|decades|long_service)/i.test(t)
    );
    if (hasTrackRecord) {
      score += 4;
      reasons.push("Proven track record at 25+ year service.");
    }
  }

  // ---- Red flag: safety-critical + cost-first + low-cost pick
  if (
    input.criticality === "Safety critical" &&
    input.costSensitivity === "High sensitivity (cost-first)" &&
    m.cost_band === "low"
  ) {
    score -= 5;
    penalties.push("Low-cost option on safety-critical duty — validate margins.");
  }

  score = clamp(score, 0, 100);
  return { material: m, score, reasons, penalties };
}