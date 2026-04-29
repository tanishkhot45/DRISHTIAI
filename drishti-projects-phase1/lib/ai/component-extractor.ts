/**
 * LLM that reads a free-text description of an engineering system
 * and extracts a list of components with quantities and optional notes.
 *
 * Example input:
 *   "Offshore wellhead with 2 master valves, an annulus valve,
 *    10ft of flowline spool, 4 flanges to the manifold, and 8 studded connectors."
 *
 * Example output:
 *   [
 *     { name: "Master valve", quantity: 2 },
 *     { name: "Annulus valve", quantity: 1 },
 *     { name: "Flowline spool", quantity: 1, notes: "10 ft" },
 *     { name: "Flange", quantity: 4, notes: "to manifold" },
 *     { name: "Studded connector", quantity: 8 }
 *   ]
 */

import { openai, MODELS } from "@/lib/openai";

const EXTRACT_SCHEMA = {
  name: "extract_components",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      components: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            quantity: { type: ["integer", "null"] },
            notes: { type: ["string", "null"] },
          },
          required: ["name", "quantity", "notes"],
        },
      },
    },
    required: ["components"],
  },
} as const;

export type ExtractedComponent = {
  name: string;
  quantity?: number;
  notes?: string;
};

export async function extractComponents(text: string): Promise<ExtractedComponent[]> {
  const instructions = [
    "You are a materials engineer assistant. Read the engineer's description of a system and extract a clean list of physical components that need material selection.",
    "",
    "Rules:",
    "- Each component = one row. Group identical items with a quantity.",
    "- Use SINGULAR component names (e.g. 'Master valve', not 'Master valves').",
    "- Include only physical hardware that has a material spec — skip instruments, sensors, software, and services.",
    "- quantity: integer ≥ 1, or null if the engineer didn't specify.",
    "- notes: short phrase (≤60 chars) capturing ONE meaningful distinction (size, location, rating). null if nothing useful.",
    "- Do NOT invent components not mentioned in the text.",
    "- Do NOT infer conditions (temperature, pressure, etc.) — those are handled elsewhere.",
    "- Prefer industry-standard terminology (e.g. 'Flowline spool', 'Studded connector', 'Blind flange').",
  ].join("\n");

  const resp = await openai.chat.completions.create({
    model: MODELS.reasoning,
    temperature: 0,
    seed: 42,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: text.trim() },
    ],
    response_format: {
      type: "json_schema",
      json_schema: EXTRACT_SCHEMA,
    },
  });

  const raw = resp.choices[0]?.message?.content ?? '{"components":[]}';
  const parsed = JSON.parse(raw) as {
    components: Array<{
      name: string;
      quantity: number | null;
      notes: string | null;
    }>;
  };

  return (parsed.components || [])
    .filter((c) => c && c.name && c.name.trim())
    .map((c) => ({
      name: c.name.trim(),
      quantity: typeof c.quantity === "number" ? c.quantity : undefined,
      notes: c.notes?.trim() || undefined,
    }));
}
