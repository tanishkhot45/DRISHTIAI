/**
 * One-time script: generates embeddings for every material in the dataset
 * and writes them to `data/embeddings.json`.
 *
 * Run with:   npm run embed
 *
 * Uses `text-embedding-3-small` by default (1536 dims, cheap).
 * ~860 rows × ~$0.00002/1K tokens ≈ a few cents per full rebuild.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import type { MaterialRecord } from "../lib/types";

const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";
const BATCH_SIZE = 64;

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY missing. Set it in .env.local");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  const datasetPath = path.join(process.cwd(), "data", "materials_astm_master_860rows.json");
  if (!fs.existsSync(datasetPath)) {
    console.error(`❌ Dataset not found at ${datasetPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(datasetPath, "utf-8");
  const materials = JSON.parse(raw) as MaterialRecord[];
  console.log(`📦 Loaded ${materials.length} materials.`);

  const describe = (m: MaterialRecord) => {
    const parts: string[] = [];
    parts.push(`${m.name} (${m.astm})`);
    if (m.family) parts.push(`Family: ${m.family}.`);
    if (m.temp_min_c !== undefined && m.temp_max_c !== undefined) {
      parts.push(`Temperature window: ${m.temp_min_c}°C to ${m.temp_max_c}°C.`);
    }
    if (m.pressure_class) parts.push(`Pressure class: ${m.pressure_class}.`);
    if (m.weldability) parts.push(`Weldability: ${m.weldability}.`);
    if (m.cost_band) parts.push(`Cost: ${m.cost_band}.`);
    if (m.sustainability) parts.push(`Sustainability: ${m.sustainability}.`);
    if (m.service_fit?.length) parts.push(`Fit for: ${m.service_fit.join(", ")}.`);
    if (m.tags?.length) parts.push(`Tags: ${m.tags.join(", ")}.`);
    if (m.limits?.length) parts.push(`Limits: ${m.limits.join("; ")}.`);
    if (m.description) parts.push(m.description);
    return parts.join(" ");
  };

  const texts = materials.map(describe);
  const ids = materials.map((m) => m.id);

  const allVectors: { id: string; vector: number[] }[] = [];
  const total = Math.ceil(texts.length / BATCH_SIZE);

  for (let b = 0; b < total; b++) {
    const start = b * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, texts.length);
    const batch = texts.slice(start, end);

    process.stdout.write(`  → batch ${b + 1}/${total} (${batch.length} items)... `);
    const resp = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: batch,
    });
    for (let i = 0; i < resp.data.length; i++) {
      allVectors.push({ id: ids[start + i], vector: resp.data[i].embedding });
    }
    console.log("✓");
  }

  const outPath = path.join(process.cwd(), "data", "embeddings.json");
  fs.writeFileSync(outPath, JSON.stringify(allVectors));
  const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ Wrote ${allVectors.length} vectors to ${outPath} (${sizeMb} MB)`);
  console.log(`   Model: ${EMBED_MODEL}, dims: ${allVectors[0]?.vector.length ?? "?"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
