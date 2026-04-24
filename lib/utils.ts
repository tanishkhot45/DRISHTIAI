import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Cosine similarity between two equal-length vectors. */
export function cosineSim(a: number[], b: number[]) {
  let dot = 0,
    na = 0,
    nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/** Normalize messy snake_case / kebab-case to a canonical lowercase key. */
export function normalizeTag(s: string) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, (m) => m.replace(/[()]/g, "").replace(/\s+/g, "_"))
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Pretty label for a tag — used across UI. */
export function prettyLabel(input: string): string {
  if (!input) return input;
  const LABEL_MAP: Record<string, string> = {
    marine_subsea: "Marine subsea",
    marine_splash: "Marine splash",
    oil_gas: "Oil & Gas",
    seawater: "Seawater",
    freshwater: "Freshwater",
    hot_water: "Hot water",
    biofouling: "Biofouling",
    crevice: "Crevice",
    cathodic_protection: "Cathodic protection",
    erosion_high_velocity: "High-velocity erosion",
    chlorides_low: "Low chlorides",
    chlorides_mod: "Moderate chlorides",
    chlorides_high: "High chlorides",
    h2s_possible: "H₂S possible",
    h2s_yes: "H₂S present",
    co2_yes: "CO₂ present",
    cip: "CIP",
    sip: "SIP",
    uv_outdoor: "Outdoor UV",
  };
  const key = normalizeTag(input);
  if (LABEL_MAP[key]) return LABEL_MAP[key];
  return key
    .split("_")
    .filter(Boolean)
    .map((w) =>
      /[0-9]/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(" ")
    .replace(/H2S/gi, "H₂S")
    .replace(/CO2/gi, "CO₂");
}

/** Short friendly time formatter for "just now" style. */
export function formatElapsed(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
