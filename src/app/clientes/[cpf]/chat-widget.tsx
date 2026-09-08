"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { StatusBadge } from "@/components/status";
import { ChatPreview } from "./chat-preview";

/**
 * Launcher + panel live inside the KPI `<aside>` (which is `relative`), not
 * fixed to the viewport - the panel is `absolute inset-0` so it overlays
 * exactly the KPI card behind it (covering the totals while open, not the
 * main column) instead of floating over the whole page. `visible` is
 * separate from `open` so the panel mounts first, then transitions in on
 * the next frame - without that split there's nothing for the CSS
 * transition to animate from.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  function toggle() {
    if (open) setVisible(false);
    setOpen((o) => !o);
  }

  function close() {
    setVisible(false);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label="Converse sobre este cliente"
        className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-foreground shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
        Converse sobre este cliente
        <span className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-spotlight ring-2 ring-accent" aria-hidden />
      </button>

      {open && (
        <div
          className={`absolute inset-0 z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl transition-all duration-200 ease-out ${
            visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Converse sobre este cliente</h2>
            <button
              type="button"
              onClick={close}
              aria-label="Fechar"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <StatusBadge status="neutral">Em breve, aguardando confirmação do provedor de IA</StatusBadge>
            <ChatPreview />
          </div>
        </div>
      )}
    </>
  );
}
