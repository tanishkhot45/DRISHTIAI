/**
 * POST /api/extract-components
 * Body: { text: string }
 * Returns: { ok: true, data: { components: Array<{ name, quantity?, notes? }> } }
 */

import { NextResponse } from "next/server";
import { extractComponents } from "@/lib/ai/component-extractor";

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

    const components = await extractComponents(text);
    return NextResponse.json({ ok: true, data: { components } });
  } catch (err: any) {
    console.error("[api/extract-components]", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Extraction failed" },
      { status: 400 }
    );
  }
}
