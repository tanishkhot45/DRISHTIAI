import type {
  ComponentType,
  Criticality,
  DesignLife,
  Domain,
  Environment,
  ExposureDriver,
  OperatingMode,
  ServiceMedium,
} from "@/lib/types";

export const DOMAIN: Domain[] = [
  "Cryogenics",
  "Mining",
  "Oil & Gas",
  "Subsea",
  "Hygienic",
  "Power Systems",
];

export const ENVIRONMENT: Environment[] = [
  "Indoor",
  "Outdoor",
  "Marine splash",
  "Marine subsea",
  "Industrial plant",
  "Clean/hygienic",
  "Unknown",
];

export const COMPONENT: ComponentType[] = [
  "Pipe",
  "Tubing",
  "Pressure vessel",
  "Valve body",
  "Pump casing",
  "Heat exchanger",
  "Tank",
  "Structural",
  "Fastener",
  "Shaft",
  "Liner",
  "Seal",
  "Bushing",
  "Other",
];

export const CRITICALITY: Criticality[] = ["Low", "Medium", "High", "Safety critical"];
export const OPERATING: OperatingMode[] = ["Continuous", "Cyclic", "Intermittent", "Unknown"];
export const LIFE: DesignLife[] = ["1–3", "3–10", "10–25", "25+"];

export const SERVICE: ServiceMedium[] = [
  "Seawater",
  "Freshwater",
  "Hydrocarbons",
  "Sour gas (H2S)",
  "Sweet gas (CO2)",
  "Steam",
  "Hot water",
  "Slurry",
  "Acids",
  "Alkalis",
  "Solvents",
  "Food product",
  "Disinfectants",
  "Unknown",
];

export const DRIVERS: { value: ExposureDriver; label: string }[] = [
  { value: "chlorides_low", label: "Low chlorides" },
  { value: "chlorides_mod", label: "Moderate chlorides" },
  { value: "chlorides_high", label: "High chlorides" },
  { value: "H2S_possible", label: "H₂S possible" },
  { value: "H2S_yes", label: "H₂S present" },
  { value: "CO2_yes", label: "CO₂ present" },
  { value: "abrasives_low", label: "Low abrasives" },
  { value: "abrasives_med", label: "Medium abrasives" },
  { value: "abrasives_high", label: "High abrasives" },
  { value: "erosion_high_velocity", label: "High-velocity erosion" },
  { value: "CIP", label: "Clean-in-place (CIP)" },
  { value: "SIP", label: "Steam-in-place (SIP)" },
  { value: "UV_outdoor", label: "Outdoor UV" },
  { value: "crevice", label: "Crevice risk" },
  { value: "biofouling", label: "Biofouling" },
  { value: "cathodic_protection", label: "Cathodic protection" },
];
