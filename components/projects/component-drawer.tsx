"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  RotateCcw,
  Save,
  Play,
  Trash2,
  GitCompare,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { MaterialCard } from "@/components/results/material-card";
import {
  DOMAIN,
  ENVIRONMENT,
  COMPONENT,
  CRITICALITY,
  SERVICE,
  LIFE,
  DRIVERS,
} from "@/components/setup/options";
import type { Project, ProjectComponent } from "@/lib/projects-types";
import type {
  MaterialRow,
  SelectionResult,
  SetupInput,
  ExposureDriver,
} from "@/lib/types";

type Mode = "edit" | "result";

export function ComponentDrawer({
  project,
  component,
  open,
  onClose,
  onSave,
  onDelete,
  onRunOne,
  running,
}: {
  project: Project;
  component: ProjectComponent | null;
  open: boolean;
  onClose: () => void;
  onSave: (patch: Partial<ProjectComponent>) => void;
  onDelete: () => void;
  onRunOne: () => void;
  running?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("edit");

  // Local edit buffer
  const [name, setName] = useState(component?.name || "");
  const [quantity, setQuantity] = useState<string>(
    component?.quantity ? String(component.quantity) : "1"
  );
  const [notes, setNotes] = useState(component?.notes || "");
  const [overrides, setOverrides] = useState<Partial<SetupInput>>(
    component?.conditions || {}
  );

  useEffect(() => {
    if (component) {
      setName(component.name);
      setQuantity(component.quantity ? String(component.quantity) : "1");
      setNotes(component.notes || "");
      setOverrides(component.conditions || {});
      setMode(component.result ? "result" : "edit");
    }
  }, [component?.id]);

  const defaults = project.defaults;
  const merged = useMemo(
    () => ({ ...defaults, ...overrides }) as SetupInput,
    [defaults, overrides]
  );

  const isOverridden = (key: keyof SetupInput) =>
    overrides[key] !== undefined && overrides[key] !== null;

  const setOverride = (key: keyof SetupInput, value: any) => {
    setOverrides((prev) => {
      const next = { ...prev };
      const defaultValue = (defaults as any)[key];
      if (
        value === defaultValue ||
        (Array.isArray(value) &&
          Array.isArray(defaultValue) &&
          value.length === defaultValue.length &&
          value.every((v, i) => v === defaultValue[i]))
      ) {
        delete (next as any)[key];
      } else {
        (next as any)[key] = value;
      }
      return next;
    });
  };

  const resetField = (key: keyof SetupInput) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete (next as any)[key];
      return next;
    });
  };

  const save = () => {
    if (!component) return;
    const qty = parseInt(quantity, 10);
    onSave({
      name: name.trim() || "Untitled component",
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      notes: notes.trim() || undefined,
      conditions: Object.keys(overrides).length > 0 ? overrides : undefined,
    });
  };

  const handleRun = () => {
    save();
    setTimeout(() => onRunOne(), 30);
  };

  const overrideCount = Object.keys(overrides).length;

  const currentDrivers = (overrides.exposureDrivers ||
    defaults.exposureDrivers ||
    []) as ExposureDriver[];
  const toggleDriver = (d: ExposureDriver) => {
    const next = currentDrivers.includes(d)
      ? currentDrivers.filter((x) => x !== d)
      : [...currentDrivers, d];
    setOverride("exposureDrivers", next);
  };

  return (
    <AnimatePresence>
      {open && component && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-bg/60 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-fg/10 bg-bg shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-fg/10 px-6 py-4">
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-subtle">
                  Component
                </p>
                <h3 className="truncate font-display text-lg font-semibold tracking-[-0.02em] text-fg">
                  {component.name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {component.result && (
                  <div className="flex items-center rounded-full border border-fg/10 bg-fg/[0.03] p-0.5 text-xs">
                    <button
                      onClick={() => setMode("edit")}
                      className={[
                        "rounded-full px-3 py-1 transition",
                        mode === "edit"
                          ? "bg-fg text-bg"
                          : "text-muted hover:text-fg",
                      ].join(" ")}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setMode("result")}
                      className={[
                        "rounded-full px-3 py-1 transition",
                        mode === "result"
                          ? "bg-fg text-bg"
                          : "text-muted hover:text-fg",
                      ].join(" ")}
                    >
                      Result
                    </button>
                  </div>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="focus-ring flex h-8 w-8 items-center justify-center rounded-full bg-fg/[0.05] text-muted transition hover:bg-fg/[0.1] hover:text-fg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {mode === "result" && component.result ? (
                <ResultView result={component.result} component={component} />
              ) : (
                <EditView
                  name={name}
                  setName={setName}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  notes={notes}
                  setNotes={setNotes}
                  overrides={overrides}
                  merged={merged}
                  defaults={defaults}
                  isOverridden={isOverridden}
                  setOverride={setOverride}
                  resetField={resetField}
                  currentDrivers={currentDrivers}
                  toggleDriver={toggleDriver}
                />
              )}
            </div>

            {/* Footer — extra right padding to clear the floating chatbot */}
{mode === "edit" && (
  <div className="flex shrink-0 items-center justify-between gap-3 border-t border-fg/10 px-6 py-4 pr-24">
                <div className="flex items-center gap-2 text-xs text-subtle">
                  {overrideCount > 0 ? (
                    <>
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                      <span>
                        {overrideCount} condition override
                        {overrideCount === 1 ? "" : "s"}
                      </span>
                    </>
                  ) : (
                    <span>Using project defaults</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onDelete}
                    className="focus-ring flex h-9 w-9 items-center justify-center rounded-full text-subtle transition hover:bg-red-500/10 hover:text-red-500"
                    aria-label="Delete component"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Button variant="secondary" size="sm" onClick={save}>
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </Button>
          <Button
  variant="accent"
  size="sm"
  onClick={handleRun}
  disabled={running}
>
  {running ? (
    <>
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Running…
    </>
  ) : component?.result ? (
    <>
      <RefreshCw className="h-3.5 w-3.5" />
      Save & re-run
    </>
  ) : (
    <>
      <Play className="h-3.5 w-3.5" />
      Save & run
    </>
  )}
</Button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   EditView
   ============================================================ */
function EditView({
  name,
  setName,
  quantity,
  setQuantity,
  notes,
  setNotes,
  overrides,
  merged,
  defaults,
  isOverridden,
  setOverride,
  resetField,
  currentDrivers,
  toggleDriver,
}: any) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-subtle">
          Identity
        </p>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e: any) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e: any) => setQuantity(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e: any) => setNotes(e.target.value)}
              placeholder="Optional detail"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-subtle">
            Service conditions
          </p>
          <p className="text-[10px] text-subtle">
            Inherited from project · override any field
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <OverrideField
            label="Domain"
            overridden={isOverridden("domain")}
            onReset={() => resetField("domain")}
          >
            <Select
              value={merged.domain}
              onChange={(e: any) => setOverride("domain", e.target.value)}
            >
              {DOMAIN.map((x: string) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </OverrideField>
          <OverrideField
            label="Environment"
            overridden={isOverridden("environment")}
            onReset={() => resetField("environment")}
          >
            <Select
              value={merged.environment}
              onChange={(e: any) => setOverride("environment", e.target.value)}
            >
              {ENVIRONMENT.map((x: string) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </OverrideField>
          <OverrideField
            label="Component type"
            overridden={isOverridden("componentType")}
            onReset={() => resetField("componentType")}
          >
            <Select
              value={merged.componentType || "Other"}
              onChange={(e: any) =>
                setOverride("componentType", e.target.value)
              }
            >
              {COMPONENT.map((x: string) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </OverrideField>
          <OverrideField
            label="Criticality"
            overridden={isOverridden("criticality")}
            onReset={() => resetField("criticality")}
          >
            <Select
              value={merged.criticality}
              onChange={(e: any) => setOverride("criticality", e.target.value)}
            >
              {CRITICALITY.map((x: string) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </OverrideField>
          <OverrideField
            label="Service medium"
            overridden={isOverridden("serviceMedium")}
            onReset={() => resetField("serviceMedium")}
          >
            <Select
              value={merged.serviceMedium}
              onChange={(e: any) =>
                setOverride("serviceMedium", e.target.value)
              }
            >
              {SERVICE.map((x: string) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </OverrideField>
          <OverrideField
            label="Design life"
            overridden={isOverridden("designLife")}
            onReset={() => resetField("designLife")}
          >
            <Select
              value={merged.designLife}
              onChange={(e: any) => setOverride("designLife", e.target.value)}
            >
              {LIFE.map((x: string) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </OverrideField>
          <OverrideField
            label="Min temp (°C)"
            overridden={isOverridden("minTempC")}
            onReset={() => resetField("minTempC")}
          >
            <Input
              type="number"
              value={merged.minTempC ?? ""}
              onChange={(e: any) =>
                setOverride("minTempC", Number(e.target.value) || 0)
              }
            />
          </OverrideField>
          <OverrideField
            label="Max temp (°C)"
            overridden={isOverridden("maxTempC")}
            onReset={() => resetField("maxTempC")}
          >
            <Input
              type="number"
              value={merged.maxTempC ?? ""}
              onChange={(e: any) =>
                setOverride("maxTempC", Number(e.target.value) || 0)
              }
            />
          </OverrideField>
          <OverrideField
            label="Design pressure (bar)"
            overridden={isOverridden("designPressureBar")}
            onReset={() => resetField("designPressureBar")}
          >
            <Input
              type="number"
              value={merged.designPressureBar ?? ""}
              onChange={(e: any) => {
                const v = e.target.value;
                setOverride(
                  "designPressureBar",
                  v === "" ? null : Number(v) || 0
                );
              }}
              placeholder="Optional"
            />
          </OverrideField>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-subtle">
            Exposure drivers
          </p>
          {overrides.exposureDrivers !== undefined && (
            <button
              onClick={() => resetField("exposureDrivers")}
              className="flex items-center gap-1 text-[10px] text-accent hover:underline"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              Reset to project
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DRIVERS.map(({ value, label }: any) => {
            const active = currentDrivers.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleDriver(value)}
                className={[
                  "focus-ring rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                  active
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-fg/10 bg-fg/[0.02] text-muted hover:bg-fg/[0.06] hover:text-fg",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function OverrideField({
  label,
  overridden,
  onReset,
  children,
}: {
  label: string;
  overridden: boolean;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>
          {label}
          {overridden && (
            <span className="ml-1.5 inline-flex items-center rounded-full bg-accent/10 px-1.5 py-px text-[9px] font-semibold text-accent">
              OVR
            </span>
          )}
        </Label>
        {overridden && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[10px] text-accent hover:underline"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            Reset
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/* ============================================================
   ResultView — wires up "Why this" + a self-contained compare bar
   ============================================================ */
function ResultView({
  result,
  component,
}: {
  result: SelectionResult;
  component: ProjectComponent;
}) {
  const [explainTarget, setExplainTarget] = useState<MaterialRow | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const recs = result.recommendations || [];

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const compareItems = compareIds
    .map((id) => recs.find((r) => r.id === id))
    .filter((x): x is MaterialRow => Boolean(x));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-subtle">
    Top recommendations
  </p>
  {compareIds.length >= 2 && (
    <Button
      variant="accent"
      size="sm"
      onClick={() => setShowCompare(true)}
    >
      <GitCompare className="h-3.5 w-3.5" />
      Compare {compareIds.length}
    </Button>
  )}
</div>

      <div className="grid grid-cols-1 gap-4">
        {recs.slice(0, 5).map((m, i) => (
          <DrawerMaterialCard
            key={m.id}
            material={m}
            rank={i + 1}
            isCompared={compareIds.includes(m.id)}
            canCompare={compareIds.length < 4 || compareIds.includes(m.id)}
            onToggleCompare={() => toggleCompare(m.id)}
            onExplain={() => setExplainTarget(m)}
          />
        ))}
      </div>

      {result.modelNotes && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs text-muted">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
            Assumptions
          </p>
          {result.modelNotes}
        </div>
      )}

      {/* Why this — explanation modal */}
      <AnimatePresence>
        {explainTarget && (
          <ExplainModal
            material={explainTarget}
            component={component}
            onClose={() => setExplainTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Compare modal */}
      <AnimatePresence>
        {showCompare && compareItems.length >= 2 && (
          <CompareModal
            items={compareItems}
            onClose={() => setShowCompare(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   DrawerMaterialCard — local, self-contained card with
   compare + why this wired to PROPS, not the global store.
   The global store's compare flow expects a single result; we
   want compare scoped to this drawer/component, so we don't use it.
   ============================================================ */
function DrawerMaterialCard({
  material,
  rank,
  isCompared,
  canCompare,
  onToggleCompare,
  onExplain,
}: {
  material: MaterialRow;
  rank: number;
  isCompared: boolean;
  canCompare: boolean;
  onToggleCompare: () => void;
  onExplain: () => void;
}) {
  const score = Math.round(material.score);
  const astmOk = material.astmCompliant;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.04 }}
      className={[
        "glass relative overflow-hidden rounded-2xl p-4 transition",
        isCompared ? "ring-2 ring-accent/50" : "",
      ].join(" ")}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-subtle">
            Rank #{rank}
          </p>
          <h3 className="mt-1 truncate font-display text-base font-semibold tracking-[-0.02em] text-fg">
            {material.name}
          </h3>
          <p className="font-tech text-[11px] text-muted">{material.astm}</p>
        </div>
        <div className="text-right">
          <p className="font-tech text-2xl font-semibold text-accent">
            {score}
          </p>
          <p className="font-tech text-[10px] text-subtle">/100</p>
        </div>
      </div>

      {material.standout && (
        <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">
          {material.standout}
        </div>
      )}

      <ul className="mb-3 space-y-1">
        {(material.keyReasons || []).slice(0, 3).map((r, i) => (
          <li key={i} className="flex gap-2 text-[11px] text-muted">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent" />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-fg/10 pt-2.5">
        <span className="text-[11px]">
          {astmOk === undefined ? null : astmOk ? (
            <span className="text-emerald-500">ASTM compliant</span>
          ) : (
            <span className="text-amber-500">ASTM: verify</span>
          )}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canCompare}
            onClick={onToggleCompare}
            className={[
              "focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition disabled:opacity-40",
              isCompared
                ? "bg-accent/15 text-accent"
                : "text-muted hover:bg-fg/[0.05] hover:text-fg",
            ].join(" ")}
          >
            <GitCompare className="h-3 w-3" />
            {isCompared ? "Added" : "Compare"}
          </button>
          <button
            type="button"
            onClick={onExplain}
            className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-muted transition hover:bg-fg/[0.05] hover:text-fg"
          >
            Why this
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

/* ============================================================
   ExplainModal — full reasoning for one pick, grounded in
   the component's actual conditions
   ============================================================ */
function ExplainModal({
  material,
  component,
  onClose,
}: {
  material: MaterialRow;
  component: ProjectComponent;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 6 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="glass relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 shadow-glow"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="focus-ring absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-fg/[0.05] text-muted transition hover:bg-fg/[0.1] hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-subtle">
          Why this material
        </p>
        <h3 className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] text-fg">
          {material.name}
        </h3>
        <p className="mt-1 font-tech text-xs text-muted">
          {material.astm} · Score {Math.round(material.score)}/100
        </p>

        <div className="mt-4 rounded-xl border border-fg/10 bg-fg/[0.02] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
            For component
          </p>
          <p className="mt-1 text-sm font-medium text-fg">{component.name}</p>
          {component.notes && (
            <p className="mt-0.5 text-xs text-muted">{component.notes}</p>
          )}
        </div>

        {material.reasoning ? (
          <div className="mt-5 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
              Engineering reasoning
            </p>
            <div className="space-y-2.5 text-sm leading-relaxed text-fg/90">
              {material.reasoning
                .split(/\n\n+/)
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
              Key reasons
            </p>
            <ul className="mt-2 space-y-1.5">
              {(material.keyReasons || []).map((r, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

       

        {material.astmNotes && (
          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-500">
              ASTM note
            </p>
            {material.astmNotes}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
   CompareModal — side-by-side for 2-4 picks
   ============================================================ */
function CompareModal({
  items,
  onClose,
}: {
  items: MaterialRow[];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 6 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="glass relative max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl p-6 shadow-glow"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="focus-ring absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-fg/[0.05] text-muted transition hover:bg-fg/[0.1] hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-subtle">
          Side-by-side comparison
        </p>
        <h3 className="mt-1 font-display text-xl font-semibold tracking-[-0.02em] text-fg">
          {items.length} candidates
        </h3>

        <div
          className="mt-5 grid gap-3 overflow-y-auto pr-2"
          style={{
            maxHeight: "70vh",
            gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          }}
        >
          {items.map((m) => (
            <article
              key={m.id}
              className="rounded-xl border border-fg/10 bg-fg/[0.02] p-3"
            >
              <h4 className="truncate font-display text-sm font-semibold text-fg">
                {m.name}
              </h4>
              <p className="font-tech text-[10px] text-muted">{m.astm}</p>
              <p className="mt-2 font-tech text-2xl font-bold text-accent">
                {Math.round(m.score)}
                <span className="ml-1 text-[10px] text-subtle">/100</span>
              </p>

              {m.standout && (
                <div className="mt-2 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  {m.standout}
                </div>
              )}

              <div className="mt-3 space-y-1.5">
                {(m.keyReasons || []).slice(0, 4).map((r, i) => (
                  <p key={i} className="flex gap-1.5 text-[11px] text-muted">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    <span>{r}</span>
                  </p>
                ))}
              </div>

              {m.tags && m.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {m.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-fg/10 bg-fg/[0.03] px-1.5 py-px text-[9px] text-subtle"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
