# Drishti AI

> Explainable, standards-aware material selection for design engineers.

Drishti AI takes a service-condition spec (domain, component, temperature, medium, exposure drivers, etc.) and returns the best-fit materials from an 860-row ASTM-indexed dataset — with every recommendation traceable to a rule, an ASTM spec, and a retrieved datasheet snippet.

It implements the full 10-stage pipeline described in `Drishti_AI_Full_Flow.pdf`:

```
User input
  → LLM interpretation        (stage 2)
  → Dataset lookup             (stage 3)
  → Rule engine                (stage 4 — deterministic)
  → Shortlist                  (stage 5)
  → ASTM validation            (stage 6 — rulebook)
  → RAG retrieval              (stage 7 — embeddings + cosine)
  → LLM explanation            (stage 8)
  → Final structured output    (stage 9)
```

---

## ✨ Features

- **Dual entry:** structured form OR free-text ("Subsea valve, high chlorides, H₂S possible")
- **Grounded reasoning:** no invented ASTM specs — every citation comes from a rulebook or RAG hit
- **Local RAG:** embeddings pre-computed with `text-embedding-3-small` and stored as JSON. No external vector DB.
- **ASTM compliance badge** on every recommendation
- **Selection matrix** comparing picks across criteria
- **Floating assistant** on every page — plain-English Q&A over the dataset
- **Dark & light mode** with smooth transitions
- **Fully responsive** — mobile sheet / desktop panel for chat, adaptive form layout
- **Export JSON** of any selection

---

## 🚀 Quick start

### 1. Prerequisites
- **Node.js 18.17+** (20+ recommended)
- An **OpenAI API key** — get one at https://platform.openai.com/api-keys

### 2. Install
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env.local
# then edit .env.local and paste your OPENAI_API_KEY
```

Minimum required:
```
OPENAI_API_KEY=sk-proj-...
```

Optional overrides (all have defaults):
```
OPENAI_MODEL=gpt-4o              # reasoning + final explanation
OPENAI_CHAT_MODEL=gpt-4o-mini    # floating chatbot
OPENAI_EMBED_MODEL=text-embedding-3-small
SHORTLIST_SIZE=15
RAG_TOP_K=6
```

### 4. Generate embeddings (one-time)
This computes a vector for every material and writes `data/embeddings.json`. Runs in a couple of minutes and costs a few cents.

```bash
npm run embed
```

> **You can skip this step.** Drishti falls back to keyword search if `embeddings.json` isn't present — you'll just get less precise RAG retrieval.

### 5. Run in dev
```bash
npm run dev
# → http://localhost:3000
```

### 6. Production build
```bash
npm run build
npm run start
```

---

## 🗂 Project structure

```
drishti-ai/
├── app/
│   ├── api/
│   │   ├── select/route.ts       ← Main pipeline orchestrator
│   │   ├── interpret/route.ts    ← NL → structured input
│   │   └── chat/route.ts         ← Floating chatbot (RAG)
│   ├── setup/page.tsx            ← Structured form page
│   ├── results/page.tsx          ← Results + matrix + evidence
│   ├── layout.tsx                ← Root shell (theme, nav, chatbot)
│   ├── page.tsx                  ← Landing + NL hero
│   └── globals.css               ← Theme tokens (dark & light)
│
├── components/
│   ├── layout/
│   │   ├── navbar.tsx            ← Theme toggle lives here
│   │   ├── theme-provider.tsx    ← next-themes wrapper
│   │   └── aurora-bg.tsx         ← Animated backdrop
│   ├── setup/
│   │   ├── setup-form.tsx
│   │   ├── chips-input.tsx
│   │   └── options.ts
│   ├── results/
│   │   ├── results-view.tsx
│   │   ├── material-card.tsx     ← Score ring + ASTM badge
│   │   ├── matrix-table.tsx
│   │   └── rejected-list.tsx
│   ├── chat/
│   │   ├── floating-chatbot.tsx  ← The corner assistant
│   │   └── loading-overlay.tsx
│   └── ui.tsx                    ← Consolidated primitives (Card, Input, Button, Pill, Stat)
│
├── lib/
│   ├── ai/
│   │   ├── interpreter.ts        ← Stage 2: LLM NL → struct
│   │   ├── rule-engine.ts        ← Stage 4: deterministic scoring
│   │   ├── astm-validator.ts     ← Stage 6: rulebook check
│   │   ├── rag.ts                ← Stage 7: embeddings + cosine
│   │   └── explainer.ts          ← Stage 8: final LLM synthesis
│   ├── data/loader.ts            ← Stage 3: cached dataset loader
│   ├── types.ts                  ← Domain model
│   ├── schema.ts                 ← Zod validation
│   ├── openai.ts                 ← Client + env config
│   ├── store.ts                  ← Zustand result cache
│   └── utils.ts                  ← cn, clamp, cosineSim, prettyLabel
│
├── data/
│   ├── materials_astm_master_860rows.json  ← Source of truth
│   └── embeddings.json                     ← Generated via npm run embed
│
└── scripts/
    └── generate-embeddings.ts    ← One-time embedding builder
