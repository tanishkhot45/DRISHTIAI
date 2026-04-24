/**
 * Export utilities — CSV and PDF generation for selection results and comparisons.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { SelectionResult, MaterialRow } from "@/lib/types";
import { prettyLabel } from "@/lib/utils";

/* ===========================================================
   Shared helpers
   =========================================================== */

const cleanTags = (tags: string[] = []) =>
  tags
    .filter((t) => t && t !== "unknown")
    .map((t) => prettyLabel(t))
    .filter((t, i, arr) => arr.indexOf(t) === i);

/**
 * Sanitize text for jsPDF's default Helvetica font.
 * Helvetica only supports WinAnsi (Latin-1) — it renders Unicode chars
 * like −, ₂, ·, ≤ as garbled symbols. Map them to safe ASCII equivalents.
 */
const pdfSafe = (input: unknown): string => {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/[−–—]/g, "-")   // various dashes → hyphen
    .replace(/·/g, "-")        // middle dot → hyphen
    .replace(/•/g, "-")        // bullet → hyphen
    .replace(/H₂S/gi, "H2S")
    .replace(/CO₂/gi, "CO2")
    .replace(/O₂/g, "O2")
    .replace(/N₂/g, "N2")
    .replace(/₀/g, "0").replace(/₁/g, "1").replace(/₂/g, "2").replace(/₃/g, "3")
    .replace(/₄/g, "4").replace(/₅/g, "5").replace(/₆/g, "6").replace(/₇/g, "7")
    .replace(/₈/g, "8").replace(/₉/g, "9")
    .replace(/≤/g, "<=").replace(/≥/g, ">=")
    .replace(/→/g, "->").replace(/←/g, "<-")
    .replace(/[""]/g, '"').replace(/['']/g, "'")
    .replace(/…/g, "...");
};

const cleanValue = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.filter((x) => x !== "unknown").join(", ") || "—";
  const s = String(v);
  return s === "Unknown" ? "—" : s;
};

const inputFieldLabels: Record<string, string> = {
  domain: "Domain",
  environment: "Environment",
  componentType: "Component type",
  criticality: "Criticality",
  operatingMode: "Operating mode",
  minTempC: "Min temperature (°C)",
  maxTempC: "Max temperature (°C)",
  designPressureBar: "Design pressure (bar)",
  designPressureUnknown: "Pressure unknown",
  designLife: "Design life (years)",
  serviceMedium: "Service medium",
  exposureDrivers: "Exposure drivers",
  constraints: "Constraints",
  weldabilityRequired: "Weldability required",
  costSensitivity: "Cost sensitivity",
  sustainabilityPreferred: "Sustainability preferred",
  notes: "Notes",
};

const timestamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
};

/* ===========================================================
   CSV EXPORT
   =========================================================== */

