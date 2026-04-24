/**
 * STAGE 6 of Drishti flow — ASTM validation (credibility layer).
 *
 * For every shortlisted material we verify that its stated ASTM standard:
 *   1. Exists (is non-empty and looks like a valid ASTM identifier)
 *   2. Matches a known family of ASTM specs
 *   3. Is compatible with the component type
 *
 * This is a DETERMINISTIC layer — we do NOT ask the LLM to check ASTM
 * compliance, because the LLM could hallucinate. Instead we consult a
 * small static rulebook of the most common ASTM specs and their scope.
 */

import type { MaterialRecord, AstmValidation, SetupInput } from "@/lib/types";

// Minimal known-spec rulebook (extend over time).
// `scope` = component types this spec typically covers.
const ASTM_RULEBOOK: Record<
  string,
  { description: string; scope: string[]; families: string[] }
> = {
  "A240": {
    description: "Chromium and Chromium-Nickel Stainless Steel Plate, Sheet, and Strip for Pressure Vessels",
    scope: ["Pressure vessel", "Tank", "Heat exchanger", "Structural"],
    families: ["austenitic", "ferritic", "duplex", "stainless"],
  },
  "A312": {
    description: "Seamless, Welded, and Heavily Cold Worked Austenitic Stainless Steel Pipes",
    scope: ["Pipe", "Tubing"],
    families: ["austenitic", "stainless"],
  },
  "A182": {
    description: "Forged or Rolled Alloy and Stainless Steel Pipe Flanges, Forged Fittings, and Valves and Parts",
    scope: ["Valve body", "Pump casing", "Pipe"],
    families: ["stainless", "alloy", "duplex", "austenitic"],
  },
  "A790": {
    description: "Seamless and Welded Ferritic/Austenitic Stainless Steel Pipe",
    scope: ["Pipe", "Tubing"],
    families: ["duplex", "super-duplex"],
  },
  "A789": {
    description: "Seamless and Welded Ferritic/Austenitic Stainless Steel Tubing",
    scope: ["Tubing", "Heat exchanger"],
    families: ["duplex", "super-duplex"],
  },
  "B564": {
    description: "Nickel Alloy Forgings",
    scope: ["Valve body", "Pump casing", "Pressure vessel"],
    families: ["nickel"],
  },
  "B163": {
    description: "Seamless Nickel and Nickel Alloy Condenser and Heat-Exchanger Tubes",
    scope: ["Heat exchanger", "Tubing"],
    families: ["nickel"],
  },
  "B221": {
    description: "Aluminum and Aluminum-Alloy Extruded Bars, Rods, Wire, Profiles, and Tubes",
    scope: ["Structural", "Tubing", "Pipe"],
    families: ["aluminum"],
  },
  "A106": {
    description: "Seamless Carbon Steel Pipe for High-Temperature Service",
    scope: ["Pipe"],
    families: ["carbon"],
  },
  "A333": {
    description: "Seamless and Welded Steel Pipe for Low-Temperature Service",
    scope: ["Pipe"],
    families: ["carbon", "alloy", "nickel"],
  },
  "A537": {
    description: "Pressure Vessel Plates, Heat-Treated, Carbon-Manganese-Silicon Steel",
    scope: ["Pressure vessel"],
    families: ["carbon"],
  },
};

/** Parse the short code (e.g. "ASTM A240" → "A240"). */
function extractCode(astm: string): string | null {
  if (!astm) return null;
  const m = astm.toUpperCase().match(/A\d{2,4}|B\d{2,4}/);
  return m ? m[0] : null;
}

export function validateAstm(
  material: MaterialRecord,
  input: SetupInput
): AstmValidation {
  const code = extractCode(material.astm);

  if (!code) {
    return {
      materialId: material.id,
      standard: material.astm || "—",
      compliant: false,
      notes: "No recognizable ASTM designation.",
    };
  }

  const spec = ASTM_RULEBOOK[code];
  if (!spec) {
    // Unknown spec — not a red flag, but flag that we can't verify scope
    return {
      materialId: material.id,
      standard: `ASTM ${code}`,
      compliant: true,
      notes: "Standard recognized but scope not verified against rulebook.",
    };
  }

  const scopeOk = spec.scope.includes(input.componentType);
  const fam = (material.family || "").toLowerCase();
  const famOk =
    spec.families.length === 0 ||
    spec.families.some((f) => fam.includes(f.toLowerCase()));

  if (scopeOk && famOk) {
    return {
      materialId: material.id,
      standard: `ASTM ${code}`,
      compliant: true,
      notes: `${spec.description}. Covers ${input.componentType}.`,
    };
  }

  const issues: string[] = [];
  if (!scopeOk) issues.push(`${input.componentType} is outside typical scope of ASTM ${code}`);
  if (!famOk) issues.push(`${material.family ?? "material family"} not typical for ASTM ${code}`);

  return {
    materialId: material.id,
    standard: `ASTM ${code}`,
    compliant: false,
    notes: issues.join("; ") + ".",
  };
}