```

---

## 🧠 How the pipeline works

### Stage 2 — LLM interpretation (`lib/ai/interpreter.ts`)
Free-form input like *"Hygienic pipeline, 120°C, high corrosion"* is converted to a structured `Partial<SetupInput>` using `gpt-4o` with a strict JSON schema. Only explicitly-stated fields come through; the rest are filled by form defaults.

### Stage 4 — Rule engine (`lib/ai/rule-engine.ts`)
Fully deterministic. For every one of the 860 materials, we score 0–100 based on:
- Temperature window fit (hard penalty if outside)
- Service medium match (`service_fit` tags)
- Exposure drivers (chlorides, H₂S, CO₂, abrasives, CIP/SIP, crevice, UV…)
- Domain family hints (e.g. Subsea ⇒ prefer super-duplex / nickel)
- Weldability, cost sensitivity, sustainability preferences
- Criticality bonus for ASME-code-pedigreed tags

Output: sorted list with per-material `reasons[]` and `penalties[]`.

### Stage 6 — ASTM validation (`lib/ai/astm-validator.ts`)
A small static rulebook knows, for each common ASTM code (A240, A312, A182, A790, B564, A106, A333…), which component types it covers and which families it applies to. For each shortlisted material we verify:
1. Code is recognizable
2. Component type is within scope
3. Family matches the spec's intent

The LLM **never** decides ASTM compliance — that would invite hallucination.

### Stage 7 — RAG (`lib/ai/rag.ts`)
At build time, `scripts/generate-embeddings.ts` computes a `text-embedding-3-small` vector for every material description and writes `data/embeddings.json` (~3 MB).

At request time:
1. The user's structured query is flattened into a natural-language description
2. That description is embedded
3. Cosine similarity is computed against the shortlist's stored vectors
4. Top-K snippets are returned as evidence

No Pinecone, no Qdrant, no Supabase. Just a JSON file and an in-memory `Map`.

### Stage 8 — Explainer (`lib/ai/explainer.ts`)
Given shortlist + rule reasons/penalties + ASTM validations + RAG evidence, `gpt-4o` emits the final JSON (strict schema):
- `recommendations[]` — top 5, each with `keyReasons[]`
- `matrix` — criteria × materials comparison
- `rejected[]` — 6–10 alternatives with one-line reasons
- `modelNotes` — assumptions the engineer should verify

### Floating chatbot (`/api/chat` + `components/chat/floating-chatbot.tsx`)
- Retrieves the top-5 most semantically relevant materials from the **entire dataset** (not just the current shortlist)
- Answers with `gpt-4o-mini` in a constrained style (2–5 sentences, inline material names, no markdown)
- Aware of the current setup + recommendations if the user is on `/results`
- Shows cited sources at the bottom of each answer

---

## 🎨 Design system

- **Display:** Bricolage Grotesque (via `next/font`)
- **Body:** Geist
- **Mono (technical data):** Geist Mono
- **Light palette:** bone + deep ink + deep teal `#007782`
- **Dark palette:** obsidian + electric teal `#40E0D0` + warm amber `#FFB347`

Theme tokens are defined as CSS custom properties in `app/globals.css` and referenced by Tailwind through `tailwind.config.ts`. Toggle handled by `next-themes` with no flash on load.

---

## 🔧 Customization

### Add materials to the dataset
Edit `data/materials_astm_master_860rows.json`. Each row needs at minimum:
```json
{
  "id": "unique-id",
  "name": "Display name",
  "astm": "ASTM A240",
  "family": "austenitic",
  "temp_min_c": -196,
  "temp_max_c": 870,
  "service_fit": ["seawater", "food_product"],
  "tags": ["chloride_resistant", "nace_mr0175"],
  "cost_band": "medium",
  "weldability": "excellent"
}
```

Then rerun `npm run embed` to refresh vectors.

### Extend the ASTM rulebook
Add entries to `ASTM_RULEBOOK` in `lib/ai/astm-validator.ts`:
```ts
"A182": {
  description: "Forged pipe flanges...",
  scope: ["Valve body", "Pump casing", "Pipe"],
  families: ["stainless", "duplex"]
}
```

### Tune the rule engine
All knobs live in `lib/ai/rule-engine.ts`. Bonuses are integers added to a baseline of 55; penalties are subtracted and clamped. Every bonus/penalty also pushes a human-readable string to `reasons[]` or `penalties[]` that the LLM sees downstream.

---

## 📦 Deploy

Vercel is the fastest path:

1. Push this repo to GitHub
2. Import it at https://vercel.com/new
3. Add `OPENAI_API_KEY` in **Project Settings → Environment Variables**
4. (Optional) Run `npm run embed` locally and commit `data/embeddings.json` — or remove it from `.gitignore` — so embeddings are available in production. Without it, chat/RAG fall back to keyword matching.

Edge runtime: API routes are set to `runtime = "nodejs"` because they load a JSON file from disk. Keep it that way.

---

## 🩺 Troubleshooting

**`OPENAI_API_KEY missing`** — put it in `.env.local` at the project root. Restart `npm run dev` after editing.

**Embeddings take forever / fail** — they're batched 64 at a time. If OpenAI rate-limits you, rerun; the script resumes cleanly because the output file is written atomically at the end.

**Chatbot returns "something broke"** — open DevTools → Network → inspect the failed `/api/chat` request. Most commonly: missing API key or rate limit.

**Matrix is empty** — the explainer's structured output requires every recommended material to have a row. Check the server logs for a schema parse error.

---

## 📄 License

Internal prototype — validate outputs against applicable codes (ASME, API, NACE) before real use.
