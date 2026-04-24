"use client";

import { Pill } from "@/components/ui";
import { DRIVERS } from "./options";
import type { ExposureDriver } from "@/lib/types";

export function ChipsInput({
  value,
  onChange,
}: {
  value: ExposureDriver[];
  onChange: (v: ExposureDriver[]) => void;
}) {
  const toggle = (v: ExposureDriver) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {DRIVERS.map(({ value: v, label }) => {
        const active = value.includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            className={[
              "focus-ring rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
              active
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-fg/10 bg-fg/[0.02] text-muted hover:bg-fg/[0.06] hover:text-fg",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