export function exportSelectionCsv(result: SelectionResult) {
  const { query, recommendations, matrix, rejected } = result;
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines: string[] = [];

  lines.push("# Drishti AI — Selection Report");
  lines.push(`# Generated,${new Date().toLocaleString()}`);
  lines.push(
    `# Case,"${query.domain} ${query.componentType} in ${query.serviceMedium} (${query.minTempC}°C to ${query.maxTempC}°C)"`
  );
  lines.push("");

  lines.push("INPUTS");
  lines.push(["Field", "Value"].map(esc).join(","));
  Object.entries(query).forEach(([k, v]) => {
    if (v === "Unknown" || v === "" || v === null || v === undefined) return;
    if (Array.isArray(v) && v.length === 0) return;
    const label = inputFieldLabels[k] || k;
    const val = Array.isArray(v)
      ? v.filter((x) => x !== "unknown").map(prettyLabel).join(" | ")
      : v === true
      ? "Yes"
      : v === false
      ? "No"
      : v;
    lines.push([label, val].map(esc).join(","));
  });
  lines.push("");

  lines.push("RECOMMENDATIONS");
  lines.push(
    ["Rank", "Material", "Standard", "Score", "ASTM Compliant", "Key Reasons", "Tags"]
      .map(esc)
      .join(",")
  );
  recommendations.forEach((m, i) => {
    lines.push(
      [
        i + 1,
        m.name,
        m.astm,
        `${Math.round(m.score)}/100`,
        m.astmCompliant === undefined ? "—" : m.astmCompliant ? "Yes" : "Verify",
        (m.keyReasons || []).join(" | "),
        cleanTags(m.tags).join(" | "),
      ]
        .map(esc)
        .join(",")
    );
  });
  lines.push("");

  if (recommendations.some((r) => r.reasoning)) {
    lines.push("REASONING");
    lines.push(["Rank", "Material", "Why it fits"].map(esc).join(","));
    recommendations.forEach((m, i) => {
      if (m.reasoning) {
        const prose = m.reasoning.replace(/\s+/g, " ").trim();
        lines.push([i + 1, m.name, prose].map(esc).join(","));
      }
    });
    lines.push("");
  }

  if (matrix?.rows?.length) {
    lines.push("SELECTION MATRIX");
    lines.push(["Material", ...matrix.criteria].map(esc).join(","));
    matrix.rows.forEach((row) => {
      const cells = matrix.criteria.map(
        (c) => row.cells.find((x) => x.key === c)?.value || "—"
      );
      lines.push([row.materialName, ...cells].map(esc).join(","));
    });
    lines.push("");
  }

  if (rejected?.length) {
    lines.push("NOT RECOMMENDED");
    lines.push(["Material", "Reason"].map(esc).join(","));
    rejected.forEach((r) => {
      lines.push([r.name, r.reason].map(esc).join(","));
    });
  }

  download(
    lines.join("\n"),
    `drishti-selection-${timestamp()}.csv`,
    "text/csv;charset=utf-8"
  );
}

/* ===========================================================
   PDF — layout constants & helpers
   =========================================================== */

const BRAND = {
  accent: [0, 119, 130] as [number, number, number],
  accent2: [201, 88, 33] as [number, number, number],
  fg: [18, 20, 26] as [number, number, number],
  muted: [90, 95, 110] as [number, number, number],
  subtle: [150, 155, 170] as [number, number, number],
  rule: [225, 225, 230] as [number, number, number],
  bgSoft: [247, 246, 241] as [number, number, number],
};

const MARGIN = {
  top: 42,        // content starts here (below header)
  bottom: 18,     // content must end by page.height - bottom
  left: 14,
  right: 14,
};

function pdfHeader(doc: jsPDF, title: string, subtitle: string) {
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BRAND.accent);
  doc.rect(0, 0, w, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BRAND.fg);
  doc.text(pdfSafe(title), MARGIN.left, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.muted);
  doc.text(pdfSafe(subtitle), MARGIN.left, 29);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND.accent);
  doc.text("DRISHTI AI", w - MARGIN.right, 22, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.subtle);
  doc.text("Material intelligence", w - MARGIN.right, 27, { align: "right" });

  doc.setDrawColor(...BRAND.rule);
  doc.setLineWidth(0.3);
  doc.line(MARGIN.left, 34, w - MARGIN.right, 34);

  return MARGIN.top;
}

function pdfFooter(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND.rule);
    doc.setLineWidth(0.3);
    doc.line(MARGIN.left, h - 14, w - MARGIN.right, h - 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.subtle);
    doc.text(
      pdfSafe(`Generated ${new Date().toLocaleString()}  -  Drishti AI`),
      MARGIN.left,
      h - 8
    );
    doc.text(`Page ${i} of ${total}`, w - MARGIN.right, h - 8, { align: "right" });
  }
}

