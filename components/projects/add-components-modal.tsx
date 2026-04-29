"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Type,
  Sparkles,
  ClipboardPaste,
  Plus,
  Loader2,
  Check,
} from "lucide-react";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { parseComponentPaste } from "@/lib/projects-utils";

type Mode = "text" | "ai" | "csv";

export type AddItem = { name: string; quantity?: number; notes?: string };

export function AddComponentsModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (items: AddItem[]) => void;
}) {
  const [mode, setMode] = useState<Mode>("text");
  const [resetKey, setResetKey] = useState(0);

  // Reset internal state every time the modal opens
  useEffect(() => {
    if (open) {
      setMode("text");
      setResetKey((k) => k + 1);
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /**
   * Close the modal immediately so no invisible fixed backdrop can keep
   * capturing clicks after adding items from AI/CSV mode. The actual store
   * update is deferred one tick, which lets React commit the close first.
   */
  const handleAddAndClose = (items: AddItem[]) => {
    const cleanItems = items.filter((item) => item.name?.trim());
    if (cleanItems.length === 0) return;

    onClose();
    window.setTimeout(() => {
      onAdd(cleanItems);
    }, 0);
  };

  if (!open) return null;

  return (
    <motion.div
      key="add-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        onMouseDown={(e) => e.stopPropagation()}
        className="glass relative w-full max-w-2xl rounded-2xl shadow-glow"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-fg/10 px-6 py-4">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-fg">
              Add components
            </h3>
            <p className="mt-0.5 text-xs text-subtle">
              Type, describe, or paste. All three work.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            type="button"
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-full bg-fg/[0.05] text-muted transition hover:bg-fg/[0.1] hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-fg/10 px-6">
          <div className="flex gap-1">
            <Tab
              active={mode === "text"}
              onClick={() => setMode("text")}
              icon={<Type className="h-3.5 w-3.5" />}
              label="Type one"
            />
            <Tab
              active={mode === "ai"}
              onClick={() => setMode("ai")}
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="Describe system"
              accent
            />
            <Tab
              active={mode === "csv"}
              onClick={() => setMode("csv")}
              icon={<ClipboardPaste className="h-3.5 w-3.5" />}
              label="Paste list"
            />
          </div>
        </div>

        {/* Body — keys force a fresh state when modal reopens */}
        <div className="p-6">
          {mode === "text" && (
            <TextMode key={`text-${resetKey}`} onAdd={handleAddAndClose} />
          )}
          {mode === "ai" && (
            <AiMode key={`ai-${resetKey}`} onAdd={handleAddAndClose} />
          )}
          {mode === "csv" && (
            <CsvMode key={`csv-${resetKey}`} onAdd={handleAddAndClose} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* =========================== Tab =========================== */
function Tab({
  active,
  onClick,
  icon,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={[
        "focus-ring relative inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition",
        active ? "text-fg" : "text-subtle hover:text-muted",
      ].join(" ")}
    >
      <span className={active && accent ? "text-accent" : ""}>{icon}</span>
      {label}
      {active && (
        <motion.span
          layoutId="add-cmp-tab"
          className="absolute -bottom-px left-0 right-0 h-px bg-accent"
        />
      )}
    </button>
  );
}

/* =========================== Mode 1: Type one =========================== */
function TextMode({ onAdd }: { onAdd: (items: AddItem[]) => void }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    const qty = parseInt(quantity, 10);
    onAdd([
      {
        name: name.trim(),
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        notes: notes.trim() || undefined,
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Component name</Label>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Christmas tree spool"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Quantity</Label>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <Label>Notes (optional)</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 10ksi pressure rating"
          />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button variant="accent" onClick={submit} disabled={!name.trim()}>
          <Plus className="h-3.5 w-3.5" />
          Add component
        </Button>
      </div>
    </div>
  );
}

/* =========================== Mode 2: Describe system =========================== */
function AiMode({ onAdd }: { onAdd: (items: AddItem[]) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<AddItem[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const extract = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/extract-components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error || "Extraction failed");
      const items: AddItem[] = res.data.components || [];
      setExtracted(items);
      setSelected(new Set(items.map((_, i) => i)));
    } catch (err: any) {
      setError(err?.message || "Something broke");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const addSelected = () => {
    if (!extracted) return;
    const items = extracted.filter((_, i) => selected.has(i));
    if (items.length) onAdd(items);
  };

  if (extracted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">
            Found <span className="font-medium text-fg">{extracted.length}</span>{" "}
            components. Uncheck any you don't want.
          </p>
          <button
            type="button"
            onClick={() => {
              setExtracted(null);
              setSelected(new Set());
            }}
            className="text-[11px] text-subtle transition hover:text-fg"
          >
            Start over
          </button>
        </div>

        <ul className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-fg/10 bg-fg/[0.02] p-2">
          {extracted.map((c, i) => {
            const isOn = selected.has(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={[
                    "focus-ring flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition",
                    isOn ? "bg-accent/10" : "bg-transparent hover:bg-fg/[0.03]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                      isOn ? "border-accent bg-accent" : "border-fg/20",
                    ].join(" ")}
                  >
                    {isOn && <Check className="h-3 w-3 text-bg" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {c.name}
                      {c.quantity && c.quantity > 1 && (
                        <span className="ml-1.5 font-tech text-xs text-accent">
                          ×{c.quantity}
                        </span>
                      )}
                    </p>
                    {c.notes && (
                      <p className="truncate text-xs text-subtle">{c.notes}</p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end">
          <Button
            variant="accent"
            onClick={addSelected}
            disabled={selected.size === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            Add {selected.size}{" "}
            {selected.size === 1 ? "component" : "components"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Describe your system</Label>
        <Textarea
          autoFocus
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`e.g. "Offshore wellhead with 2 master valves, an annulus valve, 10 ft of flowline spool, 4 RTJ flanges to the manifold, and 8 studded connectors."`}
        />
      </div>
      {error && <p className="text-xs text-amber-500">⚠ {error}</p>}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-subtle">
          Drishti will extract a clean component list you can review.
        </p>
        <Button
          variant="accent"
          onClick={extract}
          disabled={busy || !text.trim()}
        >
          {busy ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Extracting…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Extract components
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* =========================== Mode 3: CSV paste =========================== */
function CsvMode({ onAdd }: { onAdd: (items: AddItem[]) => void }) {
  const [raw, setRaw] = useState("");

  const parsed = parseComponentPaste(raw);

  const submit = () => {
    if (parsed.length === 0) return;
    onAdd(parsed);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Paste a component list</Label>
        <Textarea
          autoFocus
          rows={8}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={`One per line. Optional commas for quantity + notes.

Master valve body
Annulus valve body, 1, 10ksi
Flange, 4, to manifold
Studded connector, 8
Flowline spool, 1, 10ft`}
          className="font-tech text-xs"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-subtle">
          {parsed.length > 0
            ? `Ready to add ${parsed.length} component${
                parsed.length === 1 ? "" : "s"
              }.`
            : "Format: name[, quantity[, notes]]"}
        </p>
        <Button variant="accent" onClick={submit} disabled={parsed.length === 0}>
          <Plus className="h-3.5 w-3.5" />
          Add {parsed.length || ""}
        </Button>
      </div>
    </div>
  );
}