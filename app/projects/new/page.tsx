"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, FolderPlus, Info } from "lucide-react";
import { useProjectsStore } from "@/lib/projects-store";
import {
  DOMAIN,
  ENVIRONMENT,
  CRITICALITY,
  SERVICE,
  LIFE,
} from "@/components/setup/options";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import Link from "next/link";
import type { ProjectDefaults } from "@/lib/projects-types";

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useProjectsStore((s) => s.createProject);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaults, setDefaults] = useState<ProjectDefaults>({
    domain: "Oil & Gas",
    environment: "Industrial plant",
    criticality: "Medium",
    minTempC: 20,
    maxTempC: 80,
    serviceMedium: "Unknown",
    designLife: "10–25",
    exposureDrivers: [],
  });

  const set = (patch: Partial<ProjectDefaults>) =>
    setDefaults((d) => ({ ...d, ...patch }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const project = createProject({
      name,
      description: description || undefined,
      defaults,
    });
    router.push(`/projects/${project.id}`);
  };

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

        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs text-subtle transition hover:text-fg"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to projects
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-fg md:text-4xl">
          New project
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Name your project and set the default conditions most components will
          share. You can override per-component after.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.05 }}
      >
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* LEFT — identity */}
          <div className="space-y-4 lg:col-span-7">
            <Card title="Project identity" description="What is this?">
              <div className="space-y-3">
                <div>
                  <Label>Project name</Label>
                  <Input
                    autoFocus
                    placeholder="e.g. Offshore platform — Block 7A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. North Sea, 25-year design life, manifold scope"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card
              title="Default service conditions"
              description="Applied to every component unless overridden."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label>Domain</Label>
                  <Select
                    value={defaults.domain}
                    onChange={(e) => set({ domain: e.target.value as any })}
                  >
                    {DOMAIN.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Environment</Label>
                  <Select
                    value={defaults.environment}
                    onChange={(e) => set({ environment: e.target.value as any })}
                  >
                    {ENVIRONMENT.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Service medium</Label>
                  <Select
                    value={defaults.serviceMedium}
                    onChange={(e) => set({ serviceMedium: e.target.value as any })}
                  >
                    {SERVICE.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Criticality</Label>
                  <Select
                    value={defaults.criticality}
                    onChange={(e) => set({ criticality: e.target.value as any })}
                  >
                    {CRITICALITY.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Min temperature (°C)</Label>
                  <Input
                    type="number"
                    value={defaults.minTempC ?? ""}
                    onChange={(e) =>
                      set({ minTempC: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>Max temperature (°C)</Label>
                  <Input
                    type="number"
                    value={defaults.maxTempC ?? ""}
                    onChange={(e) =>
                      set({ maxTempC: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>Design life</Label>
                  <Select
                    value={defaults.designLife}
                    onChange={(e) => set({ designLife: e.target.value as any })}
                  >
                    {LIFE.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT — actions */}
          <aside className="space-y-4 lg:col-span-5">
            <Card title="Create project">
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="accent"
                  disabled={!name.trim()}
                  className="flex-1"
                >
                  <FolderPlus className="h-4 w-4" />
                  Create
                </Button>
                <Link href="/projects">
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </Link>
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs text-subtle">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                Projects are saved locally in your browser. Export as JSON to
                share or back up.
              </p>
            </Card>

            <Card title="What happens next">
              <ol className="space-y-2 text-xs text-muted">
                {[
                  "Add components (type, paste CSV, or describe your system).",
                  "Review conditions per component, override where needed.",
                  "Run selection once — every component gets a material.",
                  "Review cross-component warnings (galvanic, consolidation).",
                  "Export a project BOM for your client or team.",
                ].map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-tech text-accent">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </aside>
        </form>
      </motion.div>
    </div>
  );
}
