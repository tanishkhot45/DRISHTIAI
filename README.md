# Drishti AI

> **Standards-aware material selection for industrial service conditions.**
> Describe your service in plain English, get explainable, ASTM-grounded
> material recommendations with reasoning you can actually review.

Drishti is a materials engineering assistant. It takes a service brief —
domain, environment, temperature, pressure, exposure drivers — and returns
ranked material picks with deterministic ASTM validation, retrieval-grounded
evidence, and per-pick engineering reasoning.

Built for two workflows:
- **Select** — one-off material picks for a single component
- **Project Mode** — whole-system material selection across many components, with
  diversity logic, consolidation notes, and a combined PDF deliverable

---

## Highlights

- **Explainable pipeline.** Every recommendation passes through deterministic
  rule scoring → ASTM compliance check → RAG evidence retrieval → LLM
  explainer → per-material reasoner. Nothing is a black box.
- **Standards-aware.** ASTM compliance is checked against a deterministic
  rulebook, not the LLM. Compliance flags are reliable.
- **Component-specific reasoning.** Reasoning paragraphs reference your actual
  numeric temperatures, exposure drivers, and component name. No generic
  alloy-family talk.
- **Project diversity logic.** When running selection across many
  components, the system tracks materials already chosen and applies a
  three-layer diversity check (tracking → soft penalty → LLM prompt
  guardrail) so you don't end up with Alloy 625 picked for everything.
- **Procurement & consolidation notes.** Every result card and PDF section
  includes a procurement note. In Project Mode it's project-aware ("Already
  used for 4 components — consolidating reduces weld procedure variants").
- **Branded PDF exports.** Single-mode and project-mode PDFs with rationale,
  ASTM notes, side-by-side matrix, and procurement breakdown.
- **Persistent projects.** localStorage with 14-day TTL. Survives refreshes
  and tab closes; old projects auto-prune.
- **Deterministic outputs.** `temperature: 0` + `seed: 42` across all LLM
  calls means re-runs of the same input return the same result.

---

## Tech stack

- **Next.js 14.2** (App Router) + **TypeScript**
- **Zustand** with `persist` middleware for project state
- **Framer Motion** for transitions
- **OpenAI SDK** (`gpt-4o` for reasoning, `gpt-4o-mini` for chat,
  `text-embedding-3-small` for RAG)
- **jsPDF** + `jspdf-autotable` for PDF generation
- **Tailwind CSS** with a custom token system (accent gradient, glass cards,
  aurora hero blocks)
- **Bricolage Grotesque** (display) + **Plus Jakarta Sans** (body) +
  **JetBrains Mono** (technical readouts)

---

## Getting started

### Prerequisites

- Node.js 18.18+ (or 20+)
- An OpenAI API key

### Setup

```bash
git clone <repo>
cd drishti-ai
npm install

cp .env.example .env.local
# add OPENAI_API_KEY=sk-... to .env.local

npm run dev
```

Open http://localhost:3000.

### Build

```bash
npm run build
npm start
```

---

## How it works

### The selection pipeline (per component)

```
SetupInput
   ↓
Stage 1 · Interpreter — natural-language → structured fields (LLM, optional)
   ↓
Stage 4 · Rule Engine — deterministic scoring against the materials dataset
   ↓
Stage 6 · ASTM Validator — rulebook compliance check (no LLM)
   ↓
Stage 7 · RAG Retriever — cosine similarity over pre-computed embeddings
   ↓
Stage 8 · Explainer — LLM with strict JSON schema, returns shortlist + matrix + rejected
   ↓
Stage 9 · Reasoner — per-material prose + procurement note (LLM)
   ↓
SelectionResult
```

Each stage is testable in isolation. Stages that don't need a model don't use
one. Stages that do are pinned to `temperature: 0` + `seed: 42` for
reproducibility.

### Project Mode adds

- **Component-aware input shaping.** A `ComponentProfile` is inferred per
  component (valve, flowline, fastener, seal, etc.) with role-specific
  reward/avoid regexes and engineering intent. The `SetupInput` sent to the
  pipeline is shaped by the role — a fastener gets bolting-strength priorities,
  a flowline gets weldability priorities.
- **Project-wide diversity tally.** Before each component runs, the store
  builds a tally of materials already chosen for siblings. The tally goes
  into the LLM's notes ("these are already heavily used") AND drives a
  soft penalty in post-rank refinement (-2 to -6 score adjustment).
