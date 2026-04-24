import { z } from "zod";

export const ExposureDriverSchema = z.enum([
  "chlorides_low",
  "chlorides_mod",
  "chlorides_high",
  "H2S_possible",
  "H2S_yes",
  "CO2_yes",
  "abrasives_low",
  "abrasives_med",
  "abrasives_high",
  "erosion_high_velocity",
  "CIP",
  "SIP",
  "UV_outdoor",
  "crevice",
  "biofouling",
  "cathodic_protection",
  "unknown",
]);

export const SetupSchema = z
  .object({
    domain: z.enum(["Cryogenics", "Mining", "Oil & Gas", "Subsea", "Hygienic", "Power Systems"]),
    environment: z.enum([
      "Indoor",
      "Outdoor",
      "Marine splash",
      "Marine subsea",
      "Industrial plant",
      "Clean/hygienic",
      "Unknown",
    ]),
    componentType: z.enum([
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
    ]),
    criticality: z.enum(["Low", "Medium", "High", "Safety critical"]),
    operatingMode: z.enum(["Continuous", "Cyclic", "Intermittent", "Unknown"]),
    minTempC: z.coerce.number(),
    maxTempC: z.coerce.number(),
    designPressureBar: z.coerce.number().nullable().optional(),
    designPressureUnknown: z.boolean().optional(),
    designLife: z.enum(["1–3", "3–10", "10–25", "25+"]),
    serviceMedium: z.enum([
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
    ]),
    exposureDrivers: z.array(ExposureDriverSchema).default([]),
    constraints: z.string().optional(),
    weldabilityRequired: z.enum(["Yes", "No", "Unknown"]).optional(),
    costSensitivity: z.enum([
      "High sensitivity (cost-first)",
      "Balanced",
      "Low sensitivity (performance-first)",
    ]).optional(),
    sustainabilityPreferred: z.enum(["No", "Prefer", "Strong"]).optional(),
    notes: z.string().optional(),
  })
  .refine((v) => v.maxTempC >= v.minTempC, {
    message: "Max temp must be ≥ Min temp",
    path: ["maxTempC"],
  })
  .refine(
    (v) =>
      v.designPressureUnknown ||
      typeof v.designPressureBar === "number" ||
      v.designPressureBar === null,
    { message: "Enter design pressure or mark Unknown", path: ["designPressureBar"] }
  );

export type SetupInput = z.infer<typeof SetupSchema>;