/** Draws a section heading. Also ensures there's enough room on the page. */
function sectionHeading(
  doc: jsPDF,
  y: number,
  label: string,
  onNewPage: () => number
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  // Need ~15mm of room below for the heading + at least one row of content
  if (y > pageHeight - MARGIN.bottom - 15) {
    doc.addPage();
    y = onNewPage();
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.subtle);
  const text = label.toUpperCase();
  doc.text(text, MARGIN.left, y, { charSpace: 1.2 });

  doc.setDrawColor(...BRAND.accent);
  doc.setLineWidth(0.6);
  doc.line(MARGIN.left, y + 2, MARGIN.left + doc.getTextWidth(text) + 6, y + 2);

  return y + 8;
}

/**
 * Writes paragraphs with automatic page-break.
 * Only adds a CONT. heading when a new page is actually created.
 */
function writeParagraphs(
  doc: jsPDF,
  paragraphs: string[],
  y: number,
  maxWidth: number,
  lineHeight: number,
  onNewPage: () => number,
  sectionLabel?: string
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottom = pageHeight - MARGIN.bottom;

  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(pdfSafe(p.trim()), maxWidth);
    const blockHeight = lines.length * lineHeight;

    if (y + blockHeight > bottom) {
      doc.addPage();
      y = onNewPage();
      if (sectionLabel) {
        y = sectionHeading(doc, y, `${sectionLabel} (cont.)`, onNewPage);
      }
    }

    doc.text(lines, MARGIN.left, y);
    y += blockHeight + 3;
  }
  return y;
}

/* ===========================================================
   PDF — main selection report
   =========================================================== */

