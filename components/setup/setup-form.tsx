"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import * as Collapsible from "@radix-ui/react-collapsible";
import { Thermometer, Gauge, Settings2, ChevronDown } from "lucide-react";

import { LoadingOverlay } from "@/components/chat/loading-overlay";
import { Card, Label, Select, Input, Button, Textarea } from "@/components/ui";
import { ChipsInput } from "./chips-input";
import { SetupSchema, type SetupInput } from "@/lib/schema";
import {
  DOMAIN,
  ENVIRONMENT,
  COMPONENT,
  CRITICALITY,
  OPERATING,
  LIFE,
  SERVICE,
} from "./options";
import { useSpecStore } from "@/lib/store";

export function SetupForm() {
  const router = useRouter();
  const setLast = useSpecStore((s) => s.setLastResult);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<SetupInput>({
    resolver: zodResolver(SetupSchema),
    mode: "onChange",
    defaultValues: {
      domain: "Oil & Gas",
      environment: "Unknown",
      componentType: "Pipe",
      criticality: "Medium",
      operatingMode: "Continuous",
      minTempC: 20,
      maxTempC: 60,
      designPressureUnknown: true,
      designPressureBar: null,
      designLife: "3–10",
      serviceMedium: "Unknown",
      exposureDrivers: [],
      weldabilityRequired: "Unknown",
      costSensitivity: "Balanced",
      sustainabilityPreferred: "No",
      constraints: "",
      notes: "",
    },
  });

  const designPressureUnknown = watch("designPressureUnknown");
  const drivers = watch("exposureDrivers") || [];
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const fieldError = (name: keyof SetupInput) =>
    errors[name]?.message ? String(errors[name]?.message) : "";

  const onSubmit = async (values: SetupInput) => {
    const body = {
      ...values,
      designPressureBar: values.designPressureUnknown
        ? null
        : values.designPressureBar ?? null,
    };

    const res = await fetch("/api/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();

    if (!json.ok) {
      alert(json.error || "Selection failed.");
      return;
    }

    setLast(json.data);
    sessionStorage.setItem("drishti_lastResult", JSON.stringify(json.data));
    router.push("/results");
  };

  const statusTone: "neutral" | "ready" | "needs" = !isDirty
    ? "neutral"
    : isValid
    ? "ready"
    : "needs";

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-4 lg:grid-cols-12"
      >
        {/* LEFT column — inputs */}
        <div className="space-y-4 lg:col-span-8">
          <Card
            title="Domain & context"
            description="Where will this component operate, and how critical is it?"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Domain" error={fieldError("domain")}>
                <Select {...register("domain")}>
                  {DOMAIN.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Environment" error={fieldError("environment")}>
                <Select {...register("environment")}>
                  {ENVIRONMENT.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Component type" error={fieldError("componentType")}>
                <Select {...register("componentType")}>
                  {COMPONENT.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Criticality" error={fieldError("criticality")}>
                <Select {...register("criticality")}>
                  {CRITICALITY.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card
            title="Operating window"
            description="Temperature & pressure define what's even possible."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field
                icon={<Thermometer size={13} />}
                label="Min temperature (°C)"
                error={fieldError("minTempC")}
              >
                <Input
                  type="number"
                  step="1"
                  {...register("minTempC", { valueAsNumber: true })}
                />
              </Field>
              <Field
                icon={<Thermometer size={13} />}
                label="Max temperature (°C)"
                error={fieldError("maxTempC")}
              >
                <Input
                  type="number"
                  step="1"
                  {...register("maxTempC", { valueAsNumber: true })}
                />
              </Field>
              <Field
                icon={<Gauge size={13} />}
                label="Design pressure (bar)"
                error={fieldError("designPressureBar")}
              >
                <Input
                  type="number"
                  step="0.1"
                  disabled={!!designPressureUnknown}
                  placeholder={designPressureUnknown ? "Unknown" : "e.g. 150"}
                  {...register("designPressureBar", { valueAsNumber: true })}
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-subtle">
                  <input
                    type="checkbox"
                    className="accent-accent"
                    {...register("designPressureUnknown")}
                  />
                  Pressure unknown
                </label>
              </Field>
              <Field label="Design life (years)" error={fieldError("designLife")}>
                <Select {...register("designLife")}>
                  {LIFE.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Operating mode" error={fieldError("operatingMode")}>
                <Select {...register("operatingMode")}>
                  {OPERATING.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Service medium" error={fieldError("serviceMedium")}>
                <Select {...register("serviceMedium")}>
                  {SERVICE.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card
            title="Exposure drivers"
            description="Select anything that applies. Drives the rule engine."
          >
            <Controller
              name="exposureDrivers"
              control={control}
              render={({ field }) => (
                <ChipsInput value={field.value || []} onChange={field.onChange} />
              )}
            />
          </Card>

          {/* Advanced */}
          <Collapsible.Root open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <Collapsible.Trigger asChild>
              <button
                type="button"
                className="focus-ring flex w-full items-center justify-between rounded-2xl border border-fg/10 bg-fg/[0.02] px-5 py-3 text-sm text-fg transition hover:bg-fg/[0.05]"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-accent" />
                  <span className="font-medium">Advanced</span>
                  <span className="text-xs text-subtle">
                    Weldability, cost, sustainability, constraints
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-subtle transition ${
                    advancedOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <AnimatePresence initial={false}>
                {advancedOpen && (
                  <motion.div
                    key="adv"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <Card className="mt-3">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Field label="Weldability required">
                          <Select {...register("weldabilityRequired")}>
                            <option>Unknown</option>
                            <option>Yes</option>
                            <option>No</option>
                          </Select>
                        </Field>
                        <Field label="Cost sensitivity">
                          <Select {...register("costSensitivity")}>
                            <option>Balanced</option>
                            <option>High sensitivity (cost-first)</option>
                            <option>Low sensitivity (performance-first)</option>
                          </Select>
                        </Field>
                        <Field label="Sustainability preferred">
                          <Select {...register("sustainabilityPreferred")}>
                            <option>No</option>
                            <option>Prefer</option>
                            <option>Strong</option>
                          </Select>
                        </Field>
                        <Field label="Constraints">
                          <Input
                            placeholder="e.g. NACE MR0175, max hardness..."
                            {...register("constraints")}
                          />
                        </Field>
                        <div className="md:col-span-2">
                          <Field label="Notes (optional)">
                            <Textarea
                              rows={3}
                              placeholder="Any extra info that should influence selection."
                              {...register("notes")}
                            />
                          </Field>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </Collapsible.Content>
          </Collapsible.Root>
        </div>

        {/* RIGHT column — actions */}
        <aside className="space-y-4 lg:col-span-4">
          <Card title="Run selection">
            <div className="flex gap-2">
              <Button type="submit" variant="accent" disabled={isSubmitting}>
                {isSubmitting ? "Running…" : "Run selection"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => reset()}
              >
                Reset
              </Button>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  statusTone === "ready"
                    ? "bg-emerald-400"
                    : statusTone === "needs"
                    ? "bg-amber-400"
                    : "bg-subtle"
                }`}
              />
              <span className="text-xs text-muted">
                {statusTone === "ready"
                  ? "Ready to run"
                  : statusTone === "needs"
                  ? "Some fields need attention"
                  : "Default preset"}
              </span>
            </div>
            <p className="mt-4 text-xs text-subtle">
              Tip: try "High chlorides" + "Crevice risk" for offshore hardware.
            </p>
          </Card>

          <Card title="Quick presets">
            <div className="grid gap-2">
              <PresetButton
                onClick={() => {
                  setValue("domain", "Subsea");
                  setValue("environment", "Marine subsea");
                  setValue("serviceMedium", "Seawater");
                  setValue("componentType", "Valve body");
                  setValue("exposureDrivers", [
                    "chlorides_high",
                    "crevice",
                    "cathodic_protection",
                  ] as any);
                }}
              >
                Subsea corrosion
              </PresetButton>
              <PresetButton
                onClick={() => {
                  setValue("domain", "Cryogenics");
                  setValue("environment", "Indoor");
                  setValue("minTempC", -196);
                  setValue("maxTempC", 20);
                  setValue("componentType", "Pipe");
                }}
              >
                Cryogenic duty
              </PresetButton>
              <PresetButton
                onClick={() => {
                  setValue("domain", "Hygienic");
                  setValue("environment", "Clean/hygienic");
                  setValue("serviceMedium", "Food product");
                  setValue("componentType", "Tank");
                  setValue("exposureDrivers", ["CIP", "SIP"] as any);
                }}
              >
                Hygienic (CIP + SIP)
              </PresetButton>
              <PresetButton
                onClick={() => {
                  setValue("domain", "Oil & Gas");
                  setValue("environment", "Industrial plant");
                  setValue("serviceMedium", "Sour gas (H2S)");
                  setValue("componentType", "Pressure vessel");
                  setValue("exposureDrivers", ["H2S_yes", "CO2_yes"] as any);
                }}
              >
                Sour service (H₂S)
              </PresetButton>
            </div>
          </Card>
        </aside>
      </form>

      <LoadingOverlay
        open={isSubmitting}
        title="Preparing recommendations…"
subtitle="Reviewing conditions, screening options, and compiling the best matches."
      />
    </>
  );
}

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-subtle">{icon}</span>}
        <Label>{label}</Label>
      </div>
      {children}
      {error && <p className="mt-1 text-[11px] text-amber-500">⚠ {error}</p>}
    </div>
  );
}

function PresetButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring rounded-xl border border-fg/10 bg-fg/[0.02] px-3 py-2 text-left text-xs text-muted transition hover:bg-fg/[0.06] hover:text-fg"
    >
      {children}
    </button>
  );
}
