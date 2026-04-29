"use client";

import { motion } from "framer-motion";
import {
  Trash2,
  Loader2,
  CheckCircle2,
  Circle,
  ChevronRight,
} from "lucide-react";
import type { ProjectComponent } from "@/lib/projects-types";

export function ComponentRow({
  component,
  overrideCount,
  onOpen,
  onDelete,
  isRunning,
  hideActions,
}: {
  component: ProjectComponent;
  overrideCount: number;
  onOpen: () => void;
  onDelete: () => void;
  isRunning?: boolean;
  hideActions?: boolean;
}) {
  const rec = component.result?.recommendations?.[0];
  const score = rec ? Math.round(rec.score) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="group relative"
    >
      <button
        onClick={onOpen}
        className="focus-ring flex w-full items-center gap-3 rounded-xl border border-fg/10 bg-fg/[0.02] px-3 py-2.5 text-left transition hover:border-fg/20 hover:bg-fg/[0.04]"
      >
        {/* Status dot */}
        <span className="shrink-0">
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
          ) : component.result ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Circle className="h-4 w-4 text-subtle" />
          )}
        </span>

        {/* Name + details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-fg">
              {component.name}
            </p>
            {component.quantity && component.quantity > 1 && (
              <span className="shrink-0 font-tech text-[10px] font-medium text-accent">
                ×{component.quantity}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-subtle">
            {component.notes && (
              <span className="truncate">{component.notes}</span>
            )}
            {overrideCount > 0 && (
              <span className="shrink-0 rounded-full border border-accent/20 bg-accent/5 px-1.5 py-px text-[9px] font-medium text-accent">
                {overrideCount} override{overrideCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {/* Pick + score */}
        {rec && score !== null && (
          <div className="hidden flex-col items-end md:flex">
            <p className="max-w-[140px] truncate text-[11px] font-medium text-fg">
              {rec.name}
            </p>
            <p className="font-tech text-[10px] text-subtle">
              {rec.astm} · {score}
            </p>
          </div>
        )}

        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
      </button>

      {/* Delete button (appears on hover) */}
      {!hideActions && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete component"
          className="focus-ring absolute right-10 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-subtle opacity-0 transition hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
}
