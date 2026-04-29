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

  createProject: (input: {
    name: string;
    description?: string;
    defaults?: ProjectDefaults;
  }) => Project;
  renameProject: (id: string, name: string, description?: string) => void;
  updateDefaults: (id: string, defaults: ProjectDefaults) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;

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

  setAnalysis: (projectId: string, analysis: ProjectAnalysis | null) => void;
  refreshPairs: (projectId: string) => void;

  exportProject: (projectId: string) => ProjectExport | null;
  importProject: (data: unknown) => Project | null;
};

const nowIso = () => new Date().toISOString();
const touch = (p: Project): Project => ({ ...p, updatedAt: nowIso() });

const MAX_COMPONENTS_FOR_AUTO_PAIRING = 250;
const safeDetectPairs = (components: ProjectComponent[]): ComponentPair[] =>
  components.length <= MAX_COMPONENTS_FOR_AUTO_PAIRING
    ? detectPairs(components)
    : [];

/**
 * 14-day TTL — projects older than this when the app loads are dropped to
 * keep localStorage tidy. Engineers can use the app for a project sprint
 * without losing data, but stale projects don't pile up forever.
 */
const PROJECT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const pruneStaleProjects = (projects: Project[]): Project[] => {
  const cutoff = Date.now() - PROJECT_TTL_MS;
  return projects.filter((p) => {
    const ts = new Date(p.updatedAt || p.createdAt || 0).getTime();
    return Number.isFinite(ts) && ts >= cutoff;
  });
};

export const useProjectsStore = create<State>()(
  persist(
    (set, get) => ({
      projects: [],

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
            p.id === id
              ? touch({ ...p, defaults: { ...p.defaults, ...defaults } })
              : p
          ),
        });
      },

      deleteProject: (id) => {
        set({ projects: get().projects.filter((p) => p.id !== id) });
      },

      getProject: (id) => get().projects.find((p) => p.id === id),

      addComponents: (projectId, items) => {
  const created: ProjectComponent[] = items.flatMap((it) => {
    const name = it.name.trim();
    if (!name) return [];

    const quantity =
      typeof it.quantity === "number" &&
      Number.isFinite(it.quantity) &&
      it.quantity > 0
        ? Math.floor(it.quantity)
        : undefined;

    return [
      {
        id: uid("cmp"),
        name,
        quantity,
        notes: it.notes?.trim() || undefined,
        conditions: it.conditions,
        result: null,
      } satisfies ProjectComponent,
    ];
  });

  if (created.length === 0) return [];

  set({
    projects: get().projects.map((p) => {
      if (p.id !== projectId) return p;
      const nextComponents = [...p.components, ...created];
      return touch({
        ...p,
        components: nextComponents,
        pairs: safeDetectPairs(nextComponents),
        analysis: null,
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
            const namesChanged = "name" in patch;
            return touch({
              ...p,
              components: nextComponents,
              pairs: namesChanged ? safeDetectPairs(nextComponents) : p.pairs,
              analysis: namesChanged ? null : p.analysis,
            });
          }),
        });
      },

      deleteComponent: (projectId, componentId) => {
        set({
          projects: get().projects.map((p) => {
            if (p.id !== projectId) return p;
            const nextComponents = p.components.filter(
              (c) => c.id !== componentId
            );
            return touch({
              ...p,
              components: nextComponents,
              pairs: safeDetectPairs(nextComponents),
              analysis: null,
            });
          }),
        });
      },

      setComponentResult: (projectId, componentId, result) => {
        set({
          projects: get().projects.map((p) => {
            if (p.id !== projectId) return p;
            return touch({
              ...p,
              components: p.components.map((c) =>
                c.id === componentId
                  ? { ...c, result, lastRunAt: nowIso() }
                  : c
              ),
              analysis: null,
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

      setAnalysis: (projectId, analysis) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId ? touch({ ...p, analysis }) : p
          ),
        });
      },

      refreshPairs: (projectId) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? touch({ ...p, pairs: safeDetectPairs(p.components) })
              : p
          ),
        });
      },

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
      version: 2,
      // Drop projects older than 14 days on hydration
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.projects)) {
          state.projects = pruneStaleProjects(state.projects);
        }
      },
      migrate: (persistedState: any, version) => {
        // v1 used sessionStorage; v2 uses localStorage. Clean shape compat only.
        if (!persistedState) return persistedState;
        if (Array.isArray(persistedState.projects)) {
          persistedState.projects = pruneStaleProjects(persistedState.projects);
        }
        return persistedState;
      },
    }
  )
);
