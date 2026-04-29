// ================================================================
// Drishti AI — Project Mode Types
// ================================================================

import type { SetupInput, SelectionResult } from "@/lib/types";

/** A single component within a project. */
export type ProjectComponent = {
  id: string;
  name: string;                         // free-text, e.g. "Christmas tree spool"
  quantity?: number;                    // optional count (default 1)
  notes?: string;                       // free-text details
  /** Per-component overrides for conditions. Missing keys inherit project defaults. */
  conditions?: Partial<SetupInput>;
  /** Cached selection result for this component. null = not run yet. */
  result?: SelectionResult | null;
  /** When the selection was last run. */
  lastRunAt?: string;                   // ISO timestamp
};

/** Partial conditions shared across all components of a project. */
export type ProjectDefaults = Partial<SetupInput>;

/** A single project with its components and cross-component analysis. */
export type Project = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  defaults: ProjectDefaults;
  components: ProjectComponent[];
  /** Cross-component analysis — galvanic warnings, consolidation suggestions, etc. */
  analysis?: ProjectAnalysis | null;
  /** Auto-detected component pairs (e.g. valve ↔ bolts). */
  pairs?: ComponentPair[];
};

/** Categories the project-level analyzer emits. */
export type ProjectWarningCategory =
  | "galvanic"
  | "weldability"
  | "consolidation"
  | "procurement"
  | "inconsistency"
  | "missing_spec"
  | "other";

/** A single cross-component insight (warning, suggestion, etc.). */
export type ProjectWarning = {
  id: string;
  category: ProjectWarningCategory;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  componentIds: string[];
  /** Optional: what to do about it (short next-step). */
  action?: string;
};

/** Full cross-component analysis result. */
export type ProjectAnalysis = {
  generatedAt: string;
  summary: string;
  warnings: ProjectWarning[];
  consolidations: ProjectWarning[];
  procurement: ProjectWarning[];
};

/** A likely connection between two components (auto-detected from names). */
export type ComponentPair = {
  aId: string;
  bId: string;
  kind: "bolted" | "welded" | "flanged" | "threaded" | "inferred";
  confidence: number; // 0..1
};

/** What gets saved/exported as a shareable JSON file. */
export type ProjectExport = {
  format: "drishti-project-v1";
  project: Project;
  exportedAt: string;
};
