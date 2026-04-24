"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

/* =====================================================
   Card
   ===================================================== */
export function Card({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "glass relative rounded-2xl p-5 shadow-glow md:p-6",
        className
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="font-display text-base font-semibold tracking-[-0.02em] text-fg">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-xs text-subtle">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* =====================================================
   Label
   ===================================================== */
export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
      {children}
    </label>
  );
}

/* =====================================================
   Input
   ===================================================== */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input(props, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={cn(
        "focus-ring mt-1.5 w-full rounded-xl border border-fg/10 bg-fg/[0.02] px-3.5 py-2.5 text-sm text-fg",
        "placeholder:text-subtle/60",
        "transition hover:bg-fg/[0.04] focus:border-accent/40 focus:bg-fg/[0.04]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "font-tech",
        props.className
      )}
    />
  );
});

/* =====================================================
   Textarea
   ===================================================== */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea(props, ref) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={cn(
        "focus-ring mt-1.5 w-full resize-none rounded-xl border border-fg/10 bg-fg/[0.02] px-3.5 py-2.5 text-sm text-fg",
        "placeholder:text-subtle/60",
        "transition hover:bg-fg/[0.04] focus:border-accent/40 focus:bg-fg/[0.04]",
        props.className
      )}
    />
  );
});

/* =====================================================
   Select
   ===================================================== */
export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & {
    wrapperClassName?: string;
  }
) {
  const { className, wrapperClassName, children, ...rest } = props;
  return (
    <div className={cn("relative mt-1.5", wrapperClassName)}>
      <select
        {...rest}
        className={cn(
          "focus-ring w-full appearance-none rounded-xl border border-fg/10 bg-fg/[0.02] px-3.5 py-2.5 pr-10 text-sm text-fg",
          "transition hover:bg-fg/[0.04] focus:border-accent/40 focus:bg-fg/[0.04]",
          className
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
    </div>
  );
}

/* =====================================================
   Button
   ===================================================== */
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "accent";
    size?: "sm" | "md" | "lg";
  }
>(function Button({ variant = "primary", size = "md", className, ...props }, ref) {
  const base =
    "focus-ring inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };

  const variants = {
    primary:
      "bg-fg text-bg hover:bg-fg/90 shadow-[0_4px_14px_-4px_rgb(var(--fg)/0.4)]",
    secondary:
      "bg-fg/[0.05] text-fg hover:bg-fg/[0.1] border border-fg/10",
    ghost: "bg-transparent text-muted hover:text-fg hover:bg-fg/[0.04]",
    accent:
      "bg-gradient-to-br from-accent to-accent2 text-white hover:opacity-90 shadow-accent-glow",
  };

  return (
    <button
      ref={ref}
      {...props}
      className={cn(base, sizes[size], variants[variant], className)}
    />
  );
});

/* =====================================================
   Pill (chip)
   ===================================================== */
export function Pill({
  children,
  onRemove,
  tone = "default",
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  tone?: "default" | "accent" | "warn" | "good";
}) {
  const tones = {
    default: "border-fg/10 bg-fg/[0.04] text-fg",
    accent: "border-accent/30 bg-accent/10 text-accent",
    warn: "border-accent2/30 bg-accent2/10 text-accent2",
    good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        tones[tone]
      )}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="focus-ring rounded-full px-1 text-current/60 hover:text-current"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* =====================================================
   Stat pill — for numeric readouts
   ===================================================== */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-fg/10 bg-fg/[0.02] p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-subtle">
        {label}
      </p>
      <p className="mt-1.5 font-tech text-lg font-medium text-fg">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-subtle">{hint}</p>}
    </div>
  );
}
