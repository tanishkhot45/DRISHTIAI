/* ============================================================
   PATCH FOR YOUR exportProjectPdf in lib/export.ts
   ------------------------------------------------------------
   Inside the loop that renders each material's reasoning in the
   project PDF, add the snippet below RIGHT AFTER the reasoning
   paragraphs and BEFORE the y += 3 / next-material gap.

   The snippet mirrors the styling of the existing "ASTM note"
   block in exportSelectionPdf — small accent-tinted callout box
   with a thin border, kept short so it doesn't blow page layout.

   IMPORTANT: this only writes the note when m.consolidationNote
   is present. Single-mode picks won't have it (we don't stamp
   it there), so the same export.ts works for both modes safely.
   ============================================================ */

/**
 * Render a one-line "Project consolidation" callout for a material.
 * Call this inside your per-material PDF loop, right after the
 * reasoning paragraphs are written and before the trailing gap.
 *
 * Returns the new y offset.
 *
 * Add this function near `writeParagraphs` in lib/export.ts and
 * use it inside the project-PDF per-material loop:
 *
 *   y = writeParagraphs(doc, paragraphs, y, contentWidth, 4, onNewPage, "...");
 *   y = writeConsolidationNote(doc, m, y, contentWidth, onNewPage); // <-- ADD THIS
 *   y += 3;
 */
export function writeConsolidationNote(
  doc: any,
  material: { consolidationNote?: string; name?: string },
  y: number,
  contentWidth: number,
  onNewPage: () => number,
  margins: { left: number; bottom: number } = { left: 14, bottom: 14 }
): number {
  if (!material.consolidationNote) return y;

  const note = material.consolidationNote.trim();
  if (!note) return y;

  // Page-break check — leave room for the box (ASTM-note style)
  const pageHeight = doc.internal.pageSize.getHeight();
  const minBoxHeight = 14;
  if (y + minBoxHeight > pageHeight - margins.bottom) {
    doc.addPage();
    y = onNewPage();
  }

  // Match the muted accent styling used by the "ASTM note" block
  const accent: [number, number, number] = [99, 102, 241]; // tweak if your BRAND.accent differs
  const boxFill: [number, number, number] = [240, 241, 255];
  const muted: [number, number, number] = [80, 84, 100];

  // Box rectangle
  doc.setFillColor(...boxFill);
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.2);

  // Wrap the text first to compute height
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const wrapped: string[] = doc.splitTextToSize(
    note,
    contentWidth - 6
  );
  const lineHeight = 3.5;
  const headerHeight = 4;
  const padding = 3;
  const boxHeight = headerHeight + wrapped.length * lineHeight + padding;

  doc.roundedRect(margins.left, y, contentWidth, boxHeight, 1.5, 1.5, "FD");

  // Header label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...accent);
  doc.text("PROJECT CONSOLIDATION", margins.left + 3, y + 4);

  // Note text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  let textY = y + 4 + headerHeight;
  for (const line of wrapped) {
    doc.text(line, margins.left + 3, textY);
    textY += lineHeight;
  }

  return y + boxHeight + 3;
}

/* ============================================================
   ALTERNATIVE: inline version (matches your existing ASTM note
   styling exactly — copy this block into your per-material loop
   if you'd rather not add a helper function).
   ============================================================ */

/*

      // === ADD THIS BLOCK INSIDE YOUR PER-MATERIAL LOOP ===
      // Place it RIGHT AFTER the reasoning writeParagraphs call,
      // matching the indentation and style of your existing code.

      if (m.consolidationNote) {
        const noteText = m.consolidationNote.trim();
        if (noteText) {
          // Page break check
          const pageHeight = doc.internal.pageSize.getHeight();
          if (y + 16 > pageHeight - MARGIN.bottom) {
            doc.addPage();
            y = onNewPage();
          }

          // Wrap + measure
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          const wrapped = doc.splitTextToSize(noteText, contentWidth - 6);
          const lineHeight = 3.5;
          const boxHeight = 4 + wrapped.length * lineHeight + 3;

          // Accent-tinted callout box
          doc.setFillColor(...BRAND.bgSoft);
          doc.setDrawColor(...BRAND.accent);
          doc.setLineWidth(0.2);
          doc.roundedRect(MARGIN.left, y, contentWidth, boxHeight, 1.5, 1.5, "FD");

          // Header
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(...BRAND.accent);
          doc.text("PROJECT CONSOLIDATION", MARGIN.left + 3, y + 4);

          // Body
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...BRAND.muted);
          let textY = y + 8;
          for (const line of wrapped) {
            doc.text(line, MARGIN.left + 3, textY);
            textY += lineHeight;
          }

          y += boxHeight + 3;
        }
      }
      // === END BLOCK ===

*/
