import type { MaterialRecord } from "@/lib/types";
import materials from "@/data/materials_astm_master_860rows.json";

let cache: MaterialRecord[] | null = null;

/** Load the full materials dataset (cached in memory after first call). */
export function loadMaterials(): MaterialRecord[] {
  if (cache) return cache;
  cache = materials as unknown as MaterialRecord[];
  return cache;
}

/** Build a canonical text description for a material — used for embeddings + LLM context. */
export function describeMaterial(m: MaterialRecord): string {
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
}
