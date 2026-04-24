"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Check, X as XIcon } from "lucide-react";
import { exportComparisonPdf } from "@/lib/export";import { motion } from "framer-motion";
import { useSpecStore } from "@/lib/store";
import { Button } from "@/components/ui";
import { prettyLabel } from "@/lib/utils";
import type { SelectionResult } from "@/lib/types";

export default function ComparePage() {
  const router = useRouter();
  const storeResult = useSpecStore((s) => s.lastResult);
  const compareIds = useSpecStore((s) => s.compareIds);

  const [hydrated, setHydrated] = useState(false);
  const [result, setResult] = useState<SelectionResult | null>(null);

  useEffect(() => {
    if (storeResult) {
      setResult(storeResult);
    } else {
      try {
        const raw = sessionStorage.getItem("drishti_lastResult");
        if (raw) setResult(JSON.parse(raw));
      } catch {}
    }
    setHydrated(true);
  }, [storeResult]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-sm text-subtle">Loading…</div>
      </div>
    );
  }

  if (!result) {
    return (
      <EmptyState
        title="No selection to compare"
        subtitle="Run a selection first, then pick materials to compare."
        cta="Go to setup"
        onClick={() => router.push("/setup")}
      />
    );
  }

  if (compareIds.length < 2) {
    return (
      <EmptyState
        title="Pick at least two materials"
        subtitle="Head back and tap 'Compare' on any cards you want to review side-by-side."
        cta="Back to results"
        onClick={() => router.push("/results")}
      />
    );
  }

  const items = compareIds
    .map((id) => result.recommendations.find((r) => r.id === id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  if (items.length < 2) {
    return (
      <EmptyState
        title="Comparison cleared"
        subtitle="Your selected materials aren't in the current results. Run a new selection."
        cta="Back to results"
        onClick={() => router.push("/results")}
      />
    );
  }

  const criteria = result.matrix?.criteria || [];
  const rowsById = new Map(
    (result.matrix?.rows || []).map((r) => [r.materialId, r])
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <button
            onClick={() => router.push("/results")}
            className="inline-flex items-center gap-1 text-xs text-subtle transition hover:text-fg"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to results
          </button>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-fg md:text-4xl">
            Decision comparison
          </h1>
          <p className="mt-1 text-sm text-muted">
            Side-by-side review of {items.length} candidates.
          </p>
        </div>
       <Button
  variant="accent"
  size="sm"
  onClick={() => exportComparisonPdf(result, compareIds)}
>
  <FileText className="h-3.5 w-3.5" />
  Export PDF
</Button>
      </motion.header>

      {/* Desktop: grid. Mobile: stacked cards. */}
      <div className="hidden md:block">
        <DesktopGrid items={items} criteria={criteria} rowsById={rowsById} />
      </div>
      <div className="md:hidden space-y-4">
        <MobileCards items={items} criteria={criteria} rowsById={rowsById} />
      </div>

      {/* Decision record */}
      <div className="glass rounded-2xl p-6 print:border print:border-fg/20">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Decision record
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <Field label="Domain" value={result.query.domain} />
          <Field label="Component" value={result.query.componentType} />
          <Field
            label="Service"
            value={`${result.query.serviceMedium} • ${result.query.minTempC}°C to ${result.query.maxTempC}°C`}
          />
          <Field label="Criticality" value={result.query.criticality} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-6 border-t border-fg/10 pt-6 text-xs text-muted">
          <div>
            <p className="text-subtle">Selected by</p>
            <div className="mt-10 h-px bg-fg/20" />
            <p className="mt-1">Signature & date</p>
          </div>
          <div>
            <p className="text-subtle">Reviewed by</p>
            <div className="mt-10 h-px bg-fg/20" />
            <p className="mt-1">Signature & date</p>
          </div>
        </div>
        <p className="mt-6 text-[11px] text-subtle">
          Generated{" "}
          {new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

/* =========================== Desktop grid =========================== */
function DesktopGrid({ items, criteria, rowsById }: any) {
  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: `200px repeat(${items.length}, minmax(0, 1fr))`,
      }}
    >
      {/* Column headers */}
      <div />
      {items.map((m: any) => (
        <div key={m.id} className="glass rounded-2xl p-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-subtle">
            Candidate
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-fg">
            {m.name}
          </h3>
          <p className="font-tech text-xs text-muted">{m.astm}</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="font-tech text-2xl font-semibold text-accent">
              {Math.round(m.score)}
            </span>
            <span className="text-xs text-subtle">/100</span>
          </div>
        </div>
      ))}

      {/* ASTM row */}
      <RowLabel>Standard</RowLabel>
      {items.map((m: any) => (
        <Cell key={m.id}>
          <div className="flex items-center gap-2">
            {m.astmCompliant ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <XIcon className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span className="font-tech text-xs">{m.astm}</span>
          </div>
        </Cell>
      ))}

      {/* Matrix criteria */}
      {criteria.map((c: string) => (
        <>
          <RowLabel key={`lbl-${c}`}>{c}</RowLabel>
          {items.map((m: any) => (
            <Cell key={`${c}-${m.id}`}>
              <p className="font-tech text-xs text-muted">
                {rowsById.get(m.id)?.cells.find((x: any) => x.key === c)
                  ?.value || "—"}
              </p>
            </Cell>
          ))}
        </>
      ))}

      {/* Tags */}
      <RowLabel>Tags</RowLabel>
      {items.map((m: any) => (
        <Cell key={m.id}>
          <div className="flex flex-wrap gap-1">
            {(m.tags || []).slice(0, 6).map((t: string) => (
              <span
                key={t}
                className="rounded-full border border-fg/10 bg-fg/[0.03] px-2 py-0.5 text-[10px]"
              >
                {prettyLabel(t)}
              </span>
            ))}
          </div>
        </Cell>
      ))}

      {/* Reasoning */}
      <RowLabel>Why it fits</RowLabel>
      {items.map((m: any) => (
        <Cell key={m.id}>
          <div className="space-y-2 text-xs leading-relaxed text-muted">
            {(m.reasoning || m.keyReasons.join(" "))
              .split(/\n\n+/)
              .slice(0, 2)
              .map((p: string, i: number) => (
                <p key={i}>{p}</p>
              ))}
          </div>
        </Cell>
      ))}
    </div>
  );
}

/* =========================== Mobile cards =========================== */
function MobileCards({ items, criteria, rowsById }: any) {
  return items.map((m: any) => (
    <div key={m.id} className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-fg">
            {m.name}
          </h3>
          <p className="font-tech text-xs text-muted">{m.astm}</p>
        </div>
        <span className="font-tech text-xl font-semibold text-accent">
          {Math.round(m.score)}
        </span>
      </div>
      <div className="space-y-2 border-t border-fg/10 pt-3">
        {criteria.map((c: string) => {
          const v =
            rowsById.get(m.id)?.cells.find((x: any) => x.key === c)?.value ||
            "—";
          return (
            <div key={c} className="flex justify-between gap-3 text-xs">
              <span className="text-subtle">{c}</span>
              <span className="font-tech text-muted text-right">{v}</span>
            </div>
          );
        })}
      </div>
      {m.reasoning && (
        <p className="mt-3 border-t border-fg/10 pt-3 text-xs leading-relaxed text-muted">
          {m.reasoning.split(/\n\n+/)[0]}
        </p>
      )}
    </div>
  ));
}

/* =========================== Helpers =========================== */
function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-subtle">
      {children}
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-fg/10 bg-fg/[0.02] p-3">
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">
        {label}
      </p>
      <p className="mt-1 font-medium text-fg">{value}</p>
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
  cta,
  onClick,
}: {
  title: string;
  subtitle: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">
        {title}
      </h1>
      <p className="max-w-md text-sm text-muted">{subtitle}</p>
      <Button variant="accent" onClick={onClick}>
        {cta}
      </Button>
    </div>
  );
}