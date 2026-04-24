/**
 * POST /api/interpret
 *
 * Takes a free-form engineering request and returns a structured
 * partial SetupInput that can be merged with form defaults.
 *
 * Body: { text: string }
 * Returns: { ok: true, data: Partial<SetupInput> }
 */

import { NextResponse } from "next/server";
import { interpretQuery } from "@/lib/ai/interpreter";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { ok: false, error: "Provide a non-empty `text` field." },
        { status: 400 }
      );
    }

    const parsed = await interpretQuery(text);
    return NextResponse.json({ ok: true, data: parsed });
  } catch (err: any) {
    console.error("[api/interpret]", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Interpretation failed" },
      { status: 400 }
    );
  }
}
