"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Info,
  AlertTriangle,
  DollarSign,
  Flame,
  Wrench,
  Package,
  Award,
  FileWarning,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import type { RejectedMaterial } from "@/lib/types";

/** Map a category to its icon + tone. */
const CATEGORY_META: Record<
  NonNullable<RejectedMaterial["category"]>,
  { icon: React.ComponentType<{ className?: string }>; label: string; tone: string }
> = {
  wrong_form: {
    icon: Wrench,
    label: "Wrong form",
    tone: "text-sky-500 bg-sky-500/10 border-sky-500/30",
  },
  insufficient_corrosion: {
    icon: AlertTriangle,
    label: "Corrosion risk",
    tone: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  },
  cost_overrun: {
    icon: DollarSign,
    label: "Cost overrun",
    tone: "text-rose-500 bg-rose-500/10 border-rose-500/30",
  },
  weldability: {
    icon: Flame,
    label: "Weldability",
    tone: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  },
  temperature: {
    icon: Flame,
    label: "Temperature",
    tone: "text-red-500 bg-red-500/10 border-red-500/30",
  },
  availability: {
    icon: Package,
    label: "Availability",
    tone: "text-violet-500 bg-violet-500/10 border-violet-500/30",
  },
  overkill: {
    icon: Award,
    label: "Overspec",
    tone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  },
  code_scope: {
    icon: FileWarning,
    label: "Code scope",
    tone: "text-indigo-500 bg-indigo-500/10 border-indigo-500/30",
  },
  other: {
    icon: HelpCircle,
    label: "Other",
    tone: "text-slate-500 bg-slate-500/10 border-slate-500/30",
  },
};

export function RejectedList({ items }: { items: RejectedMaterial[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!items?.length) return null;
  const active = activeIdx !== null ? items[activeIdx] : null;

  return (
    <>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((r, i) => {
          const cat = r.category || "other";
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;

          return (
            <li key={i}>
              <button
                onClick={() => setActiveIdx(i)}
                className="focus-ring group relative flex w-full items-start gap-3 rounded-xl border border-fg/10 bg-fg/[0.02] px-3 py-2.5 text-left transition hover:border-fg/20 hover:bg-fg/[0.04]"
              >
                {/* Category chip */}
                <div
                  className={[
                    "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
                    meta.tone,
                  ].join(" ")}
                  title={meta.label}
                >
                  <Icon className="h-3 w-3" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-fg">{r.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                    {r.reason}
                  </p>
                </div>

                {/* Hover affordance */}
                <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-subtle opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Detail modal */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveIdx(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="glass relative w-full max-w-lg rounded-2xl p-6 shadow-glow"
            >
              {/* Close */}
              <button
                onClick={() => setActiveIdx(null)}
                aria-label="Close"
                className="focus-ring absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-fg/[0.05] text-muted transition hover:bg-fg/[0.1] hover:text-fg"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Category badge */}
              {(() => {
                const cat = active.category || "other";
                const meta = CATEGORY_META[cat];
                const Icon = meta.icon;
                return (
                  <div
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em]",
                      meta.tone,
                    ].join(" ")}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </div>
                );
              })()}

              <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.02em] text-fg">
                {active.name}
              </h3>

              <p className="mt-2 text-sm text-muted">{active.reason}</p>

              {/* Detail prose */}
              <div className="mt-5 rounded-xl border border-fg/10 bg-fg/[0.02] p-4">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
                  <Info className="h-3 w-3" />
                  Why it didn't make the cut
                </p>
                <p className="text-sm leading-relaxed text-fg/90">
                  {active.detail ||
                    "No further engineering detail was generated for this item."}
                </p>
              </div>

              <p className="mt-4 text-[11px] text-subtle">
                This is an engineering judgment — always validate against your
                project's specific codes and constraints.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}