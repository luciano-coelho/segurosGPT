import type { ReactNode } from "react";

/**
 * Reserved treatment for generated explanation text - accent-tinted
 * background (not neutral gray) with one asymmetric corner, like a speech
 * bubble, so raw data and "something wrote this for you" never look the
 * same. Used today for the overlap recommendation sentence (deterministic
 * template, not AI - see docs/ARCHITECTURE.md) specifically because that's
 * the exact slot the AI-generated explanation/chat will occupy later; when
 * that's wired up, the surrounding logic changes but this visual container
 * doesn't have to.
 */
export function InsightBubble({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl rounded-tl-md bg-accent-soft px-3.5 py-2.5 text-sm text-foreground">{children}</div>;
}
