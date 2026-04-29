"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock, Boxes, Trash2, Download } from "lucide-react";
import type { Project } from "@/lib/projects-types";
import { useProjectsStore } from "@/lib/projects-store";
import { downloadJson, fileTimestamp } from "@/lib/projects-utils";

export function ProjectCard({ project }: { project: Project }) {
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const exportProject = useProjectsStore((s) => s.exportProject);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    deleteProject(project.id);
  };

  const handleExport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = exportProject(project.id);
    if (payload) {
      const safeName = project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      downloadJson(payload, `drishti-project-${safeName}-${fileTimestamp()}.json`);
    }
  };

  const updated = new Date(project.updatedAt);
  const runCount = project.components.filter((c) => !!c.result).length;
  const runPercent =
    project.components.length > 0
      ? Math.round((runCount / project.components.length) * 100)
      : 0;

  return (
    <Link href={`/projects/${project.id}`}>
      <article className="glass group relative flex h-full flex-col overflow-hidden rounded-2xl p-5 shadow-glow transition hover:-translate-y-0.5 hover:shadow-accent-glow">
        {/* Title */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg font-semibold tracking-[-0.02em] text-fg">
              {project.name}
            </h3>
            {project.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Stat
            icon={<Boxes className="h-3 w-3" />}
            label="Components"
            value={project.components.length}
          />
          <Stat
            icon={null}
            label="Warnings"
            value={project.analysis?.warnings.length ?? "—"}
            tone={
              (project.analysis?.warnings.length ?? 0) > 0 ? "warn" : "default"
            }
          />
          <Stat
            icon={null}
            label="Runs"
            value={
              project.components.length
                ? `${runCount}/${project.components.length}`
                : "—"
            }
            tone={runPercent === 100 ? "good" : "default"}
          />
        </div>

        {/* Timestamp */}
        <div className="mt-auto flex items-center justify-between border-t border-fg/10 pt-3 text-[11px] text-subtle">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {updated.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}{" "}
            · {updated.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </span>

          {/* Action buttons on hover */}
          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={handleExport}
              aria-label="Export project"
              className="focus-ring flex h-6 w-6 items-center justify-center rounded-full text-subtle hover:bg-fg/[0.05] hover:text-fg"
            >
              <Download className="h-3 w-3" />
            </button>
            <button
              onClick={handleDelete}
              aria-label={confirming ? "Confirm delete" : "Delete project"}
              className={[
                "focus-ring flex items-center justify-center rounded-full transition",
                confirming
                  ? "h-6 bg-red-500/15 px-2 text-[10px] font-medium text-red-500 hover:bg-red-500/25"
                  : "h-6 w-6 text-subtle hover:bg-red-500/10 hover:text-red-500",
              ].join(" ")}
            >
              {confirming ? (
                "Confirm"
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
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
    <div className="rounded-lg border border-fg/10 bg-fg/[0.02] p-2">
      <p className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.12em] text-subtle">
        {icon}
        {label}
      </p>
      <p className={`mt-1 font-tech text-sm font-semibold ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
