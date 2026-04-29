"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Play,
  Plus,
  Search,
  Loader2,
  Trash2,
  Info,
  RefreshCw,
} from "lucide-react";
import { useProjectsStore } from "@/lib/projects-store";
import { Button, Card } from "@/components/ui";
import { ComponentRow } from "@/components/projects/component-row";
import { ComponentDrawer } from "@/components/projects/component-drawer";
import { AddComponentsModal } from "@/components/projects/add-components-modal";
import { exportProjectPdf } from "@/lib/export";
import type { Project, ProjectComponent } from "@/lib/projects-types";
import type {
  ComponentType,
  Criticality,
  ExposureDriver,
  OperatingMode,
  SelectionResult,
  ServiceMedium,
  SetupInput,
} from "@/lib/types";

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const project = useProjectsStore((s) =>
    s.projects.find((p) => p.id === params.id)
  );
  const addComponents = useProjectsStore((s) => s.addComponents);
  const updateComponent = useProjectsStore((s) => s.updateComponent);
  const deleteComponent = useProjectsStore((s) => s.deleteComponent);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const setComponentResult = useProjectsStore((s) => s.setComponentResult);
  const clearComponentResults = useProjectsStore(
    (s) => s.clearComponentResults
  );

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [addOpen, setAddOpen] = useState(false);
  const [openCmpId, setOpenCmpId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [runAllProgress, setRunAllProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const openCmp = useMemo(
    () => project?.components.find((c) => c.id === openCmpId) ?? null,
    [project, openCmpId]
  );

  const filtered = useMemo(() => {
    if (!project) return [];
    const q = search.trim().toLowerCase();
    if (!q) return project.components;
    return project.components.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.notes || "").toLowerCase().includes(q)
    );
  }, [project, search]);

  /**
   * Run one component with retry on rate limits, including the project-wide
   * material tally so the LLM and re-rank can apply diversity logic.
   */
  const runOneWithRetry = async (
    cmp: ProjectComponent,
    maxRetries = 3
  ): Promise<void> => {
    if (!project) return;

    // Tally of materials picked for OTHER components in this project,
    // computed fresh on every run so re-runs always reflect current state.
    const projectTally = buildProjectMaterialTally(project, cmp.id);

    const merged = buildComponentSelectionInput(project, cmp, projectTally);
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch("/api/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(merged),
        });
        const json = await res.json();
        if (!json.ok) {
          const msg = String(json.error || "");
          const waitMatch = msg.match(/try again in ([\d.]+)s/i);
          if (res.status === 429 || /rate limit/i.test(msg)) {
            const waitMs = waitMatch
              ? Math.ceil(parseFloat(waitMatch[1]) * 1000) + 500
              : 20000;
            if (attempt < maxRetries) {
              await new Promise((r) => setTimeout(r, waitMs));
              continue;
            }
          }
          throw new Error(msg || "Selection failed");
        }

        const refined = refineSelectionForComponent(
          json.data,
          cmp,
          merged,
          projectTally
        );
        setComponentResult(project.id, cmp.id, refined);
        return;
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
    }
    throw lastError || new Error("Selection failed after retries");
  };

  const runOne = async (cmp: ProjectComponent) => {
    setRunningIds((prev) => new Set(prev).add(cmp.id));
    try {
      await runOneWithRetry(cmp);
    } catch (err: any) {
      console.error("runOne", err);
      alert(`Failed on "${cmp.name}": ${err.message}`);
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(cmp.id);
        return next;
      });
    }
  };

  const runBatch = async (batch: ProjectComponent[]) => {
    if (!project || batch.length === 0) return;

    setRunAllProgress({ done: 0, total: batch.length });

    for (let i = 0; i < batch.length; i++) {
      const cmp = batch[i];
      setRunningIds((prev) => new Set(prev).add(cmp.id));
      try {
        await runOneWithRetry(cmp);
      } catch (err: any) {
        console.error(`runAll [${cmp.name}]`, err);
      } finally {
        setRunningIds((prev) => {
          const next = new Set(prev);
          next.delete(cmp.id);
          return next;
        });
      }

      setRunAllProgress({ done: i + 1, total: batch.length });

      if (i < batch.length - 1) {
        await new Promise((r) => setTimeout(r, 2500));
      }
    }

    setRunAllProgress(null);
  };

  const runAll = async () => {
    if (!project) return;
    await runBatch(project.components.filter((c) => !c.result));
  };

  const rerunAll = async () => {
    if (!project) return;
    clearComponentResults(project.id);
    await runBatch(project.components);
  };

  const exportPdf = () => {
    if (!project) return;
    exportProjectPdf(project);
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-subtle">Loading…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">
          Project not found
        </h1>
        <p className="text-sm text-muted">
          It may have been deleted, or the link is wrong.
        </p>
        <Link href="/projects">
          <Button variant="accent">All projects</Button>
        </Link>
      </div>
    );
  }

  const total = project.components.length;
  const done = project.components.filter((c) => c.result).length;
  const isRunningAny = runningIds.size > 0 || runAllProgress !== null;

  // Header chip — show the most-used alloy if any (visible diversity signal)
  const headerTally = buildProjectMaterialTally(project, "");
  const topAlloy = headerTally.topPicks[0];
  const showMostUsed = topAlloy && topAlloy.count >= 2;
  const mostUsedTone =
    topAlloy && total > 0 && topAlloy.count >= Math.ceil(total * 0.5)
      ? "warn"
      : "default";

  return (
    <>
      <div className="space-y-6 pb-32">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div className="min-w-0 flex-1">
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 text-xs text-subtle transition hover:text-fg"
            >
              <ArrowLeft className="h-3 w-3" />
              All projects
            </Link>
            <h1 className="mt-2 truncate font-display text-3xl font-semibold tracking-[-0.03em] text-fg md:text-4xl">
              {project.name}
            </h1>
            {project.description && (
              <p className="mt-1 max-w-2xl text-sm text-muted">
                {project.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <StatChip label="Components" value={total} />
              <StatChip
                label="Selections"
                value={total ? `${done}/${total}` : "—"}
                tone={done === total && total > 0 ? "good" : "default"}
              />
              {showMostUsed && (
                <StatChip
                  label="Most used"
                  value={`${topAlloy.name} ${topAlloy.count}×`}
                  tone={mostUsedTone}
                />
              )}
              {runAllProgress && (
                <StatChip
                  label="Progress"
                  value={`${runAllProgress.done}/${runAllProgress.total}`}
                  tone="default"
                />
              )}
            </div>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            {done > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={rerunAll}
                disabled={isRunningAny}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Re-run all
              </Button>
            )}
            <Button
              variant="accent"
              onClick={runAll}
              disabled={isRunningAny || total === 0 || done === total}
              size="sm"
            >
              {isRunningAny ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {runAllProgress
                    ? `Running ${Math.min(
                        runAllProgress.done + 1,
                        runAllProgress.total
                      )}/${runAllProgress.total}…`
                    : "Running…"}
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Run selection
                  {done > 0 && total > done ? ` (${total - done} left)` : ""}
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={exportPdf}
              disabled={done === 0}
            >
              <FileText className="h-3.5 w-3.5" />
              Export PDF
            </Button>
            <button
              onClick={() => {
                if (!confirmingDelete) {
                  setConfirmingDelete(true);
                  setTimeout(() => setConfirmingDelete(false), 3000);
                  return;
                }
                deleteProject(project.id);
                router.push("/projects");
              }}
              aria-label={
                confirmingDelete ? "Confirm delete" : "Delete project"
              }
              className={[
                "focus-ring flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition",
                confirmingDelete
                  ? "bg-red-500/15 text-red-500 hover:bg-red-500/25"
                  : "text-subtle hover:bg-red-500/10 hover:text-red-500",
              ].join(" ")}
            >
              <Trash2 className="h-3 w-3" />
              {confirmingDelete ? "Confirm delete" : ""}
            </button>
          </div>
        </motion.header>

        {/* Two-panel layout — items-stretch + flex on each panel keeps both Card heights equal */}
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
          <motion.aside
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="min-w-0 lg:col-span-7"
          >
            <div className="h-full [&>*]:h-full">
              <Card
                title={`Components (${total})`}
                description="Tap any to edit, override, or view its result."
                action={
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                }
              >
                {total > 0 && (
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search components…"
                      className="focus-ring w-full rounded-xl border border-fg/10 bg-fg/[0.02] py-2 pl-9 pr-3 text-sm text-fg placeholder:text-subtle/60 focus:border-accent/40 focus:bg-fg/[0.04]"
                    />
                  </div>
                )}

                {total === 0 ? (
                  <div className="rounded-xl border border-dashed border-fg/10 py-10 text-center">
                    <p className="text-sm text-muted">No components yet</p>
                    <p className="mt-1 text-xs text-subtle">
                      Add them one by one, paste a list, or describe your
                      system.
                    </p>
                    <Button
                      variant="accent"
                      size="sm"
                      className="mt-4"
                      onClick={() => setAddOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add components
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    <AnimatePresence mode="popLayout">
                      {filtered.map((c) => (
                        <ComponentRow
                          key={c.id}
                          component={c}
                          overrideCount={
                            c.conditions ? Object.keys(c.conditions).length : 0
                          }
                          isRunning={runningIds.has(c.id)}
                          onOpen={() => setOpenCmpId(c.id)}
                          onDelete={() => deleteComponent(project.id, c.id)}
                        />
                      ))}
                    </AnimatePresence>
                    {filtered.length === 0 && search && (
                      <p className="py-6 text-center text-xs text-subtle">
                        No matches for "{search}"
                      </p>
                    )}
                  </ul>
                )}
              </Card>
            </div>
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="min-w-0 lg:col-span-5"
          >
            <div className="h-full [&>*]:h-full">
              <Card
                title="Alloy map"
                description="Distribution of selected materials."
              >
                {done === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-fg/10 py-12 text-center">
                    <Info className="mb-3 h-6 w-6 text-subtle" />
                    <p className="text-sm font-medium text-fg">
                      Map appears after selection
                    </p>
                    <p className="mt-1 max-w-xs text-xs text-muted">
                      Once you run selection, components get grouped by the
                      alloy picked for each.
                    </p>
                  </div>
                ) : (
                  <AlloyCloud project={project} />
                )}
              </Card>
            </div>
          </motion.section>
        </div>
      </div>

      <AddComponentsModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(items) => {
          addComponents(project.id, items);
        }}
      />

      <ComponentDrawer
        project={project}
        component={openCmp}
        open={!!openCmp}
        onClose={() => setOpenCmpId(null)}
        running={openCmp ? runningIds.has(openCmp.id) : false}
        onSave={(patch) => {
          if (openCmp) updateComponent(project.id, openCmp.id, patch);
        }}
        onDelete={() => {
          if (openCmp) {
            deleteComponent(project.id, openCmp.id);
            setOpenCmpId(null);
          }
        }}
        onRunOne={() => {
          if (openCmp) runOne(openCmp);
        }}
      />
    </>
  );
}

function StatChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "warn" | "good";
}) {
  const toneClass =
    tone === "warn"
      ? "text-amber-500"
      : tone === "good"
      ? "text-emerald-500"
      : "text-fg";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-fg/10 bg-fg/[0.02] px-2.5 py-1 text-[11px]">
      <span className="text-subtle">{label}</span>
      <span className={`font-tech font-semibold ${toneClass}`}>{value}</span>
    </span>
  );
}

