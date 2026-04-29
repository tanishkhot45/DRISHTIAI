"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FolderPlus, Boxes } from "lucide-react";
import { useProjectsStore } from "@/lib/projects-store";
import { Button, Card } from "@/components/ui";
import { ProjectCard } from "@/components/projects/project-card";

export default function ProjectsPage() {
  const projects = useProjectsStore((s) => s.projects);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const sorted = useMemo(
    () =>
      [...projects].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [projects]
  );

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-fg/10 bg-fg/[0.02] p-6 md:p-10"
      >
        <div className="absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]">
          <div className="absolute -top-24 left-10 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-accent2/25 blur-3xl" />
        </div>

        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-subtle">
          Drishti AI — projects
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-fg md:text-5xl">
          Whole-system material selection.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted md:text-base">
          Group components, run consistent selections, and export a combined BOM.
          Projects live for your current session.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link href="/projects/new">
            <Button variant="accent">
              <FolderPlus className="h-4 w-4" />
              New project
            </Button>
          </Link>
          <Link href="/setup">
            <Button variant="ghost" size="sm">
              Quick one-off pick →
            </Button>
          </Link>
        </div>
      </motion.header>

      {/* Project grid */}
      {!hydrated ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-sm text-subtle">Loading…</p>
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {sorted.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                layout
              >
                <ProjectCard project={p} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="text-center">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Boxes className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-fg">
          No projects in this session
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          A project lets you add many components — valves, pipes, flanges, tanks
          — and get consistent material picks across all of them, then export
          a combined BOM.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/projects/new">
            <Button variant="accent">
              <FolderPlus className="h-4 w-4" />
              Create a project
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}