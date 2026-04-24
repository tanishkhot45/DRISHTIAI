// ================================================================
// Drishti AI — Type System
// ================================================================

// ---------------- Setup Input Enums ----------------
export type Domain =
  | "Cryogenics"
  | "Mining"
  | "Oil & Gas"
  | "Subsea"
  | "Hygienic"
  | "Power Systems";

export type Environment =
  | "Indoor"
  | "Outdoor"
  | "Marine splash"
  | "Marine subsea"
  | "Industrial plant"
  | "Clean/hygienic"
  | "Unknown";

export type ComponentType =
  | "Pipe"
  | "Tubing"
  | "Pressure vessel"
  | "Valve body"
  | "Pump casing"
  | "Heat exchanger"
  | "Tank"
  | "Structural"
  | "Fastener"
  | "Shaft"
  | "Liner"
  | "Seal"
  | "Bushing"
  | "Other";

export type Criticality = "Low" | "Medium" | "High" | "Safety critical";
export type OperatingMode = "Continuous" | "Cyclic" | "Intermittent" | "Unknown";
export type DesignLife = "1–3" | "3–10" | "10–25" | "25+";

export type ServiceMedium =
  | "Seawater"
  | "Freshwater"
  | "Hydrocarbons"
  | "Sour gas (H2S)"
  | "Sweet gas (CO2)"
  | "Steam"
  | "Hot water"
  | "Slurry"
  | "Acids"
  | "Alkalis"
  | "Solvents"
  | "Food product"
  | "Disinfectants"
  | "Unknown";

export type ExposureDriver =
  | "chlorides_low"
  | "chlorides_mod"
  | "chlorides_high"
  | "H2S_possible"
  | "H2S_yes"
  | "CO2_yes"
  | "abrasives_low"
  | "abrasives_med"
  | "abrasives_high"
  | "erosion_high_velocity"
  | "CIP"
  | "SIP"
  | "UV_outdoor"
  | "crevice"
  | "biofouling"
  | "cathodic_protection"
  | "unknown";

export type CostSensitivity =
  | "High sensitivity (cost-first)"
  | "Balanced"
  | "Low sensitivity (performance-first)";
export type SustainabilityPref = "No" | "Prefer" | "Strong";
export type WeldabilityReq = "Yes" | "No" | "Unknown";

export type SetupInput = {
  domain: Domain;
  environment: Environment;
  componentType: ComponentType;
  criticality: Criticality;
  operatingMode: OperatingMode;
  minTempC: number;
  maxTempC: number;
  designPressureBar?: number | null;
  designPressureUnknown?: boolean;
  designLife: DesignLife;
  serviceMedium: ServiceMedium;
  exposureDrivers: ExposureDriver[];
  constraints?: string;
  weldabilityRequired?: WeldabilityReq;
  costSensitivity?: CostSensitivity;
  sustainabilityPreferred?: SustainabilityPref;
  notes?: string;
};

// ---------------- Dataset record ----------------
export type MaterialRecord = {
  id: string;
  name: string;
  astm: string;
  family?: string;
  temp_min_c?: number;
  temp_max_c?: number;
  pressure_class?: string;
  weldability?: string;
  cost_band?: "low" | "medium" | "medium-high" | "high";
  sustainability?: "low" | "medium" | "high";
  service_fit?: string[];
  limits?: string[];
  tags?: string[];
  description?: string;
};

// ---------------- Pipeline stage outputs ----------------

/** Stage 4 — Rule engine output */
export type ScoredCandidate = {
  material: MaterialRecord;
  score: number;
  reasons: string[];
  penalties: string[];
};

/** Stage 6 — ASTM validation */
export type AstmValidation = {
  materialId: string;
  standard: string;
  compliant: boolean;
  notes: string;
};

/** Stage 7 — RAG retrieval */
export type RagEvidence = {
  materialId: string;
  snippet: string;
  source: string;
  similarity: number;
};

// ---------------- Final output ----------------


export type MaterialRow = {
  id: string;
  name: string;
  astm: string;
  tags: string[];
  score: number;
  keyReasons: string[];
  standout?: string;  // ← NEW: one-line differentiator
  astmCompliant?: boolean;
  astmNotes?: string;
  evidence?: Array<{ text: string; source: string }>;
  reasoning?: string;
};

export type MatrixCriterionKey =
  | "Temp window"
  | "Pressure"
  | "Corrosion"
  | "Chlorides"
  | "H2S/CO2"
  | "Abrasives/Erosion"
  | "Weldability"
  | "Cost"
  | "Sustainability"
  | "Notes";

export type MatrixCell = { key: MatrixCriterionKey; value: string };

export type SelectionMatrix = {
  criteria: MatrixCriterionKey[];
  rows: Array<{
    materialId: string;
    materialName: string;
    cells: MatrixCell[];
  }>;
};

export type RejectedMaterial = {
  name: string;
  reason: string;
  detail?: string;
  category?:
    | "wrong_form"
    | "insufficient_corrosion"
    | "cost_overrun"
    | "weldability"
    | "temperature"
    | "availability"
    | "overkill"
    | "code_scope"
    | "other";
};
export type SelectionResult = {
  query: SetupInput;
  recommendations: MaterialRow[];
  matrix: SelectionMatrix;
  rejected: RejectedMaterial[];
  modelNotes?: string;
  pipelineStats?: {
    datasetSize: number;
    shortlistedCount: number;
    validatedCount: number;
    retrievedEvidence: number;
    totalMs: number;
  };
};
