/**
 * POST /api/chat
 *
 * Floating chatbot endpoint. Features:
 *   - Retrieves relevant materials via RAG (cosine similarity on pre-embedded dataset)
 *   - Answers grounded in retrieved datasheets
 *   - Aware of the current setup / recommendations (if user is on results page)
 *
 * Body: { message: string, context?: { query?: SetupInput, recommendations?: MaterialRow[] } }
 * Returns: { ok: true, data: { answer: string, sources: Array<{ id, name, astm }> } }
 */

import { NextResponse } from "next/server";
import { openai, MODELS } from "@/lib/openai";
import { loadMaterials } from "@/lib/data/loader";
import { retrieveForQuery } from "@/lib/ai/rag";

export const runtime = "nodejs";
export const maxDuration = 30;

function fmt(v: any) {
  if (v === null || v === undefined || v === "") return "Unknown";
  return String(v);
}

function buildContextText(context: any): string {
  if (!context) return "No prior setup.";
  const q = context?.query ?? {};
  const recs = Array.isArray(context?.recommendations) ? context.recommendations : [];
  const drivers = Array.isArray(q?.exposureDrivers) ? q.exposureDrivers : [];

  const top = recs.slice(0, 5).map((m: any, i: number) => {
    const name = fmt(m?.name);
    const astm = fmt(m?.astm);
    const score = typeof m?.score === "number" ? Math.round(m.score) : fmt(m?.score);
    return `${i + 1}. ${name} — ${astm} — score ${score}`;
  });

  return [
    `Current setup:`,
    `Domain: ${fmt(q.domain)} | Environment: ${fmt(q.environment)} | Component: ${fmt(q.componentType)}`,
    `Temp: ${fmt(q.minTempC)}°C to ${fmt(q.maxTempC)}°C | Service: ${fmt(q.serviceMedium)}`,
    drivers.length ? `Drivers: ${drivers.slice(0, 8).join(", ")}` : "",
    "",
    top.length ? `Current shortlist:\n${top.join("\n")}` : "No current shortlist.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing `message`" },
        { status: 400 }
      );
    }

    // RAG retrieval from dataset
    const materials = loadMaterials();
    const evidence = await retrieveForQuery(message, materials, 5);

    const evidenceText = evidence
      .map(
        (e, i) =>
          `[${i + 1}] (sim=${e.similarity.toFixed(2)}) ${e.snippet}\n    — ${e.source}`
      )
      .join("\n\n");

    const contextText = buildContextText(context);

    const instructions = [
      "You are Drishti AI, a floating assistant for design engineers doing material selection.",
      "",
      "Style:",
      "- Plain prose. No markdown bullets or headers.",
      "- 2 to 5 short sentences only.",
      "- When suggesting a material, write inline: 'SS316L (ASTM A240)'.",
      "- Recommend at most 2 materials.",
      "- If the engineer's question is missing key info (temp, medium, chlorides), ask at most 2 concise follow-up questions.",
      "- Base answers on the provided evidence snippets; never invent ASTM specs.",
      "- If the evidence doesn't cover the question, say so briefly and suggest running a full selection.",
    ].join("\n");

    const userContent = [
      "Engineer's question:",
      message,
      "",
      "=== Retrieved evidence from dataset ===",
      evidenceText || "(no close matches)",
      "",
      "=== Session context ===",
      contextText,
      "",
      "Answer now following the style rules.",
    ].join("\n");

    const resp = await openai.chat.completions.create({
      model: MODELS.chat,
temperature: 0.3,
seed: 42,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: userContent },
      ],
    });

    const answer = resp.choices[0]?.message?.content?.trim() ?? "";

    // Expose the top 3 sources so the UI can show citations
    const sources = evidence.slice(0, 3).map((e) => {
      const m = materials.find((x) => x.id === e.materialId);
      return {
        id: e.materialId,
        name: m?.name ?? e.materialId,
        astm: m?.astm ?? "—",
      };
    });

    return NextResponse.json({
      ok: true,
      data: { answer, sources },
    });
  } catch (err: any) {
    console.error("[api/chat]", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Chat failed" },
      { status: 400 }
    );
  }
}
