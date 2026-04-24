/**
 * STAGE 2 of Drishti flow — Input interpretation.
 *
 * Takes a free-form engineer sentence like
 *   "Hygienic pipeline, 120°C, high corrosion"
 * and asks the LLM to convert it into a structured SetupInput partial.
 *
 * Used by:
 *   - /api/interpret (landing-page natural-language entry)
 *   - /api/chat     (chatbot can create a full selection from an NL message)
 */

import { openai, MODELS } from "@/lib/openai";
import type { SetupInput } from "@/lib/types";

const INTERPRET_SCHEMA = {
  name: "interpret_setup",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      domain: {
        type: ["string", "null"],
        enum: [
          "Cryogenics",
          "Mining",
          "Oil & Gas",
          "Subsea",
          "Hygienic",
          "Power Systems",
          null,
        ],
      },
      environment: {
        type: ["string", "null"],
        enum: [
          "Indoor",
          "Outdoor",
          "Marine splash",
          "Marine subsea",
          "Industrial plant",
          "Clean/hygienic",
          "Unknown",
          null,
        ],
      },
      componentType: {
        type: ["string", "null"],
        enum: [
          "Pipe",
          "Tubing",
          "Pressure vessel",
          "Valve body",
          "Pump casing",
          "Heat exchanger",
          "Tank",
          "Structural",
          "Fastener",
          "Shaft",
          "Liner",
          "Seal",
          "Bushing",
          "Other",
          null,
        ],
      },
      criticality: {
        type: ["string", "null"],
        enum: ["Low", "Medium", "High", "Safety critical", null],
      },
      minTempC: { type: ["number", "null"] },
      maxTempC: { type: ["number", "null"] },
      designPressureBar: { type: ["number", "null"] },
      serviceMedium: {
        type: ["string", "null"],
        enum: [
          "Seawater",
          "Freshwater",
          "Hydrocarbons",
          "Sour gas (H2S)",
          "Sweet gas (CO2)",
          "Steam",
          "Hot water",
          "Slurry",
          "Acids",
          "Alkalis",
          "Solvents",
          "Food product",
          "Disinfectants",
          "Unknown",
          null,
        ],
      },
      exposureDrivers: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "chlorides_low",
            "chlorides_mod",
            "chlorides_high",
            "H2S_possible",
            "H2S_yes",
            "CO2_yes",
            "abrasives_low",
            "abrasives_med",
            "abrasives_high",
            "erosion_high_velocity",
            "CIP",
            "SIP",
            "UV_outdoor",
            "crevice",
            "biofouling",
            "cathodic_protection",
            "unknown",
          ],
        },
      },
      notes: { type: "string" },
    },
    required: [
      "domain",
      "environment",
      "componentType",
      "criticality",
      "minTempC",
      "maxTempC",
      "designPressureBar",
      "serviceMedium",
      "exposureDrivers",
      "notes",
    ],
  },
} as const;

/**
 * Interpret a natural-language engineering request into a structured partial input.
 * Returns `null` for fields the text didn't specify — the caller should fill with defaults.
 */
export async function interpretQuery(text: string): Promise<Partial<SetupInput>> {
  const instructions = [
    "You are Drishti AI, a material selection assistant.",
    "Convert the engineer's free-text request into structured JSON.",
    "Rules:",
    "- Only extract what the text actually states or strongly implies.",
    "- For fields not mentioned, return null (or empty array for exposureDrivers).",
    "- Map words like 'seawater', 'saltwater', 'offshore' to serviceMedium='Seawater' + chlorides_high driver.",
    "- 'sour service', 'H2S' -> serviceMedium='Sour gas (H2S)' + H2S_yes driver.",
    "- 'high corrosion' in a marine context -> chlorides_high; in an acid context -> keep as a note.",
    "- 'cryogenic' / 'LNG' / '-196' -> domain=Cryogenics, minTempC≈-196 if LNG.",
    "- 'hygienic', 'food', 'dairy' -> domain=Hygienic, environment='Clean/hygienic', CIP driver.",
    "- 'CIP' -> add CIP; 'SIP' -> add SIP.",
    "- Temperatures: pick sensible min/max if only one number is given (±20°C window).",
    "- Put anything you can't structure into notes.",
  ].join("\n");

  const response = await openai.chat.completions.create({
    model: MODELS.reasoning,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: text.trim() },
    ],
    response_format: {
      type: "json_schema",
      json_schema: INTERPRET_SCHEMA,
    },
temperature: 0,
seed: 42,  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);

  // Strip nulls so the caller can merge with defaults
  const cleaned: Partial<SetupInput> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    (cleaned as any)[k] = v;
  }
  return cleaned;
}