- **Project context in the reasoner.** The reasoner receives `topPicks` and
  `totalSelected` so it can write project-aware procurement notes ("Already
  used for 4 components — consolidating reduces weld procedure variants").
- **Pair detection.** Components are auto-paired by name keywords
  (bolted/flanged/welded). Used for future galvanic-warning checks.

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing |
| `/setup` | Single-component selection form |
| `/results` | Single-component results view |
| `/compare` | Side-by-side comparison page |
| `/projects` | Project list |
| `/projects/new` | Create project (set defaults) |
| `/projects/[id]` | Project workspace (components + alloy map) |

### API

| Endpoint | Body | Returns |
|---|---|---|
| `POST /api/select` | `SetupInput` + optional `projectContext` | `SelectionResult` |
| `POST /api/interpret` | `{ text }` | structured `SetupInput` fields |
| `POST /api/extract-components` | `{ text }` | array of component rows |
| `POST /api/chat` | message history | streamed chatbot response |

---

## Project structure

```
app/
  api/
    select/route.ts            ← main selection pipeline
    interpret/route.ts         ← natural-language → SetupInput
    extract-components/route.ts ← system description → component list
    chat/route.ts              ← chatbot
  setup/page.tsx               ← single-mode form
  results/page.tsx             ← single-mode results
  compare/page.tsx             ← side-by-side
  projects/
    page.tsx                   ← project list
    new/page.tsx               ← create project
    [id]/page.tsx              ← workspace (with diversity logic)

components/
  layout/
    navbar.tsx                 ← responsive nav with mobile hamburger
    aurora-bg.tsx              ← animated background
    theme-provider.tsx
  setup/options.ts             ← enum source of truth for the UI
  results/
    material-card.tsx          ← single-mode result card
    results-view.tsx           ← single-mode results layout
    matrix-table.tsx
    rejected-list.tsx
    compare-tray.tsx
  projects/
    project-card.tsx           ← project list card
    component-row.tsx          ← component row in workspace
    component-drawer.tsx       ← edit / Why this / Compare drawer
    add-components-modal.tsx   ← three-tab add modal (text / AI / paste)
    intelligence-feed.tsx      ← cross-component analysis feed
  chat/
    floating-chatbot.tsx
    loading-overlay.tsx

lib/
  ai/
    interpreter.ts             ← Stage 1
    rule-engine.ts             ← Stage 4
    astm-validator.ts          ← Stage 6
    rag.ts                     ← Stage 7
    explainer.ts               ← Stage 8
    reasoner.ts                ← Stage 9 (reasoning + consolidation note)
    component-extractor.ts     ← extract components from system description
  data/
    loader.ts                  ← loads materials dataset
  export.ts                    ← PDF + CSV generators
  store.ts                     ← single-mode result store
  projects-store.ts            ← project store (Zustand persist)
  projects-types.ts            ← project types
  projects-utils.ts            ← pair detection, parsers, helpers
  schema.ts                    ← Zod validation
  types.ts                     ← shared types (SetupInput, MaterialRow, etc.)
  utils.ts
  openai.ts                    ← model registry + config

data/
  materials.json               ← materials dataset
  embeddings.json              ← pre-computed embeddings for RAG
```

---

## Determinism

All LLM calls use `temperature: 0` and `seed: 42`. Re-running the same
component with the same conditions returns identical recommendations and
identical reasoning text.

The post-rank refinement (component-fit + diversity deltas) is also
deterministic — same inputs, same scores, same ordering.

---

## Diversity logic (Project Mode)

Three layers prevent the same alloy being selected everywhere unless
genuinely justified:

**Layer 1 — Tracking.** Every result is recorded. `buildProjectMaterialTally`
returns `{ counts, topPicks, totalSelected }`, computed fresh per run.

**Layer 2 — Soft penalty.** In post-rank refinement, candidates already used
elsewhere in the project receive a score adjustment:
- 0 prior uses (and not in profile.avoid): **+2** boost
- 1 prior use: neutral
- 2 prior uses: **-2**
- 3 prior uses: **-4**
- 4+ prior uses: **-6** (capped)

**Layer 3 — LLM prompt guardrail.** When a material exceeds 40% of the
project's selections (and at least 2 components), the reasoner receives a
prompt line: *"these materials are already heavily used; you may pick the
same alloy ONLY if conditions truly demand it; otherwise prefer
alternatives."*

The penalty is bounded at ±6 while real fit signals can be ±14, so a
genuinely-correct alloy still wins the rerank even if it's been used many
times. The system avoids forcing diversity for its own sake.

---

## Persistence

Project data is stored in `localStorage` under the key `drishti-projects`.

- **TTL: 14 days.** Projects whose `updatedAt` is older than 14 days are
  pruned on app load via `onRehydrateStorage`.
- **Store version 2.** Future schema migrations bump the version and run
  through `migrate`.
- **No server-side persistence.** All project state is client-side. Export
  to PDF for permanent records.

---

## Mobile

The navbar uses a responsive layout: full pill links on `md+`, hamburger
dropdown sheet on phones. Mobile sheet auto-closes on route change, link
tap, backdrop tap, or Escape key.

---

## Environment variables

```env
# Required
OPENAI_API_KEY=sk-...

# Optional model overrides (defaults shown)
DRISHTI_REASONING_MODEL=gpt-4o
DRISHTI_CHAT_MODEL=gpt-4o-mini
DRISHTI_EMBEDDING_MODEL=text-embedding-3-small
```

---

## Disclaimer

Drishti AI is an **explainable selection assistant**, not a code-compliance
authority. Always validate recommendations against:

- Project-specific design codes (ASME, API, NACE, ISO, etc.)
- Local jurisdictional requirements
- Your engineering team's standards and approved vendor lists
- Failure mode analysis specific to your service

The ASTM compliance check is rule-based and covers common service
classifications. It does not replace formal Material Test Reports, mill
certificates, or witness inspections.

---

## License

Private — all rights reserved.