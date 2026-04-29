import type { ComponentPair, ProjectComponent } from "@/lib/projects-types";

/** Compact random ID, URL-safe. */
export function uid(prefix = "") {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return prefix ? `${prefix}_${ts}${rand}` : `${ts}${rand}`;
}

/** Human-friendly timestamp for filenames. */
export function fileTimestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(
    d.getDate()
  )}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/**
 * Parse a pasted blob of text (CSV or newline-separated) into component rows.
 * Each non-empty line becomes a component.
 *  - If the line has commas, first field = name, second field = quantity, third = notes.
 *  - Otherwise the whole line is the name.
 */
export function parseComponentPaste(raw: string): Array<{
  name: string;
  quantity?: number;
  notes?: string;
}> {
  if (!raw?.trim()) return [];

  const rows = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith("#"));

  return rows.flatMap((line) => {
    // Split on commas but not inside quotes
    const cells =
      line.match(/("([^"]*)"|[^,]+)/g)?.map((c) =>
        c.replace(/^"|"$/g, "").trim()
      ) ?? [line];

    const [nameRaw, qtyRaw, ...rest] = cells;
    const name = nameRaw?.trim();

    if (!name) return [];

    const quantityFromRaw = qtyRaw ? parseInt(qtyRaw, 10) : NaN;
    const quantity =
      Number.isFinite(quantityFromRaw) && quantityFromRaw > 0
        ? quantityFromRaw
        : undefined;

    const notes = rest.length ? rest.join(", ").trim() : undefined;

    return [
      {
        name,
        ...(quantity !== undefined ? { quantity } : {}),
        ...(notes ? { notes } : {}),
      },
    ];
  });
}

/**
 * Simple keyword-based auto-detection of likely pairs.
 * Engineers often name components in predictable patterns — e.g. "Valve body"
 * paired with "Valve bolts" or "Valve flange". We detect overlap + kind keywords.
 */
export function detectPairs(components: ProjectComponent[]): ComponentPair[] {
  const pairs: ComponentPair[] = [];
  const seen = new Set<string>();

  const normalized = components.map((c) => ({
    ...c,
    lower: c.name.toLowerCase(),
    tokens: tokenize(c.name),
  }));

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const a = normalized[i];
      const b = normalized[j];

      // Keyword heuristics
      const aIsFastener = isFastenerLike(a.lower);
      const bIsFastener = isFastenerLike(b.lower);
      const aIsBody = isBodyLike(a.lower);
      const bIsBody = isBodyLike(b.lower);
      const aIsFlange = /flange/.test(a.lower);
      const bIsFlange = /flange/.test(b.lower);
      const aIsPipe = /(pipe|tubing|spool|line)/.test(a.lower);
      const bIsPipe = /(pipe|tubing|spool|line)/.test(b.lower);

      const shared = sharedTokens(a.tokens, b.tokens);

      let kind: ComponentPair["kind"] | null = null;
      let confidence = 0;

      // Valve body + valve bolts → bolted
      if ((aIsBody && bIsFastener) || (bIsBody && aIsFastener)) {
        if (shared.size > 0) {
          kind = "bolted";
          confidence = 0.85;
        }
      }
      // Pipe + flange → flanged
      else if ((aIsPipe && bIsFlange) || (bIsPipe && aIsFlange)) {
        if (shared.size > 0) {
          kind = "flanged";
          confidence = 0.75;
        }
      }
      // Pipe + pipe sharing a noun (spool/line/system) → welded
      else if (aIsPipe && bIsPipe && shared.size > 0) {
        kind = "welded";
        confidence = 0.6;
      }
      // Flange + flange sharing a noun → bolted
      else if (aIsFlange && bIsFlange && shared.size > 0) {
        kind = "bolted";
        confidence = 0.65;
      }
      // Strong name overlap (>=2 shared tokens excluding stop words) → inferred
      else if (shared.size >= 2) {
        kind = "inferred";
        confidence = 0.5;
      }

      if (kind) {
        const key = `${a.id}::${b.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({ aId: a.id, bId: b.id, kind, confidence });
        }
      }
    }
  }

  return pairs;
}

// ---------------- helpers ----------------

const STOP_TOKENS = new Set([
  "the",
  "a",
  "an",
  "of",
  "for",
  "and",
  "or",
  "to",
  "with",
  "in",
  "on",
  "at",
  "by",
  "from",
  "as",
]);

function tokenize(s: string): Set<string> {
  const tokens = s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_TOKENS.has(t));
  return new Set(tokens);
}

function sharedTokens(a: Set<string>, b: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const t of a) if (b.has(t)) out.add(t);
  return out;
}

function isFastenerLike(s: string): boolean {
  return /(bolt|stud|nut|screw|fastener|washer)/.test(s);
}

function isBodyLike(s: string): boolean {
  return /(body|casing|housing|shell|bonnet)/.test(s);
}

/**
 * Download a JSON blob as a file.
 */
export function downloadJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Pick a project file from disk and return its parsed JSON.
 * Uses a hidden <input type="file"> — no UI plumbing required.
 */
export function pickProjectFile(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error("No file"));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result)));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };
    input.click();
  });
}