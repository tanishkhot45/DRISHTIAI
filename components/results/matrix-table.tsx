"use client";

import type { SelectionMatrix } from "@/lib/types";

export function MatrixTable({ matrix }: { matrix: SelectionMatrix }) {
  if (!matrix || !matrix.rows?.length) return null;

  const criteria = matrix.criteria || [];

  return (
    <div className="overflow-x-auto rounded-2xl border border-fg/10 [webkit-overflow-scrolling:touch]">
      <table className="min-w-max md:min-w-full text-sm">
        <thead>
          <tr className="bg-fg/[0.03]">
            <th className="bg-fg/[0.03] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle md:sticky md:left-0 md:z-10">
              Material
            </th>
            {criteria.map((c) => (
              <th
                key={c}
                className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {matrix.rows.map((row, i) => (
            <tr key={row.materialId} className={i % 2 ? "bg-fg/[0.01]" : ""}>
              <td className="bg-bg/90 px-4 py-3 font-display font-medium text-fg md:sticky md:left-0 md:backdrop-blur-sm">
                {row.materialName}
              </td>

              {criteria.map((c) => {
                const cell = row.cells.find((x) => x.key === c);
                return (
                  <td key={c} className="px-4 py-3 font-tech text-xs text-muted">
                    {cell?.value || "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}