export function exportSelectionPdf(result: SelectionResult) {
  const { query, recommendations, matrix, rejected, modelNotes } = result;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN.left - MARGIN.right;

  const title = "Material selection report";
  const subtitle = `${query.domain} / ${query.componentType} / ${query.serviceMedium} / ${query.minTempC}°C to ${query.maxTempC}°C`;

  const onNewPage = () => pdfHeader(doc, title, subtitle);

  let y = pdfHeader(doc, title, subtitle);

  /* ---- Service conditions ---- */
  y = sectionHeading(doc, y, "Service conditions", onNewPage);

  const inputRows: [string, string][] = Object.entries(query)
    .filter(([, v]) => {
      if (v === "Unknown" || v === "" || v === null || v === undefined) return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    })
    .map(([k, v]) => [
      pdfSafe(inputFieldLabels[k] || k),
      pdfSafe(
        Array.isArray(v)
          ? v.filter((x) => x !== "unknown").map(prettyLabel).join(", ")
          : v === true
          ? "Yes"
          : v === false
          ? "No"
          : String(v)
      ),
    ]);

  autoTable(doc, {
    startY: y,
    theme: "plain",
    body: inputRows,
    styles: {
      fontSize: 9,
      cellPadding: { top: 1.5, bottom: 1.5, left: 0, right: 2 },
    },
    columnStyles: {
      0: { textColor: BRAND.subtle, cellWidth: 55 },
      1: { textColor: BRAND.fg },
    },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  /* ---- Top recommendations table ---- */
  y = sectionHeading(doc, y, "Top recommendations", onNewPage);

  autoTable(doc, {
    startY: y,
    head: [["#", "Material", "Standard", "Score", "ASTM"]],
    body: recommendations.map((m, i) => [
      `${i + 1}`,
      pdfSafe(m.name),
      pdfSafe(m.astm),
      `${Math.round(m.score)}/100`,
      m.astmCompliant === undefined ? "-" : m.astmCompliant ? "Yes" : "Verify",
    ]),
    theme: "grid",
    headStyles: {
      fillColor: BRAND.fg,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      cellPadding: 2.5,
    },
    styles: { fontSize: 9, cellPadding: 2.5, textColor: BRAND.fg },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      2: { cellWidth: 40 },
      3: {
        cellWidth: 22,
        halign: "center",
        fontStyle: "bold",
        textColor: BRAND.accent,
      },
      4: { cellWidth: 20, halign: "center" },
    },
    alternateRowStyles: { fillColor: BRAND.bgSoft },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  /* ---- Reasoning per material ---- */
  if (recommendations.some((r) => r.reasoning)) {
    y = sectionHeading(doc, y, "Why each material fits", onNewPage);

    recommendations.forEach((m, i) => {
      if (!m.reasoning) return;

      // Ensure enough room for the material title + at least 3 lines
      const pageHeight = doc.internal.pageSize.getHeight();
      if (y + 25 > pageHeight - MARGIN.bottom) {
        doc.addPage();
        y = onNewPage();
        y = sectionHeading(doc, y, "Why each material fits (cont.)", onNewPage);
      }

// Material title — bold, on its own line
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.setTextColor(...BRAND.fg);
doc.text(`${i + 1}. ${pdfSafe(m.name)}`, MARGIN.left, y);
y += 4.5;

// ASTM + score — subtle, indented on next line
doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(...BRAND.subtle);
doc.text(
  `${pdfSafe(m.astm)}  -  Score ${Math.round(m.score)}/100`,
  MARGIN.left + 4,
  y
);
y += 5;

      // Prose
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.muted);

      const paragraphs = m.reasoning!.split(/\n\n+/).filter(Boolean);
      y = writeParagraphs(
        doc,
        paragraphs,
        y,
        contentWidth,
        4,
        onNewPage,
        "Why each material fits"
      );
      y += 3;
    });
  }

  /* ---- Side-by-side comparison ---- */
  if (matrix?.rows?.length) {
    y = sectionHeading(doc, y, "Side-by-side comparison", onNewPage);

    autoTable(doc, {
      startY: y,
      head: [["Material", ...matrix.criteria.map(pdfSafe)]],
      body: matrix.rows.map((r) => [
        pdfSafe(r.materialName),
        ...matrix.criteria.map((c) =>
          pdfSafe(r.cells.find((x) => x.key === c)?.value || "-")
        ),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: BRAND.fg,
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: "bold",
        cellPadding: 2,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: BRAND.fg,
        overflow: "linebreak",
      },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 42 } },
      alternateRowStyles: { fillColor: BRAND.bgSoft },
      margin: { left: MARGIN.left, right: MARGIN.right },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  /* ---- Not recommended ---- */
  if (rejected?.length) {
    y = sectionHeading(doc, y, "Considered but not recommended", onNewPage);

    autoTable(doc, {
      startY: y,
      head: [["Material", "Reason"]],
      body: rejected.map((r) => [pdfSafe(r.name), pdfSafe(r.reason)]),
      theme: "grid",
      headStyles: {
        fillColor: BRAND.fg,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
        cellPadding: 2.5,
      },
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: BRAND.fg },
      columnStyles: { 0: { cellWidth: 75, fontStyle: "bold" } },
      alternateRowStyles: { fillColor: BRAND.bgSoft },
      margin: { left: MARGIN.left, right: MARGIN.right },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  /* ---- Assumptions ---- */
  if (modelNotes) {
    y = sectionHeading(doc, y, "Assumptions & notes", onNewPage);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    y = writeParagraphs(
      doc,
      [modelNotes],
      y,
      contentWidth,
      4,
      onNewPage,
      "Assumptions & notes"
    );
    y += 4;
  }

  /* ---- Decision record (always at least 55mm of room needed) ---- */
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + 55 > pageHeight - MARGIN.bottom) {
    doc.addPage();
    y = onNewPage();
  }
  y = sectionHeading(doc, y, "Decision record", onNewPage);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.subtle);
  doc.text("Selected by", MARGIN.left, y);
  doc.text("Reviewed by", pageWidth / 2 + 4, y);

  doc.setDrawColor(...BRAND.rule);
  doc.setLineWidth(0.4);
  doc.line(MARGIN.left, y + 18, pageWidth / 2 - 10, y + 18);
  doc.line(pageWidth / 2 + 4, y + 18, pageWidth - MARGIN.right, y + 18);

  doc.setFontSize(7);
  doc.text("Signature & date", MARGIN.left, y + 22);
  doc.text("Signature & date", pageWidth / 2 + 4, y + 22);

  pdfFooter(doc);
  doc.save(`drishti-selection-${timestamp()}.pdf`);
}

/* ===========================================================
   PDF — comparison (landscape)
   =========================================================== */

export function exportComparisonPdf(
  result: SelectionResult,
  itemIds: string[]
) {
  const items = itemIds
    .map((id) => result.recommendations.find((r) => r.id === id))
    .filter((x): x is MaterialRow => Boolean(x));

  if (items.length < 2) return;

  const { query, matrix } = result;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN.left - MARGIN.right;

  const title = "Decision comparison";
  const subtitle = `${query.domain} / ${query.componentType} / ${query.serviceMedium} / ${query.minTempC}°C to ${query.maxTempC}°C`;

  const onNewPage = () => pdfHeader(doc, title, subtitle);

  let y = pdfHeader(doc, title, subtitle);

  /* ---- Candidate cards ---- */
  y = sectionHeading(doc, y, `Candidates (${items.length})`, onNewPage);

  const CARD_GAP = 4;
  const CARD_H = 24;
  const cardW = (contentWidth - CARD_GAP * (items.length - 1)) / items.length;

  items.forEach((m, i) => {
    const x = MARGIN.left + i * (cardW + CARD_GAP);

    // Card background
    doc.setFillColor(...BRAND.bgSoft);
    doc.roundedRect(x, y, cardW, CARD_H, 2.5, 2.5, "F");

    // Left side — name + astm (wrapped if needed)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.fg);
    const nameLines = doc.splitTextToSize(pdfSafe(m.name), cardW - 24);
  // Name — max 2 lines, tracked separately so ASTM can sit just below
const truncatedNameLines = nameLines.slice(0, 2);
doc.text(truncatedNameLines, x + 3.5, y + 7);

// ASTM — positioned based on how many name lines there were, not fixed
const astmY = y + 7 + truncatedNameLines.length * 4 + 2;
doc.setFont("helvetica", "normal");
doc.setFontSize(7.5);
doc.setTextColor(...BRAND.subtle);
doc.text(pdfSafe(m.astm), x + 3.5, astmY);

    // Right side — score (combined on one line so /100 doesn't wrap)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...BRAND.accent);
    const scoreText = `${Math.round(m.score)}`;
    const suffixText = "/100";

    // Measure both to place them side-by-side, right-aligned
    const scoreW = doc.getTextWidth(scoreText);
    doc.setFontSize(8);
    const suffixW = doc.getTextWidth(suffixText);
    doc.setFontSize(13);

    const totalW = scoreW + 1 + suffixW;
    const rightEdge = x + cardW - 4;
    const scoreX = rightEdge - totalW;

    doc.text(scoreText, scoreX, y + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.subtle);
    doc.text(suffixText, scoreX + scoreW + 1, y + 14);
  });

  y += CARD_H + 8;

  /* ---- Comparison matrix ----
     Fixed column widths so tags column doesn't overflow right edge. */
  const rowsById = new Map((matrix?.rows || []).map((r) => [r.materialId, r]));
  const criteria = matrix?.criteria || [];

  const critColW = 38;
  const materialColsTotal = contentWidth - critColW;
  const materialColW = materialColsTotal / items.length;

  const tableHead = [
    ["Criterion", ...items.map((m) => pdfSafe(m.name))],
  ];

  const tableBody: any[] = [];

  tableBody.push([
    "Standard",
    ...items.map((m) => ({
      content: pdfSafe(m.astm),
      styles: {
        textColor: m.astmCompliant ? [16, 120, 60] : [180, 100, 20],
        fontStyle: "bold" as const,
      },
    })),
  ]);

  criteria.forEach((c) => {
    tableBody.push([
      pdfSafe(c),
      ...items.map((m) =>
        pdfSafe(rowsById.get(m.id)?.cells.find((x) => x.key === c)?.value || "-")
      ),
    ]);
  });

  tableBody.push([
    "Tags",
    ...items.map((m) => pdfSafe(cleanTags(m.tags).slice(0, 6).join(", ") || "-")),
  ]);

  const dynamicColStyles: Record<number, any> = {
    0: {
      fontStyle: "bold",
      textColor: BRAND.subtle,
      cellWidth: critColW,
      fillColor: BRAND.bgSoft,
    },
  };
  for (let i = 0; i < items.length; i++) {
    dynamicColStyles[i + 1] = { cellWidth: materialColW };
  }

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: BRAND.fg,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: BRAND.fg,
      overflow: "linebreak",
      valign: "top",
    },
    columnStyles: dynamicColStyles,
    margin: { left: MARGIN.left, right: MARGIN.right },
    tableWidth: contentWidth,
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  /* ---- Reasoning per material ---- */
  if (items.some((m) => m.reasoning)) {
    y = sectionHeading(doc, y, "Why each material fits", onNewPage);

    items.forEach((m) => {
      if (!m.reasoning) return;

      const pageHeight = doc.internal.pageSize.getHeight();
      if (y + 20 > pageHeight - MARGIN.bottom) {
        doc.addPage();
        y = onNewPage();
        y = sectionHeading(doc, y, "Why each material fits (cont.)", onNewPage);
      }

doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.setTextColor(...BRAND.fg);
doc.text(pdfSafe(m.name), MARGIN.left, y);
y += 4.5;

doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(...BRAND.subtle);
doc.text(pdfSafe(m.astm), MARGIN.left + 4, y);
y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.muted);

      const paragraphs = m.reasoning.split(/\n\n+/).filter(Boolean);
      y = writeParagraphs(
        doc,
        paragraphs,
        y,
        contentWidth,
        4,
        onNewPage,
        "Why each material fits"
      );
      y += 4;
    });
  }

  /* ---- Decision record ---- */
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + 55 > pageHeight - MARGIN.bottom) {
    doc.addPage();
    y = onNewPage();
  }
  y = sectionHeading(doc, y, "Decision record", onNewPage);

  const recordRows: [string, string][] = [
    ["Domain", pdfSafe(cleanValue(query.domain))],
    ["Component", pdfSafe(cleanValue(query.componentType))],
    [
      "Service",
      pdfSafe(
        `${cleanValue(query.serviceMedium)} / ${query.minTempC}°C to ${query.maxTempC}°C`
      ),
    ],
    ["Criticality", pdfSafe(cleanValue(query.criticality))],
  ];

  autoTable(doc, {
    startY: y,
    theme: "plain",
    body: recordRows,
    styles: {
      fontSize: 9,
      cellPadding: { top: 1.5, bottom: 1.5, left: 0, right: 2 },
    },
    columnStyles: {
      0: { textColor: BRAND.subtle, cellWidth: 40 },
      1: { textColor: BRAND.fg },
    },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.subtle);
  doc.text("Selected by", MARGIN.left, y);
  doc.text("Reviewed by", pageWidth / 2 + 4, y);
  doc.setDrawColor(...BRAND.rule);
  doc.setLineWidth(0.4);
  doc.line(MARGIN.left, y + 18, pageWidth / 2 - 10, y + 18);
  doc.line(pageWidth / 2 + 4, y + 18, pageWidth - MARGIN.right, y + 18);
  doc.setFontSize(7);
  doc.text("Signature & date", MARGIN.left, y + 22);
  doc.text("Signature & date", pageWidth / 2 + 4, y + 22);

  pdfFooter(doc);
  doc.save(`drishti-comparison-${timestamp()}.pdf`);
}

/* ===========================================================
   Helper
   =========================================================== */

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}