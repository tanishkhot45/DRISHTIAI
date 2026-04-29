"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const pathname = usePathname();
  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

  // Close mobile menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (!menuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [menuOpen]);

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [menuOpen]);

  const navLinks = [
    { href: "/projects", label: "Project Mode" },
    { href: "/setup", label: "Select" },
    { href: "/results", label: "Results" },
  ];

  const isActive = (href: string) => {
    if (href === "/projects") return pathname?.startsWith("/projects");
    if (href === "/setup") return pathname?.startsWith("/setup");
    if (href === "/results") return pathname?.startsWith("/results");
    return false;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-fg/10 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8 md:py-4">
        {/* Logo */}
        <Link href="/" className="group flex shrink-0 items-center gap-2 md:gap-3">
          <div className="rounded-xl shadow-accent-glow transition duration-500 group-hover:-rotate-3 group-hover:scale-105">
            <div
              className="eye-logo relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl md:h-10 md:w-10"
              style={{ clipPath: "inset(0 round 0.75rem)" }}
            >
              <div className="eye-logo-bg" />
              <div className="noise absolute inset-0 rounded-[inherit] opacity-20" />
              <div className="absolute inset-0 rounded-[inherit] bg-accent/20 opacity-0 transition duration-500 group-hover:opacity-100" />

              <svg
                viewBox="0 0 24 24"
                className="relative z-10 h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition duration-500 group-hover:scale-110 dark:text-black dark:drop-shadow-none md:h-5 md:w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.25" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-semibold tracking-[-0.03em] text-fg md:text-xl">
              Drishti<span className="text-accent">.</span>
              <span className="font-mono text-sm font-medium tracking-tight md:text-base">
                ai
              </span>
            </span>
            <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.2em] text-subtle sm:block">
              Material intelligence
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-3 md:flex">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            const isProjectMode = link.href === "/projects";

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group/nav relative overflow-hidden rounded-full px-3 py-1.5 text-sm transition-all duration-300",
                  "hover:-translate-y-0.5 hover:scale-[1.03]",
                  active
                    ? "bg-fg/[0.06] text-fg"
                    : "text-muted hover:bg-fg/[0.04] hover:text-fg",
                  isProjectMode &&
                    "ring-1 ring-emerald-400/30 shadow-[0_0_16px_rgba(52,211,153,0.14)]",
                  isProjectMode &&
                    "after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border after:border-emerald-400/35 after:animate-pulse",
                  active &&
                    isProjectMode &&
                    "bg-emerald-400/[0.08] text-fg ring-emerald-300/55 shadow-[0_0_24px_rgba(52,211,153,0.24)]"
                )}
              >
                {isProjectMode && (
                  <span className="absolute inset-y-0 left-0 w-8 -translate-x-10 bg-gradient-to-r from-transparent via-emerald-300/25 to-transparent transition duration-700 group-hover/nav:translate-x-28" />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="focus-ring relative ml-1 h-9 w-9 overflow-hidden rounded-full border border-fg/10 bg-fg/[0.03] transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:bg-fg/[0.08]"
          >
            <Sun
              className={cn(
                "absolute inset-0 m-auto h-4 w-4 transition-all duration-300",
                isDark
                  ? "scale-0 rotate-90 opacity-0"
                  : "scale-100 rotate-0 opacity-100"
              )}
            />
            <Moon
              className={cn(
                "absolute inset-0 m-auto h-4 w-4 transition-all duration-300",
                isDark
                  ? "scale-100 rotate-0 opacity-100"
                  : "scale-0 -rotate-90 opacity-0"
              )}
            />
          </button>
        </nav>

        {/* Mobile actions: theme toggle + hamburger */}
        <div className="flex shrink-0 items-center gap-1.5 md:hidden">
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="focus-ring relative h-9 w-9 overflow-hidden rounded-full border border-fg/10 bg-fg/[0.03] transition hover:bg-fg/[0.08]"
          >
            <Sun
              className={cn(
                "absolute inset-0 m-auto h-4 w-4 transition-all duration-300",
                isDark
                  ? "scale-0 rotate-90 opacity-0"
                  : "scale-100 rotate-0 opacity-100"
              )}
            />
            <Moon
              className={cn(
                "absolute inset-0 m-auto h-4 w-4 transition-all duration-300",
                isDark
                  ? "scale-100 rotate-0 opacity-100"
                  : "scale-0 -rotate-90 opacity-0"
              )}
            />
          </button>

          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
            className="focus-ring relative flex h-9 w-9 items-center justify-center rounded-full border border-fg/10 bg-fg/[0.03] transition hover:bg-fg/[0.08]"
          >
            {menuOpen ? (
              <X className="h-4 w-4 text-fg" />
            ) : (
              <Menu className="h-4 w-4 text-fg" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown sheet */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 top-[64px] z-30 bg-bg/40 backdrop-blur-sm md:hidden"
          />

          {/* Sheet */}
          <nav className="absolute left-0 right-0 top-full z-40 border-b border-fg/10 bg-bg/95 backdrop-blur-xl md:hidden">
            <ul className="flex flex-col gap-1 px-4 py-3">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                const isProjectMode = link.href === "/projects";

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "relative flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition",
                        active
                          ? "bg-fg/[0.06] text-fg"
                          : "text-muted hover:bg-fg/[0.04] hover:text-fg",
                        isProjectMode &&
                          "ring-1 ring-emerald-400/30 shadow-[0_0_12px_rgba(52,211,153,0.12)]",
                        active &&
                          isProjectMode &&
                          "bg-emerald-400/[0.08] text-fg ring-emerald-300/55"
                      )}
                    >
                      {link.label}
                      {isProjectMode && (
                        <span className="absolute inset-y-0 left-0 w-8 -translate-x-10 bg-gradient-to-r from-transparent via-emerald-300/25 to-transparent transition duration-700 group-hover:translate-x-28" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </header>
  );
}