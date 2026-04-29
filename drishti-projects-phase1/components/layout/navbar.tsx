"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const pathname = usePathname();

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

  const navLinks = [
    { href: "/projects", label: "Projects" },
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
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="eye-logo relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-accent-glow">
            <div className="eye-logo-bg" />
            <div className="noise absolute inset-0 opacity-20" />
            <svg
              viewBox="0 0 24 24"
              className="relative z-10 h-5 w-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] dark:text-black dark:drop-shadow-none"
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
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl font-semibold tracking-[-0.03em] text-fg">
              Drishti<span className="text-accent">.</span>
              <span className="font-mono text-base font-medium tracking-tight">
                ai
              </span>
            </span>
            <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.2em] text-subtle sm:block">
              Material intelligence
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "hidden rounded-full px-3 py-1.5 text-sm transition sm:inline-flex",
                  active
                    ? "bg-fg/[0.06] text-fg"
                    : "text-muted hover:text-fg hover:bg-fg/[0.04]"
                )}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Theme toggle */}
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(
              "focus-ring relative ml-1 h-9 w-9 overflow-hidden rounded-full border border-fg/10 bg-fg/[0.03] transition hover:bg-fg/[0.08]"
            )}
          >
            <Sun
              className={cn(
                "absolute inset-0 m-auto h-4 w-4 transition-all",
                isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
              )}
            />
            <Moon
              className={cn(
                "absolute inset-0 m-auto h-4 w-4 transition-all",
                isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
              )}
            />
          </button>
        </nav>
      </div>
    </header>
  );
}
