"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Link2,
  ShieldAlert,
  Lightbulb,
  Package,
  AlertTriangle,
} from "lucide-react";
import type { Project } from "@/lib/projects-types";

export function IntelligenceFeed({ project }: { project: Project }) {
  const pairs = project.pairs || [];
  const warnings = project.analysis?.warnings || [];
  const consolidations = project.analysis?.consolidations || [];
  const procurement = project.analysis?.procurement || [];

  const hasAnything =
    pairs.length > 0 ||
    warnings.length > 0 ||
    consolidations.length > 0 ||
    procurement.length > 0;

  if (!hasAnything) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-fg/10 bg-fg/[0.02] p-6 text-center">
        <Lightbulb className="mb-3 h-8 w-8 text-subtle" />
        <p className="font-display text-sm font-semibold text-fg">
          No insights yet
        </p>
        <p className="mt-1 text-xs text-muted">
          Add components and run selections. Drishti will flag galvanic pairs,
          consolidation wins, and procurement opportunities here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Warnings */}
      {warnings.length > 0 && (
        <FeedSection
          title="Warnings"
          icon={<ShieldAlert className="h-3.5 w-3.5" />}
          tone="warn"
        >
          {warnings.map((w) => (
            <FeedItem
              key={w.id}
              severity={w.severity}
              title={w.title}
              detail={w.detail}
              action={w.action}
            />
          ))}
        </FeedSection>
      )}

      {/* Consolidation */}
      {consolidations.length > 0 && (
        <FeedSection
          title="Consolidation"
          icon={<Lightbulb className="h-3.5 w-3.5" />}
          tone="info"
        >
          {consolidations.map((w) => (
            <FeedItem
              key={w.id}
              severity={w.severity}
              title={w.title}
              detail={w.detail}
              action={w.action}
            />
          ))}
        </FeedSection>
      )}

      {/* Procurement */}
      {procurement.length > 0 && (
        <FeedSection
          title="Procurement"
          icon={<Package className="h-3.5 w-3.5" />}
          tone="info"
        >
          {procurement.map((w) => (
            <FeedItem
              key={w.id}
              severity={w.severity}
              title={w.title}
              detail={w.detail}
              action={w.action}
            />
          ))}
        </FeedSection>
      )}

      {/* Pairs — auto-detected */}
      {pairs.length > 0 && (
        <FeedSection
          title={`Detected connections (${pairs.length})`}
          icon={<Link2 className="h-3.5 w-3.5" />}
          tone="default"
        >
          <div className="space-y-1.5">
            {pairs.slice(0, 10).map((p, i) => {
              const a = project.components.find((c) => c.id === p.aId);
              const b = project.components.find((c) => c.id === p.bId);
              if (!a || !b) return null;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-fg/10 bg-fg/[0.02] px-2.5 py-1.5 text-[11px]"
                >
                  <span className="font-mono text-[9px] uppercase tracking-wider text-subtle">
                    {p.kind}
                  </span>
                  <span className="truncate text-fg">{a.name}</span>
                  <span className="text-subtle">↔</span>
                  <span className="truncate text-fg">{b.name}</span>
                </div>
              );
            })}
            {pairs.length > 10 && (
              <p className="px-1 pt-1 text-[10px] text-subtle">
                +{pairs.length - 10} more connections
              </p>
            )}
          </div>
        </FeedSection>
      )}
    </div>
  );
}

/* ================================================================== */

function FeedSection({
  title,
  icon,
  tone,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "warn" | "info" | "default";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "warn"
      ? "text-amber-500"
      : tone === "info"
      ? "text-accent"
      : "text-subtle";
  return (
    <div>
      <p
        className={`mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${toneClass}`}
      >
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function FeedItem({
  severity,
  title,
  detail,
  action,
}: {
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  action?: string;
}) {
  const tones = {
    critical: "border-red-500/30 bg-red-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    info: "border-accent/20 bg-accent/5",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-2 rounded-xl border p-3 ${tones[severity]}`}
    >
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
      {action && (
        <p className="mt-2 text-xs font-medium text-accent">→ {action}</p>
      )}
    </motion.div>
  );
}
