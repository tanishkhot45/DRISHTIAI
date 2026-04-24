/**
 * STAGE 7 of Drishti flow — RAG (Retrieval-Augmented Generation).
 *
 * We do NOT use an external vector DB. Embeddings for every material
 * description are pre-computed once via `npm run embed` and stored in
 * `data/embeddings.json`. At request time:
 *
 *   1. Embed the user's query with the SAME model.
 *   2. Compute cosine similarity against the stored vectors.
 *   3. Return the top-K most relevant material descriptions as EVIDENCE
 *      for the final LLM explainer to cite.
 *
 * If `data/embeddings.json` is missing, we fall back to returning the
 * shortlist descriptions directly (still useful, just no semantic rerank).
 */

import { openai, MODELS, CONFIG } from "@/lib/openai";
import { cosineSim } from "@/lib/utils";
import { describeMaterial } from "@/lib/data/loader";
import type { MaterialRecord, RagEvidence, SetupInput } from "@/lib/types";

type EmbeddingEntry = { id: string; vector: number[] };

let embedCache: Map<string, number[]> | null = null;

async function loadEmbeddings(): Promise<Map<string, number[]> | null> {
  if (embedCache) return embedCache;
  try {
    const mod = await import("@/data/embeddings.json");
    const arr: EmbeddingEntry[] = (mod.default || mod) as any;
    const map = new Map<string, number[]>();
    for (const e of arr) map.set(e.id, e.vector);
    embedCache = map;
    return map;
  } catch {
    console.warn(
      "[drishti/rag] data/embeddings.json not found. Run `npm run embed` to enable semantic retrieval."
    );
    return null;
  }
}

function buildQueryText(input: SetupInput): string {
  const drivers = (input.exposureDrivers || []).join(", ") || "none";
  return [
    `Material selection for ${input.componentType} in ${input.domain} domain.`,
    `Environment: ${input.environment}.`,
    `Service medium: ${input.serviceMedium}.`,
    `Temperature range: ${input.minTempC}°C to ${input.maxTempC}°C.`,
    input.designPressureBar
      ? `Design pressure: ${input.designPressureBar} bar.`
      : `Design pressure: unknown.`,
    `Criticality: ${input.criticality}. Operating mode: ${input.operatingMode}. Life: ${input.designLife}.`,
    `Exposure drivers: ${drivers}.`,
    input.constraints ? `Constraints: ${input.constraints}.` : "",
    input.notes ? `Notes: ${input.notes}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: MODELS.embed,
    input: text,
  });
  return res.data[0].embedding;
}

/**
 * Retrieve the top-K most semantically relevant materials from the shortlist.
 * Returns evidence snippets the LLM can cite in its explanation.
 */
export async function retrieveEvidence(
  input: SetupInput,
  shortlist: MaterialRecord[],
  topK = CONFIG.ragTopK
): Promise<RagEvidence[]> {
  const embeddings = await loadEmbeddings();

  // Fallback: no embeddings file → return each material's own description
  if (!embeddings) {
    return shortlist.map((m) => ({
      materialId: m.id,
      snippet: describeMaterial(m),
      source: `Datasheet ${m.id} — ${m.astm}`,
      similarity: 0,
    }));
  }

  // Embed the query once
  const queryText = buildQueryText(input);
  const queryVec = await embedText(queryText);

  // Score EVERY shortlisted material so every recommendation has evidence
  const ranked = shortlist
    .map((m) => {
      const vec = embeddings.get(m.id);
      if (!vec) {
        // Material has no embedding — still include its description
        return {
          material: m,
          similarity: 0,
        };
      }
      return { material: m, similarity: cosineSim(queryVec, vec) };
    })
    .sort((a, b) => b.similarity - a.similarity);

  return ranked.map(({ material, similarity }) => ({
    materialId: material.id,
    snippet: describeMaterial(material),
    source: `Datasheet ${material.id} — ${material.astm}`,
    similarity,
  }));
}

/** Used by the chatbot: retrieve evidence directly from a free-text query. */
export async function retrieveForQuery(
  query: string,
  allMaterials: MaterialRecord[],
  topK = CONFIG.ragTopK
): Promise<RagEvidence[]> {
  const embeddings = await loadEmbeddings();
  if (!embeddings) {
    // No semantic retrieval — return first K by simple keyword match
    const q = query.toLowerCase();
    const matches = allMaterials.filter((m) => {
      const hay = `${m.name} ${m.astm} ${(m.tags || []).join(" ")} ${(m.service_fit || []).join(" ")}`.toLowerCase();
      return hay.includes(q.split(" ")[0] || "");
    });
    return matches.slice(0, topK).map((m) => ({
      materialId: m.id,
      snippet: describeMaterial(m),
      source: `Datasheet ${m.id}`,
      similarity: 0,
    }));
  }

  const queryVec = await embedText(query);

  const scored = allMaterials
    .map((m) => {
      const vec = embeddings.get(m.id);
      if (!vec) return null;
      return { material: m, similarity: cosineSim(queryVec, vec) };
    })
    .filter((x): x is { material: MaterialRecord; similarity: number } => x !== null)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored.map(({ material, similarity }) => ({
    materialId: material.id,
    snippet: describeMaterial(material),
    source: `Datasheet ${material.id} — ASTM ${material.astm}`,
    similarity,
  }));
}
