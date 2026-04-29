"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ComponentPair,
  Project,
  ProjectAnalysis,
  ProjectComponent,
  ProjectDefaults,
  ProjectExport,
} from "@/lib/projects-types";
import type { SelectionResult } from "@/lib/types";
import { detectPairs, uid } from "@/lib/projects-utils";

type State = {
  projects: Project[];

  // CRUD
  createProject: (input: {
    name: string;
    description?: string;
    defaults?: ProjectDefaults;
  }) => Project;
  renameProject: (id: string, name: string, description?: string) => void;
  updateDefaults: (id: string, defaults: ProjectDefaults) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;

  // Components
  addComponents: (
    projectId: string,
    items: Array<{
      name: string;
      quantity?: number;
      notes?: string;
      conditions?: ProjectComponent["conditions"];
    }>
  ) => ProjectComponent[];
  updateComponent: (
    projectId: string,
    componentId: string,
    patch: Partial<ProjectComponent>
  ) => void;
  deleteComponent: (projectId: string, componentId: string) => void;
  setComponentResult: (
    projectId: string,
    componentId: string,
    result: SelectionResult
  ) => void;
  clearComponentResults: (projectId: string) => void;

  // Analysis
  setAnalysis: (projectId: string, analysis: ProjectAnalysis | null) => void;

  // Pair detection (called after add/delete)
  refreshPairs: (projectId: string) => void;

  // Import/export
  exportProject: (projectId: string) => ProjectExport | null;
  importProject: (data: unknown) => Project | null;
};

const nowIso = () => new Date().toISOString();

const touch = (p: Project): Project => ({ ...p, updatedAt: nowIso() });

export const useProjectsStore = create<State>()(
  persist(
    (set, get) => ({
      projects: [],

      /* -------------------- PROJECT CRUD -------------------- */

      createProject: ({ name, description, defaults = {} }) => {
        const project: Project = {
          id: uid("proj"),
          name: name.trim() || "Untitled project",
          description: description?.trim() || undefined,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          defaults,
          components: [],
          analysis: null,
          pairs: [],
        };
        set({ projects: [project, ...get().projects] });
        return project;
      },

      renameProject: (id, name, description) => {
        set({
          projects: get().projects.map((p) =>
            p.id === id
              ? touch({ ...p, name: name.trim() || p.name, description })
              : p
          ),
        });
      },

      updateDefaults: (id, defaults) => {
        set({
          projects: get().projects.map((p) =>
            p.id === id ? touch({ ...p, defaults: { ...p.defaults, ...defaults } }) : p
          ),
        });
      },

      deleteProject: (id) => {
        set({ projects: get().projects.filter((p) => p.id !== id) });
      },

      getProject: (id) => get().projects.find((p) => p.id === id),

      /* -------------------- COMPONENTS -------------------- */

      addComponents: (projectId, items) => {
        const created: ProjectComponent[] = items.map((it) => ({
          id: uid("cmp"),
          name: it.name.trim() || "Untitled component",
          quantity: it.quantity,
          notes: it.notes,
          conditions: it.conditions,
          result: null,
        }));

        set({
          projects: get().projects.map((p) => {
            if (p.id !== projectId) return p;
            const nextComponents = [...p.components, ...created];
            const nextPairs = detectPairs(nextComponents);
            return touch({
              ...p,
              components: nextComponents,
              pairs: nextPairs,
              analysis: null, // invalidate analysis after structural change
            });
          }),
        });

        return created;
      },

      updateComponent: (projectId, componentId, patch) => {
        set({
          projects: get().projects.map((p) => {
            if (p.id !== projectId) return p;
            const nextComponents = p.components.map((c) =>
              c.id === componentId ? { ...c, ...patch } : c
            );
            // If the name changed, recompute pairs
            const namesChanged = "name" in patch;
            return touch({
              ...p,
              components: nextComponents,
              pairs: namesChanged ? detectPairs(nextComponents) : p.pairs,
              analysis: namesChanged ? null : p.analysis,
            });
          }),
        });
      },

      deleteComponent: (projectId, componentId) => {
        set({
          projects: get().projects.map((p) => {
            if (p.id !== projectId) return p;
            const nextComponents = p.components.filter((c) => c.id !== componentId);
            return touch({
              ...p,
              components: nextComponents,
              pairs: detectPairs(nextComponents),
              analysis: null,
            });
          }),
        });
      },

      setComponentResult: (projectId, componentId, result) => {
        set({
          projects: get().projects.map((p) => {
            if (p.id !== projectId) return p;
            const nextComponents = p.components.map((c) =>
              c.id === componentId
                ? { ...c, result, lastRunAt: nowIso() }
                : c
            );
            return touch({
              ...p,
              components: nextComponents,
              analysis: null, // invalidate
            });
          }),
        });
      },

      clearComponentResults: (projectId) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? touch({
                  ...p,
                  components: p.components.map((c) => ({
                    ...c,
                    result: null,
                    lastRunAt: undefined,
                  })),
                  analysis: null,
                })
              : p
          ),
        });
      },

      /* -------------------- ANALYSIS -------------------- */

      setAnalysis: (projectId, analysis) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId ? touch({ ...p, analysis }) : p
          ),
        });
      },

      /* -------------------- PAIRS -------------------- */

      refreshPairs: (projectId) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? touch({ ...p, pairs: detectPairs(p.components) })
              : p
          ),
        });
      },

      /* -------------------- IMPORT / EXPORT -------------------- */

      exportProject: (projectId) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return null;
        return {
          format: "drishti-project-v1",
          project,
          exportedAt: nowIso(),
        };
      },

      importProject: (data) => {
        if (
          !data ||
          typeof data !== "object" ||
          (data as any).format !== "drishti-project-v1" ||
          !(data as any).project
        ) {
          return null;
        }
        const payload = (data as ProjectExport).project;
        // Re-id to avoid collisions
        const idMap = new Map<string, string>();
        payload.components.forEach((c) => idMap.set(c.id, uid("cmp")));

        const rebuilt: Project = {
          ...payload,
          id: uid("proj"),
          createdAt: payload.createdAt || nowIso(),
          updatedAt: nowIso(),
          components: payload.components.map((c) => ({
            ...c,
            id: idMap.get(c.id)!,
          })),
          pairs: (payload.pairs || []).map((pair: ComponentPair) => ({
            ...pair,
            aId: idMap.get(pair.aId) || pair.aId,
            bId: idMap.get(pair.bId) || pair.bId,
          })),
        };

        set({ projects: [rebuilt, ...get().projects] });
        return rebuilt;
      },
    }),
    {
      name: "drishti-projects",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
