"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Save, Play, Trash2, ExternalLink } from "lucide-react";
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
import type {
  Project,
  ProjectComponent,
} from "@/lib/projects-types";
import type { SetupInput, ExposureDriver } from "@/lib/types";

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
    // Reset local state when drawer opens with a different component
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
      // If matches default, delete override (clean UX)
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
    setTimeout(() => onRunOne(), 30); // let the save propagate first
  };

  const overrideCount = Object.keys(overrides).length;

  // Exposure drivers handling
  const currentDrivers =
    (overrides.exposureDrivers || defaults.exposureDrivers || []) as ExposureDriver[];
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-bg/60 backdrop-blur-sm"
          />

          {/* Drawer */}
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
                <ResultView result={component.result} />
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

            {/* Footer */}
            {mode === "edit" && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-fg/10 px-6 py-4">
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
                    <Play className="h-3.5 w-3.5" />
                    {running ? "Running…" : "Save & run"}
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
   EditView — the condition editor
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
      {/* Identity */}
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

      {/* Conditions */}
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
              onChange={(e: any) => setOverride("componentType", e.target.value)}
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
              onChange={(e: any) => setOverride("serviceMedium", e.target.value)}
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

      {/* Exposure drivers */}
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
          {DRIVERS.map(({ value, label }) => {
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

/* ============================================================
   OverrideField — a field with "override/reset" UX
   ============================================================ */
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
   ResultView — embedded results for this single component
   ============================================================ */
function ResultView({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-subtle">
          Top recommendations
        </p>
        <p className="mt-1 text-xs text-muted">
          Tap "Why this" on any card for the full reasoning.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {result.recommendations.slice(0, 3).map((m: any, i: number) => (
          <MaterialCard key={m.id} material={m} rank={i + 1} />
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
    </div>
  );
}
