"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Database, ShieldCheck, Network } from "lucide-react";
import { Button } from "@/components/ui";
import { useSpecStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const setLast = useSpecStore((s) => s.setLastResult);

  async function runFromText() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      // Step 1 — interpret NL into structured partial
      const interp = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }).then((r) => r.json());

      if (!interp.ok) throw new Error(interp.error);

      // Merge with defaults, then submit to /api/select
      const defaults = {
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
      };
      const merged = { ...defaults, ...interp.data };

      const sel = await fetch("/api/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      }).then((r) => r.json());

      if (!sel.ok) throw new Error(sel.error);

      setLast(sel.data);
      sessionStorage.setItem("drishti_lastResult", JSON.stringify(sel.data));
      router.push("/results");
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-16 pt-4">
      {/* Hero */}
      <section className="relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fg/10 bg-fg/[0.03] px-3 py-1 text-xs text-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
Standards-aware material selection for industrial service conditions          
</div>

          <h1 className="mx-auto max-w-5xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-fg sm:text-5xl md:text-6xl lg:text-7xl">
            The right material,
            <br />
            <span className="text-gradient italic">engineered to your spec.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted md:text-lg">
Describe your service conditions in plain English. Drishti turns them
into clear, standards-aware material recommendations with practical
reasoning you can review quickly.
            
          </p>
        </motion.div>

        {/* NL input */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mx-auto mt-10 max-w-3xl"
        >
          <div className="glass relative rounded-2xl p-2 shadow-glow">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="flex w-full items-center gap-2 px-3 py-1">
                <Sparkles className="h-4 w-4 shrink-0 text-accent" />
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      runFromText();
                    }
                  }}
                  placeholder="e.g. Subsea valve body, chlorides, H₂S possible, −20 to 120°C"
                  className="focus-ring w-full bg-transparent py-2 text-sm text-fg placeholder:text-subtle/70 focus:outline-none"
                  disabled={busy}
                />
              </div>
              <div className="flex shrink-0 gap-2 p-1 md:p-0 md:pr-1">
                <Button
                  variant="accent"
                  onClick={runFromText}
                  disabled={busy || !text.trim()}
                  className="w-full md:w-auto"
                >
                  {busy ? "Analyzing…" : "Run"}
                  {!busy && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-subtle">
            {[
              "Hygienic pipeline, 120°C, high corrosion",
              "Cryogenic LNG tank, −196°C",
              "Sour service pressure vessel, H₂S",
              "Subsea seawater pump casing",
            ].map((s) => (
              <button
                key={s}
                onClick={() => setText(s)}
                className="focus-ring rounded-full border border-fg/10 bg-fg/[0.02] px-3 py-1 transition hover:bg-fg/[0.06]"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
  <Link href="/setup" className="group relative inline-flex items-center gap-1.5 text-sm font-medium">
    <span className="bg-gradient-to-r from-accent via-accent2 to-accent bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer-text">
      Or use the full form
    </span>
    <span className="inline-block text-accent transition-transform duration-300 group-hover:translate-x-1">
      →
    </span>
    <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-accent to-accent2 transition-all duration-500 group-hover:w-full" />
  </Link>
</div>
        </motion.div>
      </section>

      {/* Pipeline explainer */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-8 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">
            How it works
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] md:text-3xl">
A clear path from requirement to recommendation
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            {
              icon: Sparkles,
              step: "01",
              title: "Interpret",
              body: "LLM parses free text into a structured spec.",
            },
            {
              icon: Database,
              step: "02",
              title: "Rule engine",
              body: "Deterministic scoring across 860+ datasheets.",
            },
            {
              icon: ShieldCheck,
              step: "03",
              title: "ASTM validate",
              body: "Every shortlist entry cross-checked against a spec rulebook.",
            },
            {
              icon: Network,
              step: "04",
              title: "RAG + explain",
              body: "Semantic retrieval cites the evidence behind each pick.",
            },
          ].map(({ icon: Icon, step, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass relative overflow-hidden rounded-2xl p-5"
            >
              <div className="absolute right-3 top-3 font-mono text-[10px] text-subtle">
                {step}
              </div>
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="font-display text-base font-semibold">{title}</h3>
              <p className="mt-1 text-xs text-muted">{body}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
