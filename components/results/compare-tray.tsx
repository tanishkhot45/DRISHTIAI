"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitCompare } from "lucide-react";
import { useSpecStore } from "@/lib/store";
import { Button } from "@/components/ui";

export function CompareTray() {
  const compareIds = useSpecStore((s) => s.compareIds);
  const toggleCompare = useSpecStore((s) => s.toggleCompare);
  const clearCompare = useSpecStore((s) => s.clearCompare);
  const lastResult = useSpecStore((s) => s.lastResult);

  return (
    <AnimatePresence>
      {compareIds.length > 0 && (
        <motion.div
  initial={{ y: 120, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: 120, opacity: 0 }}
  transition={{ type: "spring", damping: 22, stiffness: 240 }}
  className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:bottom-6 z-40 px-3 sm:px-4 pointer-events-none"
>
  <div className="mx-auto w-full max-w-[calc(100vw-5.5rem)] sm:max-w-[calc(100vw-2rem)] md:w-fit md:min-w-[460px]">
    <div className="glass pointer-events-auto rounded-2xl px-4 py-3 sm:px-5 sm:py-4 shadow-glow">
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[auto,minmax(0,1fr),auto] md:items-center">
        <div className="flex items-center gap-2 shrink-0 md:justify-self-start">
          <GitCompare className="h-4 w-4 text-accent" />
          <span className="font-display text-sm font-semibold text-fg">
            Compare
          </span>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 font-tech text-[10px] font-medium text-accent">
            {compareIds.length}/4
          </span>
        </div>

        <div className="hidden min-w-0 items-center justify-center gap-1.5 md:flex">
          {compareIds.map((id) => {
            const m = lastResult?.recommendations.find((r) => r.id === id);
            if (!m) return null;

            return (
              <div
                key={id}
                className="flex items-center gap-1.5 rounded-full border border-fg/10 bg-fg/[0.03] py-1 pl-2.5 pr-1.5 text-[11px]"
              >
                <span className="max-w-[130px] truncate text-fg">
                  {m.name}
                </span>
                <button
                  onClick={() => toggleCompare(id)}
                  className="focus-ring flex h-5 w-5 items-center justify-center rounded-full text-subtle hover:bg-fg/[0.1] hover:text-fg"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex w-full items-center justify-between gap-2 md:w-auto md:justify-self-end">
          <button
            onClick={clearCompare}
            className="focus-ring text-xs text-subtle transition hover:text-fg"
          >
            Clear
          </button>

          <Link href="/compare" className="shrink-0">
            <Button
              variant="accent"
              size="sm"
              disabled={compareIds.length < 2}
            >
              Compare →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  </div>
</motion.div>
      )}
    </AnimatePresence>
  );
}