function AlloyCloud({ project }: { project: Project }) {
  const selectedComponents = project.components.filter(
    (c) => c.result?.recommendations?.[0]
  );
  const groups = new Map<
    string,
    { name: string; components: ProjectComponent[] }
  >();

  for (const c of selectedComponents) {
    const pick = c.result?.recommendations?.[0];
    if (!pick) continue;
    const key = normalizeMaterialName(pick.name);
    const existing = groups.get(key);
    if (existing) existing.components.push(c);
    else groups.set(key, { name: pick.name, components: [c] });
  }

  const sorted = Array.from(groups.values()).sort(
    (a, b) => b.components.length - a.components.length
  );

  if (sorted.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-subtle">No results yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((g, i) => {
        const pct = Math.round(
          (g.components.length / selectedComponents.length) * 100
        );
        return (
          <div
            key={g.name}
            className="rounded-xl border border-fg/10 bg-fg/[0.02] p-3"
          >
            <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-medium text-fg">
                {g.name}
              </p>
              <p className="shrink-0 font-tech text-xs text-accent">
                {g.components.length}
              </p>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-fg/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-accent to-accent2"
              />
            </div>
            <p className="mt-1 text-[10px] text-subtle">
              {pct}% of selected components
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Component-aware selection input + post-rank refinement
   ============================================================ */

type ComponentRole =
  | "pipe"
  | "flowline"
  | "valve"
  | "flange"
  | "connector"
  | "fastener"
  | "seal"
  | "instrument"
  | "structural"
  | "generic";

type ComponentProfile = {
  role: ComponentRole;
  componentType: ComponentType;
  criticality: Criticality;
  operatingMode: OperatingMode;
  serviceMedium?: ServiceMedium;
  serviceMediumHint: string;
  pressureBar?: number;
  exposureDrivers: ExposureDriver[];
  exposureHints: string[];
  intent: string;
  reward: RegExp[];
  avoid: RegExp[];
};

function buildComponentSelectionInput(
  project: Project,
  cmp: ProjectComponent,
  projectTally?: ProjectMaterialTally
): SetupInput {
  const profile = inferComponentProfile(cmp);
  const defaults = (project.defaults || {}) as Partial<SetupInput>;
  const overrides = (cmp.conditions || {}) as Partial<SetupInput>;

  const exposureDrivers = uniqueDrivers([
    ...(defaults.exposureDrivers || []),
    ...profile.exposureDrivers,
    ...(overrides.exposureDrivers || []),
  ]);

  const designPressureBar =
    typeof overrides.designPressureBar === "number"
      ? overrides.designPressureBar
      : profile.pressureBar ?? defaults.designPressureBar ?? null;

  // Diversity context for the LLM
  const diversityLine = buildDiversityPromptLine(projectTally);

  const notes = uniqueStrings([
    typeof defaults.notes === "string" ? defaults.notes : "",
    cmp.notes,
    `Component: ${cmp.name}${
      cmp.quantity && cmp.quantity > 1 ? ` (×${cmp.quantity})` : ""
    }`,
    `Detected role: ${profile.role}`,
    `Service hint: ${profile.serviceMediumHint}`,
    profile.exposureHints.length
      ? `Exposure hints: ${profile.exposureHints.join(", ")}`
      : "",
    `Selection intent: ${profile.intent}`,
    "Selection guardrail: evaluate this component independently; do not reuse the same alloy only because another project component selected it.",
    diversityLine,
  ])
    .filter(Boolean)
    .join(" · ");

  const baseDefaults: SetupInput = {
    domain: "Oil & Gas",
    environment: "Unknown",
    componentType: "Other",
    criticality: "Medium",
    operatingMode: "Continuous",
    minTempC: 20,
    maxTempC: 60,
    designPressureBar: null,
    designPressureUnknown: true,
    designLife: "10–25",
    serviceMedium: "Unknown",
    exposureDrivers: [],
  };

  return {
    ...baseDefaults,
    ...(defaults as SetupInput),
    componentType: profile.componentType,
    criticality: profile.criticality,
    operatingMode: profile.operatingMode,
    serviceMedium: profile.serviceMedium ?? defaults.serviceMedium ?? "Unknown",
    designPressureBar,
    designPressureUnknown: designPressureBar === null,
    ...(overrides as SetupInput),
    exposureDrivers,
    notes,
  };
}

function inferComponentProfile(cmp: ProjectComponent): ComponentProfile {
  const text = `${cmp.name} ${cmp.notes || ""}`.toLowerCase();
  const pressureBar = parsePressureBar(text);

  if (/\b(gasket|seal|o-ring|oring|packing|seat|ring gasket)\b/.test(text)) {
    return withCommonDrivers(text, {
      role: "seal",
      componentType: "Seal",
      criticality: "High",
      operatingMode: "Intermittent",
      serviceMediumHint: "Hydrocarbon process fluid at sealing interface",
      pressureBar,
      exposureDrivers: ["crevice"],
      exposureHints: ["Seal compatibility", "Compression set risk"],
      intent:
        "Prefer sealing-compatible materials and gasket alloys rather than defaulting to the main pressure-part alloy.",
      reward: [
        /graphite/i,
        /ptfe/i,
        /spiral/i,
        /316/i,
        /625/i,
        /825/i,
        /hnbr/i,
        /ffkm/i,
        /elastomer/i,
      ],
      avoid: [/plain carbon/i, /structural/i],
    });
  }

  if (
    /\b(stud bolt|studs?|bolts?|nuts?|washer|fastener|bolting)\b/.test(text) &&
    !/studded connector/.test(text)
  ) {
    return withCommonDrivers(text, {
      role: "fastener",
      componentType: "Fastener",
      criticality: "High",
      operatingMode: "Continuous",
      serviceMediumHint:
        "External bolting with possible splash-zone or process exposure",
      pressureBar,
      exposureDrivers: ["crevice"],
      exposureHints: [
        "Galvanic coupling",
        "Stress corrosion cracking risk",
        "High preload",
      ],
      intent:
        "Prioritize bolting strength, preload retention, galling resistance, and galvanic compatibility with the joined components.",
      reward: [
        /718/i,
        /725/i,
        /a193/i,
        /a320/i,
        /b7m?/i,
        /b8m/i,
        /660/i,
        /xm-19/i,
        /nitronic/i,
        /17-4/i,
        /bolting/i,
      ],
      avoid: [/alloy\s*625/i, /inconel\s*625/i, /soft annealed/i],
    });
  }

  if (
    /\b(master valve|wing valve|swab valve|gate valve|ball valve|check valve|choke|valve)\b/.test(
      text
    )
  ) {
    const isCritical = /master|choke|api\s*6a|5,?000|5000/.test(text);
    return withCommonDrivers(text, {
      role: "valve",
      componentType: "Valve body",
      criticality: isCritical ? "Safety critical" : "High",
      operatingMode: "Cyclic",
      serviceMediumHint:
        "Produced hydrocarbons with brine, gas, and possible sand",
      pressureBar:
        pressureBar ?? (/api\s*6a|5,?000|5000/.test(text) ? 345 : undefined),
      exposureDrivers: ["erosion_high_velocity", "crevice"],
      exposureHints: ["Sour service screening", "Valve trim wear"],
      intent:
        "Separate valve-body needs from trim/seat wear needs; reward erosion, galling, and pressure-control suitability.",
      reward: [
        /625/i,
        /718/i,
        /725/i,
        /stellite/i,
        /tungsten/i,
        /carbide/i,
        /17-4/i,
        /410/i,
        /duplex/i,
        /super\s*duplex/i,
        /8630/i,
        /4130/i,
      ],
      avoid: [/low strength/i, /plain copper/i, /brass/i],
    });
  }

  if (/\b(flowline|spool|riser|jumper|pipeline)\b/.test(text)) {
    return withCommonDrivers(text, {
      role: "flowline",
      componentType: "Pipe",
      criticality: "High",
      operatingMode: "Continuous",
      serviceMediumHint:
        "Produced fluids with brine, CO2/H2S screening, and possible sand",
      pressureBar,
      exposureDrivers: ["erosion_high_velocity"],
      exposureHints: [
        "Internal corrosion",
        "Weldability",
        "Chloride pitting screening",
      ],
      intent:
        "Prioritize weldability, pipe availability, corrosion allowance/CRA strategy, and flow erosion resistance.",
      reward: [
        /duplex/i,
        /super\s*duplex/i,
        /2205/i,
        /2507/i,
        /22cr/i,
        /25cr/i,
        /316l/i,
        /carbon steel/i,
        /clad/i,
        /lined/i,
        /x65/i,
        /x70/i,
      ],
      avoid: [/alloy\s*625/i, /inconel\s*625/i, /monel/i],
    });
  }

  if (/\b(pipe|tube|tubing)\b/.test(text)) {
    return withCommonDrivers(text, {
      role: "pipe",
      componentType: /\btub(e|ing)\b/.test(text) ? "Tubing" : "Pipe",
      criticality: "High",
      operatingMode: "Continuous",
      serviceMediumHint: "Oil and gas production fluid",
      pressureBar,
      exposureDrivers: [],
      exposureHints: [
        "Internal corrosion",
        "Weldability",
        "Chloride pitting screening",
      ],
      intent:
        "Prioritize pipe-grade availability, weldability, corrosion allowance/CRA strategy, and lifecycle cost.",
      reward: [
        /duplex/i,
        /super\s*duplex/i,
        /2205/i,
        /2507/i,
        /316l/i,
        /carbon steel/i,
        /clad/i,
        /lined/i,
        /x65/i,
        /x70/i,
      ],
      avoid: [/alloy\s*625/i, /inconel\s*625/i, /monel/i],
    });
  }

  if (/\b(blind flange|flange|hub|clamp)\b/.test(text)) {
    return withCommonDrivers(text, {
      role: "flange",
      componentType: "Fastener",
      criticality: /blind|class\s*1500|api\s*6a/.test(text) ? "High" : "Medium",
      operatingMode: "Continuous",
      serviceMediumHint: "Pressurized hydrocarbon service at a bolted joint",
      pressureBar: pressureBar ?? pressureFromClass(text),
      exposureDrivers: ["crevice"],
      exposureHints: [
        "Galvanic coupling",
        "Bolted joint sealing",
        "Pressure boundary integrity",
      ],
      intent:
        "Prioritize pressure-boundary strength, flange standard compatibility, crevice resistance, and bolting/gasket compatibility.",
      reward: [
        /a182/i,
        /f51/i,
        /f53/i,
        /f55/i,
        /duplex/i,
        /super\s*duplex/i,
        /625/i,
        /825/i,
        /4130/i,
        /8630/i,
        /f22/i,
        /clad/i,
      ],
      avoid: [/low strength/i, /sheet/i, /thin gauge/i],
    });
  }

  if (
    /\b(studded connector|connector|coupling|adapter|fitting|tee|elbow|christmas tree|xmas tree|wellhead)\b/.test(
      text
    )
  ) {
    const isCritical = /api\s*6a|wellhead|christmas|xmas|studded/.test(text);
    return withCommonDrivers(text, {
      role: "connector",
      componentType: "Pressure vessel",
      criticality: isCritical ? "Safety critical" : "High",
      operatingMode: "Continuous",
      serviceMediumHint: "High-pressure wellhead or production service",
      pressureBar:
        pressureBar ??
        (/api\s*6a|wellhead|christmas|xmas/.test(text) ? 345 : undefined),
      exposureDrivers: ["crevice"],
      exposureHints: [
        "Galvanic coupling",
        "Pressure boundary integrity",
        "Sour service screening",
      ],
      intent:
        "Prioritize high-pressure connector strength, standard compatibility, CRA/cladding strategy, and galvanic compatibility.",
      reward: [
        /718/i,
        /725/i,
        /625/i,
        /825/i,
        /8630/i,
        /4130/i,
        /f22/i,
        /duplex/i,
        /super\s*duplex/i,
        /clad/i,
      ],
      avoid: [/low strength/i, /plain copper/i, /brass/i],
    });
  }

  if (/\b(sensor|instrument|gauge|transmitter|thermowell|probe)\b/.test(text)) {
    return withCommonDrivers(text, {
      role: "instrument",
      componentType: "Other",
      criticality: "Medium",
      operatingMode: "Intermittent",
      serviceMediumHint: "Process fluid at instrument interface",
      pressureBar,
      exposureDrivers: ["crevice"],
      exposureHints: ["Localized corrosion", "Small-bore plugging"],
      intent:
        "Prioritize wetted-part corrosion resistance and small-bore reliability.",
      reward: [/316l/i, /duplex/i, /625/i, /825/i, /hastelloy/i, /c276/i],
      avoid: [/plain carbon/i],
    });
  }

  if (/\b(frame|skid|support|bracket|baseplate|structural)\b/.test(text)) {
    return withCommonDrivers(text, {
      role: "structural",
      componentType: "Structural",
      criticality: "Medium",
      operatingMode: "Continuous",
      serviceMediumHint: "Atmospheric external exposure",
      pressureBar,
      exposureDrivers: ["UV_outdoor"],
      exposureHints: ["Atmospheric corrosion", "Coating durability"],
      intent:
        "Prioritize structural strength, coating strategy, fabricability, and cost instead of high-nickel CRA defaults.",
      reward: [
        /carbon steel/i,
        /a36/i,
        /a572/i,
        /galvanized/i,
        /coated/i,
        /316/i,
      ],
      avoid: [/alloy\s*625/i, /inconel\s*625/i, /hastelloy/i],
    });
  }

  return withCommonDrivers(text, {
    role: "generic",
    componentType: "Other",
    criticality: "Medium",
    operatingMode: "Continuous",
    serviceMediumHint: "Oil and gas service",
    pressureBar,
    exposureDrivers: [],
    exposureHints: ["General corrosion screening"],
    intent:
      "Evaluate the component by function, geometry, pressure boundary role, fabrication route, and lifecycle cost.",
    reward: [/duplex/i, /316/i, /625/i, /825/i, /carbon/i, /clad/i],
    avoid: [],
  });
}

function withCommonDrivers(
  text: string,
  profile: ComponentProfile
): ComponentProfile {
  const drivers = [...profile.exposureDrivers];
  const hints = [...profile.exposureHints];

  if (/\b(offshore|marine|seawater|splash|chloride|brine)\b/.test(text)) {
    drivers.push("chlorides_high");
    hints.push("Seawater / chloride exposure");
  }
  if (/\b(sour|h2s|h₂s|nace|mr0175|iso\s*15156)\b/.test(text)) {
    drivers.push("H2S_yes");
    hints.push("Sour service / SSC");
  }
  if (/\b(co2|co₂|carbon dioxide)\b/.test(text)) {
    drivers.push("CO2_yes");
    hints.push("CO2 corrosion");
  }
  if (/\b(sand|erosion|erosive|choke|high velocity)\b/.test(text)) {
    drivers.push("erosion_high_velocity");
    hints.push("Erosion / impingement");
  }
  if (/\b(weld|welded|spool|pipe|fabrication)\b/.test(text)) {
    hints.push("Weldability");
  }
  if (/\b(api\s*6a|wellhead|christmas tree|xmas tree)\b/.test(text)) {
    hints.push("API 6A pressure boundary");
  }

  return {
    ...profile,
    exposureDrivers: uniqueDrivers(drivers),
    exposureHints: uniqueStrings(hints).filter(Boolean) as string[],
  };
}

function refineSelectionForComponent(
  result: SelectionResult,
  cmp: ProjectComponent,
  query: SetupInput,
  projectTally?: ProjectMaterialTally
): SelectionResult {
  const recs = Array.isArray(result?.recommendations)
    ? [...result.recommendations]
    : [];

  if (recs.length <= 1) {
    return {
      ...result,
      query: { ...(result?.query || ({} as SetupInput)), ...query },
    };
  }

  const profile = inferComponentProfile(cmp);
  const ranked = recs
    .map((rec, originalIndex) => {
      const fit = materialFitDelta(rec, profile);
      const diversity = diversityDelta(rec, projectTally, profile);
      const score = numberOrZero(rec?.score);
      return {
        rec,
        originalIndex,
        fit,
        diversity,
        rankingScore: score + fit + diversity,
      };
    })
    .sort((a, b) => {
      if (b.rankingScore !== a.rankingScore)
        return b.rankingScore - a.rankingScore;
      return a.originalIndex - b.originalIndex;
    });

  const recommendations = ranked.map(({ rec, fit, diversity }, index) => {
    const next = { ...rec };
    if (index === 0 && Math.abs(fit + diversity) >= 3) {
      const adjusted = clamp(
        numberOrZero(rec?.score) + fit + diversity,
        0,
        100
      );
      next.score = Math.round(adjusted);
    }
    return next;
  });

  return {
    ...result,
    query: { ...(result?.query || ({} as SetupInput)), ...query },
    recommendations,
  };
}

function materialFitDelta(material: any, profile: ComponentProfile): number {
  const haystack = [
    material?.name,
    material?.astm,
    ...(Array.isArray(material?.tags) ? material.tags : []),
    ...(Array.isArray(material?.keyReasons) ? material.keyReasons : []),
    material?.reasoning,
  ]
    .filter(Boolean)
    .join(" ");

  let delta = 0;
  for (const r of profile.reward) {
    if (r.test(haystack)) delta += 5;
  }
  for (const r of profile.avoid) {
    if (r.test(haystack)) delta -= 7;
  }

  if (profile.role === "flowline" || profile.role === "pipe") {
    if (/weld|pipe|tube|line|clad|duplex|carbon/i.test(haystack)) delta += 4;
    if (/bolting|gasket|trim/i.test(haystack)) delta -= 6;
  }

  if (profile.role === "valve") {
    if (/trim|seat|wear|erosion|galling|hardfacing|pressure/i.test(haystack))
      delta += 4;
  }

  if (profile.role === "fastener") {
    if (/strength|preload|bolting|stud|fastener|galling/i.test(haystack))
      delta += 6;
  }

  return clamp(delta, -14, 14);
}

/* ============================================================
   Project-wide material diversity logic
   ============================================================ */

type ProjectMaterialTally = {
  /** Map of normalized material name → how many other components picked it */
  counts: Map<string, number>;
  /** The most-picked materials, for the LLM prompt and UI chip */
  topPicks: Array<{ name: string; astm: string; count: number }>;
  /** Total components in the project that already have a result */
  totalSelected: number;
};

function buildProjectMaterialTally(
  project: Project,
  excludeComponentId: string
): ProjectMaterialTally {
  const counts = new Map<string, number>();
  const displayNames = new Map<string, { name: string; astm: string }>();
  let totalSelected = 0;

  for (const c of project.components) {
    if (c.id === excludeComponentId) continue;
    const pick = c.result?.recommendations?.[0];
    if (!pick) continue;

    totalSelected++;
    const key = normalizeMaterialName(pick.name);
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!displayNames.has(key)) {
      displayNames.set(key, { name: pick.name, astm: pick.astm });
    }
  }

  const topPicks = Array.from(counts.entries())
    .map(([key, count]) => ({
      ...(displayNames.get(key) || { name: key, astm: "" }),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { counts, topPicks, totalSelected };
}

/**
 * Build the diversity prompt line included in the LLM's `notes` field.
 * The LLM sees this and is asked to actively justify any repeats.
 *
 * Threshold: a material has to be used at least 2× AND account for
 * ≥40% of the project's selected components before it gets flagged.
 * That keeps small projects (3-4 components) from being over-policed.
 */
function buildDiversityPromptLine(
  tally?: ProjectMaterialTally
): string {
  if (!tally || tally.totalSelected < 2) return "";

  const threshold = Math.max(2, Math.ceil(tally.totalSelected * 0.4));
  const overused = tally.topPicks.filter((p) => p.count >= threshold);

  if (overused.length === 0) return "";

  const list = overused.map((p) => `${p.name} (${p.count}×)`).join(", ");

  return (
    `Project context — these materials are already heavily used elsewhere: ${list}. ` +
    `You MAY pick the same alloy for this component, but ONLY if the engineering conditions truly demand it ` +
    `(matched corrosion duty, sour-service requirement, weldability for a single fabrication run). ` +
    `If a comparably-suited alternative exists in the shortlist, prefer it for procurement diversity. ` +
    `When you do repeat an already-used alloy, the reasoning must explicitly justify the repeat.`
  );
}

/**
 * Apply a small score penalty if a candidate is already heavily used
 * elsewhere in the project. Capped so it can't outweigh real fit signals.
 *
 * Rules:
 *  - 0 prior uses + not in profile.avoid → +2 (small diversity boost)
 *  - 1 prior use → 0 (one match is normal)
 *  - 2 prior uses → -2
 *  - 3 prior uses → -4
 *  - 4+ prior uses → -6 (capped)
 *
 * Combined with `materialFitDelta`, fit signals can be ±14 while diversity
 * is bounded at ±6, so a strongly-correct alloy still wins the rerank
 * even if it's been used many times.
 */
function diversityDelta(
  material: any,
  tally: ProjectMaterialTally | undefined,
  profile: ComponentProfile
): number {
  if (!tally || tally.totalSelected < 2) return 0;

  const key = normalizeMaterialName(material?.name || "");
  if (!key) return 0;

  const priorCount = tally.counts.get(key) || 0;

  if (priorCount >= 4) return -6;
  if (priorCount === 3) return -4;
  if (priorCount === 2) return -2;
  if (priorCount === 1) return 0;

  // priorCount === 0 → diversity boost, but only if not explicitly avoided
  const haystack = [
    material?.name,
    material?.astm,
    ...(Array.isArray(material?.tags) ? material.tags : []),
  ]
    .filter(Boolean)
    .join(" ");

  const explicitlyAvoided = profile.avoid.some((r) => r.test(haystack));
  if (explicitlyAvoided) return 0;

  return 2;
}

function normalizeMaterialName(name: string) {
  return String(name || "")
    .toLowerCase()
    .replace(/\b(astm|asme|uns|alloy|grade)\b/g, "")
    .replace(/[\s\-_/]+/g, " ")
    .trim();
}

function parsePressureBar(text: string): number | undefined {
  const psiMatch = text.match(/(\d[\d,]*(?:\.\d+)?)\s*psi\b/i);
  if (psiMatch) {
    const psi = Number(psiMatch[1].replace(/,/g, ""));
    if (Number.isFinite(psi)) return Math.round(psi * 0.0689476);
  }

  const barMatch = text.match(/(\d[\d,]*(?:\.\d+)?)\s*bar\b/i);
  if (barMatch) {
    const bar = Number(barMatch[1].replace(/,/g, ""));
    if (Number.isFinite(bar)) return Math.round(bar);
  }

  return pressureFromClass(text);
}

function pressureFromClass(text: string): number | undefined {
  const classMatch = text.match(/class\s*(150|300|600|900|1500|2500)\b/i);
  if (!classMatch) return undefined;

  const pressureClass = Number(classMatch[1]);
  const classToApproxBar: Record<number, number> = {
    150: 20,
    300: 51,
    600: 102,
    900: 153,
    1500: 255,
    2500: 425,
  };

  return classToApproxBar[pressureClass];
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const s = (typeof value === "string" ? value : "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  return out;
}

function uniqueDrivers(values: ExposureDriver[]): ExposureDriver[] {
  const seen = new Set<string>();
  const out: ExposureDriver[] = [];
  for (const v of values) {
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function numberOrZero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}