"use client";

/**
 * Atmospheric background — two drifting aurora blobs.
 * Rendered once at the root layout; pointer-events disabled.
 */
export function AuroraBg() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      <div className="aurora aurora-1 -top-40 -left-32 h-[480px] w-[480px]" />
      <div className="aurora aurora-2 -bottom-40 -right-32 h-[520px] w-[520px]" />
      <div className="aurora aurora-1 top-1/3 right-1/4 h-[320px] w-[320px] opacity-30" />
    </div>
  );
}
