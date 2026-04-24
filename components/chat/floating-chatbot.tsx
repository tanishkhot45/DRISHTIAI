"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles, BookOpen } from "lucide-react";
import { useSpecStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Msg = {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ id: string; name: string; astm: string }>;
};

const SUGGESTED = [
  "When should I pick SS316L vs super-duplex?",
  "Best alloy for H₂S sour service?",
  "What holds up in seawater for 25+ years?",
];

export function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const lastResult = useSpecStore((s) => s.lastResult);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs, open]);

  // Greeting on first open
  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([
        {
          role: "assistant",
          content:
"Hi — I'm Drishti's quick assistant. Ask me in plain English about temperature, medium, chlorides, service life, or trade-offs, and I'll help you compare material options.",        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || busy) return;

    setMsgs((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setBusy(true);

    try {
      const context = lastResult
        ? {
            query: lastResult.query,
            recommendations: lastResult.recommendations,
          }
        : null;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context }),
      }).then((r) => r.json());

      if (!res.ok) throw new Error(res.error || "Chat failed");

      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: res.data.answer || "…",
          sources: res.data.sources || [],
        },
      ]);
    } catch (err: any) {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: `Sorry — ${err.message || "something broke"}.` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className={cn(
          "focus-ring fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full shadow-accent-glow transition",
          "bg-gradient-to-br from-accent to-accent2 text-white",
          "hover:scale-105 active:scale-95"
        )}
      >
        <AnimatePresence initial={false} mode="wait">
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              className="flex h-full w-full items-center justify-center"
            >
              <X className="h-5 w-5" />
            </motion.span>
          ) : (
            <motion.span
              key="msg"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="flex h-full w-full items-center justify-center"
            >
              <MessageSquare className="h-5 w-5" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
  <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent" />
    <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
  </span>
)}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
className={cn(
  "glass fixed z-50 flex flex-col overflow-hidden rounded-2xl shadow-glow",
  // Desktop: anchored to bottom-right
  "md:bottom-24 md:right-5 md:left-auto md:h-[540px] md:w-[400px]",
  // Mobile: full-width sheet at the bottom
  "bottom-24 right-4 left-4 h-[72vh]"
)}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-fg/10 px-4 py-3">
              <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-accent to-accent2">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold tracking-tight text-fg">
                  Drishti assistant
                </p>
                <p className="flex items-center gap-1 text-[10px] text-subtle">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Material guidance • Standards-aware
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-fg text-bg"
                        : "border border-fg/10 bg-fg/[0.03] text-fg"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2 border-t border-fg/10 pt-2">
                        <p className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em] text-subtle">
                          <BookOpen className="h-2.5 w-2.5" />
                          Sources
                        </p>
                        <ul className="space-y-0.5">
                          {m.sources.slice(0, 3).map((s) => (
                            <li
                              key={s.id}
                              className="font-tech text-[10px] text-muted"
                            >
                              {s.name} — {s.astm}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl border border-fg/10 bg-fg/[0.03] px-3.5 py-2.5">
                    <Dot delay={0} />
                    <Dot delay={150} />
                    <Dot delay={300} />
                  </div>
                </div>
              )}

              {/* Suggested starters (only when empty-ish) */}
              {msgs.length <= 1 && !busy && (
                <div className="pt-2">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-subtle">
                    Try asking
                  </p>
                  <div className="space-y-1.5">
                    {SUGGESTED.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="focus-ring w-full rounded-xl border border-fg/10 bg-fg/[0.02] px-3 py-2 text-left text-xs text-muted transition hover:bg-fg/[0.06] hover:text-fg"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-fg/10 p-3">
              <div className="flex items-center gap-2 rounded-xl border border-fg/10 bg-fg/[0.03] px-3 py-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask about materials, ASTM, service conditions…"
                  className="flex-1 bg-transparent text-sm text-fg placeholder:text-subtle/70 focus:outline-none"
                  disabled={busy}
                />
                <button
                  onClick={() => send()}
                  disabled={busy || !input.trim()}
                  aria-label="Send"
                  className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent2 text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      animate={{ y: [0, -4, 0] }}
      transition={{
        duration: 0.9,
        repeat: Infinity,
        delay: delay / 1000,
        ease: "easeInOut",
      }}
      className="h-1.5 w-1.5 rounded-full bg-accent"
    />
  );
}
