/**
 * STAGE 8 of Drishti flow — Final LLM explanation synthesis.
 */

import { openai, MODELS } from "@/lib/openai";
import type {
  AstmValidation,
  MaterialRow,
  RagEvidence,
  RejectedMaterial,
  ScoredCandidate,
  SelectionMatrix,
  SetupInput,
} from "@/lib/types";

const OUTPUT_SCHEMA = {
  name: "drishti_selection",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      recommendations: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            astm: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            score: { type: "number" },
            keyReasons: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
              maxItems: 6,
            },
            standout: { type: "string" },
          },
          required: [
            "id",
            "name",
            "astm",
            "tags",
            "score",
            "keyReasons",
            "standout",
          ],
        },
      },
      matrix: {
        type: "object",
        additionalProperties: false,
        properties: {
          criteria: { type: "array", items: { type: "string" } },
          rows: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                materialId: { type: "string" },
                materialName: { type: "string" },
                cells: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      key: { type: "string" },
                      value: { type: "string" },
                    },
                    required: ["key", "value"],
                  },
                },
              },
              required: ["materialId", "materialName", "cells"],
            },
          },
        },
        required: ["criteria", "rows"],
      },
      rejected: {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      reason: { type: "string" },
      detail: { type: "string" },
      category: {
        type: "string",
        enum: [
          "wrong_form",
          "insufficient_corrosion",
          "cost_overrun",
          "weldability",
          "temperature",
          "availability",
          "overkill",
          "code_scope",
          "other",
        ],
      },
    },
    required: ["name", "reason", "detail", "category"],
  },
},
      modelNotes: { type: "string" },
    },
    required: ["recommendations", "matrix", "rejected", "modelNotes"],
  },
} as const;

export type ExplainerOutput = {
  recommendations: MaterialRow[];
  matrix: SelectionMatrix;
  rejected: RejectedMaterial[];
  modelNotes: string;
};

