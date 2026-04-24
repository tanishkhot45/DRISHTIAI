"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSpecStore } from "@/lib/store";
import { ResultsView } from "@/components/results/results-view";
import type { SelectionResult } from "@/lib/types";
import { Button } from "@/components/ui";

export default function ResultsPage() {
  const storeResult = useSpecStore((s) => s.lastResult);
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
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">
          No selection yet
        </h1>
        <p className="max-w-md text-sm text-muted">
          Run a selection from the setup page — or ask the floating assistant
          directly in plain English.
        </p>
        <Link href="/setup">
          <Button variant="accent">Go to setup</Button>
        </Link>
      </div>
    );
  }

  return <ResultsView result={result} />;
}
