"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileDown, FileText } from "lucide-react";
import { exportSelectionCsv, exportSelectionPdf } from "@/lib/export";
import type { SelectionResult } from "@/lib/types";
import { Button, Card, Pill } from "@/components/ui";
import { MaterialCard } from "./material-card";
import { MatrixTable } from "./matrix-table";
import { RejectedList } from "./rejected-list";
import { CompareTray } from "./compare-tray";
import { prettyLabel } from "@/lib/utils";

export function ResultsView({ result }: { result: SelectionResult }) {
  const { query, recommendations, matrix, rejected, modelNotes } = result;
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeMat = recommendations.find((m) => m.id === activeId);

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines: string[] = [];

    lines.push("RECOMMENDATIONS");
    lines.push(
      ["Rank", "Name", "ASTM", "Score", "ASTM Compliant", "Key Reasons", "Tags"]
        .map(esc)
        .join(",")
    );

    recommendations.forEach((m, i) => {
      lines.push(
        [
          i + 1,
          m.name,
          m.astm,
          Math.round(m.score),
          m.astmCompliant === undefined ? "—" : m.astmCompliant ? "Yes" : "Verify",
          (m.keyReasons || []).join(" • "),
          (m.tags || []).join(" • "),
        ]
          .map(esc)
          .join(",")
      );
    });

    lines.push("");

    if (matrix?.rows?.length) {
      lines.push("SELECTION MATRIX");
      lines.push(["Material", ...matrix.criteria].map(esc).join(","));

      matrix.rows.forEach((row) => {
        const cells = matrix.criteria.map((c) => {
          const cell = row.cells.find((x) => x.key === c);
          return cell?.value || "—";
        });
        lines.push([row.materialName, ...cells].map(esc).join(","));
      });

      lines.push("");
    }

    if (rejected?.length) {
      lines.push("NOT RECOMMENDED");
      lines.push(["Name", "Reason"].map(esc).join(","));
      rejected.forEach((r) => {
        lines.push([r.name, r.reason].map(esc).join(","));
      });
      lines.push("");
    }

    lines.push("INPUTS");
    lines.push(["Field", "Value"].map(esc).join(","));

    Object.entries(query).forEach(([k, v]) => {
      const val = Array.isArray(v) ? v.join(" • ") : v;
      lines.push([k, val].map(esc).join(","));
    });

    download(
      lines.join("\n"),
      `drishti-selection-${Date.now()}.csv`,
      "text/csv;charset=utf-8"
    );
  };

  return (
    <>
      <div className="space-y-6 pb-28">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <Link
              href="/setup"
              className="inline-flex items-center gap-1 text-xs text-subtle transition hover:text-fg"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to setup
            </Link>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-fg md:text-4xl">
              Selection results
            </h1>
            <p className="mt-1 text-sm text-muted">
              {query.domain} • {query.componentType} • {query.serviceMedium} •{" "}
              {query.minTempC}°C to {query.maxTempC}°C
            </p>
          </div>

          <div className="flex gap-2">
  <Button variant="accent" size="sm" onClick={() => exportSelectionPdf(result)}>
    <FileText className="h-3.5 w-3.5" />
    Export PDF
  </Button>
  <Button variant="secondary" size="sm" onClick={() => exportSelectionCsv(result)}>
    <FileDown className="h-3.5 w-3.5" />
    Export CSV
  </Button>
</div>
        </motion.header>

        <Card title="Your inputs">
          <div className="flex flex-wrap gap-1.5">
            <Pill tone="accent">{query.domain}</Pill>
            <Pill>{query.environment}</Pill>
            <Pill>{query.componentType}</Pill>
            <Pill>{query.criticality}</Pill>
            <Pill>
              {query.minTempC}°C → {query.maxTempC}°C
            </Pill>
            <Pill>
              {query.designPressureUnknown
                ? "P: unknown"
                : `${query.designPressureBar} bar`}
            </Pill>
            <Pill>{query.serviceMedium}</Pill>
            {query.exposureDrivers?.map((d) => (
              <Pill key={d} tone="warn">
                {prettyLabel(d)}
              </Pill>
            ))}
          </div>
        </Card>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-fg">
              Top recommendations
            </h2>
            <span className="text-xs text-subtle">{recommendations.length} picks</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((m, i) => (
              <MaterialCard
                key={`${m.id}-${i}`}
                material={m}
                rank={i + 1}
                onExplain={() => setActiveId(m.id)}
              />
            ))}
          </div>
        </section>

        {activeMat && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card
              title={`Why ${activeMat.name}`}
              description={activeMat.astm}
              action={
                <button
                  onClick={() => setActiveId(null)}
                  className="focus-ring rounded-full bg-fg/[0.05] px-3 py-1 text-xs text-muted hover:text-fg"
                >
                  Close
                </button>
              }
            >
              {activeMat.reasoning ? (
                <div className="space-y-4 text-[15px] leading-relaxed text-muted">
                  {activeMat.reasoning
                    .split(/\n\n+/)
                    .filter(Boolean)
                    .map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                </div>
              ) : activeMat.keyReasons?.length ? (
                <div className="space-y-3 text-sm leading-relaxed text-muted">
                  <p>
                    {activeMat.name} fits this case for several reasons.{" "}
                    {activeMat.keyReasons.join(" ")}
                  </p>
                  <p className="text-xs text-subtle">
                    Run a new selection to get fuller written reasoning.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  Run a new selection to see the reasoning.
                </p>
              )}
            </Card>
          </motion.div>
        )}

        {matrix?.rows?.length > 0 && (
          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-fg">
                Selection matrix
              </h2>
            </div>
            <MatrixTable matrix={matrix} />
          </section>
        )}

        {rejected?.length > 0 && (
          <Card
            title="Not recommended"
            description="Alternatives considered and why they didn't make the top 5."
          >
            <RejectedList items={rejected} />
          </Card>
        )}

        {modelNotes && (
  <div className="rounded-2xl border border-accent/20 bg-accent/5 px-5 py-4 text-sm text-muted">
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
      Assumptions & notes
    </p>
    {modelNotes}
  </div>
)}
      </div>

      <CompareTray />
    </>
  );
}