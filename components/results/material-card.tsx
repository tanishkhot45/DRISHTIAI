"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  BookOpen,
  GitCompare,
  Check,
  Sparkles,
} from "lucide-react";
import type { MaterialRow } from "@/lib/types";
import { Pill } from "@/components/ui";
import { prettyLabel } from "@/lib/utils";
import { useSpecStore } from "@/lib/store";

export function MaterialCard({
  material,
  rank,
  onExplain,
}: {
  material: MaterialRow;
  rank: number;
  onExplain?: () => void;
}) {
  const compareIds = useSpecStore((s) => s.compareIds);
  const toggleCompare = useSpecStore((s) => s.toggleCompare);
  const isCompared = compareIds.includes(material.id);
  const canAdd = compareIds.length < 4 || isCompared;

  const score = Math.round(material.score);
  const astmOk = material.astmCompliant;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: rank * 0.06 }}
      className={[
        "glass group relative overflow-hidden rounded-2xl p-5 shadow-glow transition hover:-translate-y-0.5 hover:shadow-accent-glow",
        isCompared ? "ring-2 ring-accent/50" : "",
      ].join(" ")}
    >
      {/* Rank + score */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-subtle">
            Rank #{rank}
          </p>
          <h3 className="mt-1 truncate font-display text-xl font-semibold tracking-[-0.02em] text-fg">
            {material.name}
          </h3>
          <p className="font-tech text-xs text-muted">{material.astm}</p>
        </div>
        <ScoreRing score={score} />
      </div>

      {/* Standout tagline — the one-line differentiator */}
      {material.standout && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">
          <Sparkles className="h-2.5 w-2.5" />
          {material.standout}
        </div>
      )}

      {/* Reasons */}
      <ul className="mb-4 space-y-1.5">
        {material.keyReasons.slice(0, 4).map((r, i) => (
          <li key={i} className="flex gap-2 text-xs text-muted">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent" />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      {/* Tags */}
      {material.tags?.length ? (
        <div className="mb-4 flex flex-wrap gap-1">
          {material.tags.slice(0, 5).map((t) => (
            <Pill key={t}>{prettyLabel(t)}</Pill>
          ))}
        </div>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-fg/10 pt-3">
        {/* Left — ASTM badge */}
        <div className="flex min-w-0 items-center gap-1.5">
          {astmOk === undefined ? null : astmOk ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">ASTM compliant</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-500 dark:text-amber-400">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">ASTM: verify</span>
            </span>
          )}
        </div>

        {/* Right — action buttons */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => toggleCompare(material.id)}
            aria-label={isCompared ? "Remove from compare" : "Add to compare"}
            className={[
              "focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition disabled:opacity-40",
              isCompared
                ? "bg-accent/15 text-accent"
                : "text-muted hover:bg-fg/[0.05] hover:text-fg",
            ].join(" ")}
          >
            {isCompared ? (
              <Check className="h-3 w-3" />
            ) : (
              <GitCompare className="h-3 w-3" />
            )}
            {isCompared ? "Added" : "Compare"}
          </button>

          {onExplain && (
            <button
              type="button"
              onClick={onExplain}
              className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-muted transition hover:bg-fg/[0.05] hover:text-fg"
            >
              <BookOpen className="h-3 w-3" />
              Why this
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const tone =
    score >= 80 ? "text-emerald-500" : score >= 60 ? "text-accent" : "text-amber-500";

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
      <svg className="absolute inset-0" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-fg/10"
        />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={tone}
          transform="rotate(-90 22 22)"
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <span className="font-tech text-xs font-semibold text-fg">{score}</span>
    </div>
  );
}