export async function explainSelection(args: {
  input: SetupInput;
  shortlist: ScoredCandidate[];
  validations: AstmValidation[];
  evidence: RagEvidence[];
}): Promise<ExplainerOutput> {
  const { input, shortlist, validations, evidence } = args;

  const instructions = [
    "You are Drishti AI, an engineer-first material selection assistant.",
    "You will be given: (1) structured service conditions, (2) a pre-scored shortlist with deterministic reasons and penalties, (3) ASTM validation results, and (4) RAG evidence snippets from curated datasheets.",
    "",
    "Your job: produce the FINAL structured selection output.",
    "",
    "HARD RULES:",
    "- Return ONLY JSON matching the provided schema. No markdown.",
    "- Choose the BEST 5 materials from the shortlist. Do not invent materials not in the shortlist.",
    "- The `score` you return MUST be a refined blend of the pre-score and ASTM compliance. Clamp to 0..100.",
    "- For the matrix: include EVERY material you recommend, and for each criterion give a SHORT phrase (≤60 chars), e.g. 'OK −196..425°C', 'Risk: pitting @ high chlorides', 'Verify NACE MR0175'.",
    "- `rejected`: list 6–10 other materials from the shortlist (or well-known peers) and WHY they are NOT top picks. Short reasons only.",
    "- `modelNotes`: 1–2 sentences summarising assumptions the engineer should verify.",
    "- Reference ASTM standards ONLY where shown in the validations. Never invent standards.",
    "- If design pressure is unknown, state that assumption in modelNotes.",
    "- NEVER use the words 'unknown' or 'not specified' in keyReasons — if something wasn't provided, don't mention it at all.",
    "",
    "DIVERSITY REQUIREMENTS (critical):",
    "- Each of the 5 recommendations MUST be a genuinely different alloy. If two shortlist entries share the same base alloy name (e.g. 'Duplex 2205' in A182 and A276 forms), pick only ONE.",
    "- Prefer metallurgical diversity: if the top 3 shortlist entries are all duplex stainless, include at least one non-duplex option in the top 5 (e.g. nickel alloy, super-austenitic, or a suitable alternative family) — even at a slight score cost.",
    "",
    "KEYREASONS STYLE (critical):",
    "- keyReasons must read like a senior engineer wrote them — specific, confident, no filler phrases like 'suitable for' or 'compliant with standards'.",
    "- keyReasons MUST distinguish this material from the others in your list. Do NOT repeat the same phrase across cards (e.g. don't say 'excellent chloride resistance' on three different picks).",
    "- Structure keyReasons like: (1) the ONE thing that makes this pick unique vs the others, (2) a concrete service-condition fit, (3) a notable trade-off or caveat, (4) a strength the rank above it lacks.",
    "- Never start a keyReason with 'ASTM X covers/recognized' — that's filler. Lead with the material's ACTUAL strength.",
    "- Each keyReason is one clear sentence, specific, ideally mentioning a number (temperature, PREN, hardness, cost ratio, etc.) where useful.",
    "",
    "STANDOUT TAGLINE:",
    "- `standout` is a 3–8 word phrase that captures what makes THIS pick distinct. Examples: 'Best value for chloride duty', 'Highest margin on sour service', 'Lowest cost, weldable', 'Proven track record subsea'.",
    "- Each recommendation's `standout` must be UNIQUE across the 5. No duplicates.",
    "- Title-case, no trailing punctuation.",
    "",
"REJECTED STYLE (critical):",
"- Every rejected item must have a DIFFERENT, SPECIFIC reason. Do NOT repeat 'non-compliant with ASTM' across multiple entries — that's shallow.",
"- `reason` is a one-line headline (≤70 chars) — concrete, not generic. Bad: 'Non-compliant with ASTM'. Good: 'A182 forging, not pressure-containing form for valves'.",
"- `detail` is 2–3 sentences explaining the engineering trade-off: what makes it technically interesting, why it falls short for THIS case, and what would change that verdict. Write like a senior engineer explaining to a junior.",
"- `category` picks the primary reason for rejection from the enum. 'wrong_form' = right alloy, wrong product form. 'overkill' = valid but unnecessarily premium. 'cost_overrun' = too expensive for the sensitivity. 'code_scope' = ASTM spec doesn't cover this component.",
"- Group rejections by diversity: include materials spanning multiple categories so the engineer sees the full design space — not 8 variants of 'non-compliant'.",
  ].join("\n");

  const compactShortlist = shortlist.slice(0, 25).map((c) => ({
    id: c.material.id,
    name: c.material.name,
    astm: c.material.astm,
    family: c.material.family,
    temp: [c.material.temp_min_c, c.material.temp_max_c],
    service_fit: c.material.service_fit,
    tags: c.material.tags,
    cost: c.material.cost_band,
    weldability: c.material.weldability,
    preScore: Math.round(c.score),
    ruleReasons: c.reasons,
    rulePenalties: c.penalties,
  }));

  const compactValidations = validations.map((v) => ({
    id: v.materialId,
    standard: v.standard,
    compliant: v.compliant,
    notes: v.notes,
  }));

  const compactEvidence = evidence.map((e) => ({
    id: e.materialId,
    similarity: Number(e.similarity.toFixed(3)),
    snippet: e.snippet.slice(0, 500),
    source: e.source,
  }));

  // Strip "Unknown" / empty fields so the LLM doesn't write them into prose
  const cleanConditions: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "Unknown" || v === null || v === undefined || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    cleanConditions[k] = v;
  }

  const userPayload = {
    conditions: cleanConditions,
    shortlist: compactShortlist,
    astmValidations: compactValidations,
    ragEvidence: compactEvidence,
  };
  const response = await openai.chat.completions.create({
    model: MODELS.reasoning,
    temperature: 0,
    seed: 42,
    messages: [
      { role: "system", content: instructions },
      {
        role: "user",
        content:
          "Produce the final selection JSON for this case:\n\n" +
          JSON.stringify(userPayload, null, 2),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: OUTPUT_SCHEMA,
    },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);

  // Attach ASTM compliance + evidence to recommendations
  const validationById = new Map(validations.map((v) => [v.materialId, v]));
  const evidenceById = new Map<string, RagEvidence[]>();
  for (const e of evidence) {
    const arr = evidenceById.get(e.materialId) || [];
    arr.push(e);
    evidenceById.set(e.materialId, arr);
  }

  const recommendations: MaterialRow[] = (parsed.recommendations || []).map(
    (r: any) => {
      const v = validationById.get(r.id);
      const ev = evidenceById.get(r.id) || [];
      return {
        ...r,
        astmCompliant: v?.compliant,
        astmNotes: v?.notes,
        evidence: ev.map((e) => ({ text: e.snippet, source: e.source })),
      };
    }
  );

  return {
    recommendations,
    matrix: parsed.matrix,
    rejected: parsed.rejected || [],
    modelNotes: parsed.modelNotes || "",
  };
}