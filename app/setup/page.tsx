"use client";

import { motion } from "framer-motion";
import { SetupForm } from "@/components/setup/setup-form";

export default function SetupPage() {
  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-fg/10 bg-fg/[0.02] p-6 md:p-10"
      >
        <div className="absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]">
          <div className="absolute -top-24 left-10 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-accent2/25 blur-3xl" />
        </div>

        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-subtle">
          Drishti AI
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-fg md:text-5xl">
          Precision material selection.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted md:text-base">
Define the service conditions and review the best-fit material options.        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.05 }}
      >
        <SetupForm />
      </motion.div>
    </div>
  );
}
