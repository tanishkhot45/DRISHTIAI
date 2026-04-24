/**
 * Generates in-depth prose reasoning for each recommended material.
 * One focused LLM call per recommendation — produces 2-3 tight paragraphs
 * covering: why it fits, key trade-offs, things to verify.
 */

import { openai, MODELS } from "@/lib/openai";
import type { MaterialRecord, SetupInput } from "@/lib/types";

export async function generateReasoning(
  input: SetupInput,
  material: MaterialRecord
): Promise<string> {
  const instructions = [
    "You are a senior materials engineer explaining a selection to a design engineer.",
    "Write 2-3 short paragraphs (total ~120-180 words) of clean, confident prose.",
    "Cover, in order:",
    "  1. Why this material is a strong fit for the specific service conditions.",
    "  2. The key trade-offs or watch-outs the engineer should know about.",
    "  3. One concrete design/spec suggestion to get the most out of it.",
    "Rules:",
    "- Confident, assertive voice. No hedging phrases like 'it seems' or 'generally'.",
    "- No bullet points. No headers. No markdown. Pure prose paragraphs.",
    "- Reference the actual inputs (temp, medium, exposure drivers) where relevant.",
    "- Never mention 'the dataset', 'retrieval', 'RAG', 'embeddings', 'scoring', or any internal mechanics.",
    "- Never say 'according to the data' or similar. Write as if you already know it.",
    "- Don't invent ASTM specs or numeric property values not shown.",
    "- NEVER mention 'unknown', 'not specified', or any field that wasn't explicitly provided.",
  ].join("\n");

const rawConditions = {
  domain: input.domain,
  environment: input.environment,
  component: input.componentType,
  temperature: `${input.minTempC}°C to ${input.maxTempC}°C`,
  service: input.serviceMedium,
  exposure: input.exposureDrivers,
  criticality: input.criticality,
};

// Drop any "Unknown" / empty values before sending to the LLM
const conditions: Record<string, any> = {};
for (const [k, v] of Object.entries(rawConditions)) {
  if (v === "Unknown" || v === null || v === undefined || v === "") continue;
  if (Array.isArray(v) && v.length === 0) continue;
  conditions[k] = v;
}

const context = {
  conditions,
  material: {
    name: material.name,
    standard: material.astm,
    family: material.family,
    temperatureRange: [material.temp_min_c, material.temp_max_c],
    serviceFit: material.service_fit,
    tags: material.tags,
    weldability: material.weldability,
    costBand: material.cost_band,
    limits: material.limits,
  },
};

const resp = await openai.chat.completions.create({
  model: MODELS.reasoning,
  temperature: 0.2,
  seed: 42,
  messages: [
      { role: "system", content: instructions },
      {
        role: "user",
        content:
          `Explain why ${material.name} (${material.astm}) is a strong choice here. Context:\n\n` +
          JSON.stringify(context, null, 2),
      },
    ],
  });

  return resp.choices[0]?.message?.content?.trim() ?? "";
}