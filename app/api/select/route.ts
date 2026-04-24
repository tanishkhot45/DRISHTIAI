/**
 * POST /api/select — Drishti selection pipeline.
 */

import { NextResponse } from "next/server";
import { SetupSchema } from "@/lib/schema";
import { loadMaterials } from "@/lib/data/loader";
import { runRuleEngine } from "@/lib/ai/rule-engine";
import { validateAstm } from "@/lib/ai/astm-validator";
import { retrieveEvidence } from "@/lib/ai/rag";
import { explainSelection } from "@/lib/ai/explainer";
import { generateReasoning } from "@/lib/ai/reasoner";
import { CONFIG } from "@/lib/openai";
import type { MaterialRow, SelectionResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = SetupSchema.parse(body);

    const dataset = loadMaterials();
    const scored = runRuleEngine(input, dataset);
    const shortlist = scored.slice(0, CONFIG.shortlistSize);
    const validations = shortlist.map((c) => validateAstm(c.material, input));
    const evidence = await retrieveEvidence(
      input,
      shortlist.map((c) => c.material)
    );

    const { recommendations, matrix, rejected, modelNotes } =
      await explainSelection({ input, shortlist, validations, evidence });

    const seenIds = new Set<string>();

    const remappedRecommendations = recommendations.map((r, idx) => {
      const originalId = r.id;
      let id = originalId;

      if (!id || seenIds.has(id)) {
        id = `${originalId || "rec"}__${r.astm?.replace(/\s+/g, "_") || idx}__${idx}`;
      }

      seenIds.add(id);

      return {
        originalId,
        recommendation: {
          ...r,
          id,
        },
      };
    });

    const materialsMap = new Map(dataset.map((m) => [m.id, m]));

    const enrichedRecommendations: MaterialRow[] = await Promise.all(
      remappedRecommendations.map(async ({ originalId, recommendation }) => {
        const mat =
          (originalId ? materialsMap.get(originalId) : undefined) ||
          materialsMap.get(recommendation.id);

        if (!mat) return recommendation;

        try {
          const reasoning = await generateReasoning(input, mat);
          return { ...recommendation, reasoning };
        } catch (err) {
          console.error("[reasoner]", err);
          return recommendation;
        }
      })
    );

    const idByOriginalId = new Map<string, string>();
    const idByName = new Map<string, string>();

    remappedRecommendations.forEach(({ originalId, recommendation }) => {
      if (originalId && !idByOriginalId.has(originalId)) {
        idByOriginalId.set(originalId, recommendation.id);
      }

      if (!idByName.has(recommendation.name)) {
        idByName.set(recommendation.name, recommendation.id);
      }
    });

    const fixedMatrix = {
      ...matrix,
      rows: (matrix.rows || []).map((row, idx) => ({
        ...row,
        materialId:
          idByOriginalId.get(row.materialId) ||
          idByName.get(row.materialName) ||
          enrichedRecommendations[idx]?.id ||
          row.materialId,
      })),
    };

    const result: SelectionResult = {
      query: input,
      recommendations: enrichedRecommendations,
      matrix: fixedMatrix,
      rejected,
      modelNotes,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    console.error("[api/select]", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Selection failed" },
      { status: 400 }
    );
  }
}