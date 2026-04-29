"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Play,
  Plus,
  Search,
  Loader2,
  Trash2,
  Info,
  RefreshCw,
} from "lucide-react";
import { useProjectsStore } from "@/lib/projects-store";
import { downloadJson, fileTimestamp } from "@/lib/projects-utils";
import { Button, Card, Input } from "@/components/ui";
import { ComponentRow } from "@/components/projects/component-row";
import { ComponentDrawer } from "@/components/projects/component-drawer";
import { AddComponentsModal } from "@/components/projects/add-components-modal";
import { IntelligenceFeed } from "@/components/projects/intelligence-feed";
import type { ProjectComponent } from "@/lib/projects-types";
import type { SetupInput } from "@/lib/types";

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
  const clearComponentResults = useProjectsStore((s) => s.clearComponentResults);
  const exportProject = useProjectsStore((s) => s.exportProject);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [addOpen, setAddOpen] = useState(false);
  const [openCmpId, setOpenCmpId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
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

  // Run one component against /api/select
  const runOne = async (cmp: ProjectComponent) => {
    if (!project) return;
    setRunningIds((prev) => new Set(prev).add(cmp.id));
    try {
      const merged: SetupInput = {
        // safe fallbacks so Zod doesn't barf
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
        ...(project.defaults as SetupInput),
        ...(cmp.conditions || {}),
        // Add component name to notes so the LLM knows what part this is
        notes: [
          cmp.notes,
          `Component: ${cmp.name}${cmp.quantity && cmp.quantity > 1 ? ` (×${cmp.quantity})` : ""}`,
        ]
          .filter(Boolean)
          .join(" · "),
      };

      const res = await fetch("/api/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      }).then((r) => r.json());

      if (!res.ok) throw new Error(res.error || "Selection failed");
      setComponentResult(project.id, cmp.id, res.data);
    } catch (err: any) {
      console.error("runOne", err);
      alert(`Failed: ${err.message}`);
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(cmp.id);
        return next;
      });
    }
  };

  const runAll = async () => {
    if (!project) return;
    const pending = project.components.filter((c) => !c.result);
    if (pending.length === 0) return;

    // Cap at 3 concurrent calls to respect rate limits
    const CONCURRENCY = 3;
    const queue = [...pending];
    const runners: Promise<void>[] = [];

    const takeNext = async (): Promise<void> => {
      const next = queue.shift();
      if (!next) return;
      await runOne(next);
      return takeNext();
    };

    for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
      runners.push(takeNext());
    }
    await Promise.all(runners);
  };

  const rerunAll = async () => {
    if (!project) return;
    clearComponentResults(project.id);
    setTimeout(() => runAll(), 30);
  };

  const exportBom = () => {
    if (!project) return;
    const payload = exportProject(project.id);
    if (!payload) return;
    const safeName = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    downloadJson(
      payload,
      `drishti-project-${safeName}-${fileTimestamp()}.json`
    );
  };

  // ---------------- Loading / not found states ----------------
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
  const isRunningAny = runningIds.size > 0;

  return (
    <>
      <div className="space-y-6">
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
              <StatChip
                label="Connections"
                value={project.pairs?.length ?? 0}
              />
              <StatChip
                label="Warnings"
                value={project.analysis?.warnings.length ?? "—"}
                tone={
                  (project.analysis?.warnings.length ?? 0) > 0
                    ? "warn"
                    : "default"
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {done > 0 && (
              <Button variant="secondary" size="sm" onClick={rerunAll}>
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
                  Running…
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Run selection {done > 0 && total > done ? `(${total - done} left)` : ""}
                </>
              )}
            </Button>
            <Button variant="secondary" size="sm" onClick={exportBom}>
              <Download className="h-3.5 w-3.5" />
              Export
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

        {/* Three-panel layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* LEFT — components */}
          <motion.aside
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-5"
          >
            <Card
              title={`Components (${total})`}
              description="Tap any to edit, override, or view its result."
              action={
                <Button variant="accent" size="sm" onClick={() => setAddOpen(true)}>
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
                    Add them one by one, paste a list, or describe your system.
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
          </motion.aside>

          {/* CENTER — alloy map placeholder */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="lg:col-span-4"
          >
            <Card
              title="Alloy map"
              description="Visual of component connections and families."
            >
              {done === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-fg/10 py-12 text-center">
                  <Info className="mb-3 h-6 w-6 text-subtle" />
                  <p className="text-sm font-medium text-fg">
                    Map appears after selection
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-muted">
                    Once you run selection, each component gets color-coded by
                    alloy family and grouped by connection.
                  </p>
                </div>
              ) : (
                <AlloyCloud project={project} />
              )}
            </Card>
          </motion.section>

          {/* RIGHT — intelligence */}
          <motion.aside
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <Card
              title="Intelligence"
              description="Connections, warnings, and opportunities."
            >
              <IntelligenceFeed project={project} />
            </Card>
          </motion.aside>
        </div>
      </div>

      {/* Modals */}
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

/* ================================================================== */

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

/* =================== Alloy cloud — simple grouped view =================== */
function AlloyCloud({ project }: { project: any }) {
  // Group components by their top pick's name
  const groups = new Map<string, { name: string; components: any[] }>();
  for (const c of project.components) {
    const pick = c.result?.recommendations?.[0];
    if (!pick) continue;
    const key = pick.name;
    const existing = groups.get(key);
    if (existing) {
      existing.components.push(c);
    } else {
      groups.set(key, { name: pick.name, components: [c] });
    }
  }

  const sorted = Array.from(groups.values()).sort(
    (a, b) => b.components.length - a.components.length
  );

  if (sorted.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-subtle">
        No results yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((g, i) => {
        const pct = Math.round(
          (g.components.length / project.components.length) * 100
        );
        return (
          <div
            key={g.name}
            className="rounded-xl border border-fg/10 bg-fg/[0.02] p-3"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-fg">{g.name}</p>
              <p className="font-tech text-xs text-accent">
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
              {pct}% of components
            </p>
          </div>
        );
      })}
    </div>
  );
}
