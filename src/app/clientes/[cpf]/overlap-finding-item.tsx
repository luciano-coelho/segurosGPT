"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { riskLabel } from "@/domain/taxonomy/coverage-taxonomy";
import type { OverlapFinding } from "@/domain/overlap-engine";

const LINE_LABEL: Record<string, string> = { auto: "Auto", housing: "Residencial" };
const KIND_LABEL: Record<"existing_policy" | "quote", string> = { existing_policy: "Apólice", quote: "Cotação em análise" };

function recommendationFor(finding: OverlapFinding): string {
  const risk = riskLabel(finding.canonical.risk).toLowerCase();
  return `Cliente pode estar pagando duas vezes por cobertura de ${risk}. Considere ajustar uma das apólices.`;
}

/**
 * The product's strongest proof-of-concept moment (docs/tests-back.md
 * section 4.1) - a genuine overlap, found across product lines, explained
 * in business language. Expandable so the collapsed list stays scannable
 * when a client has several findings, but defaults open when there's only
 * one - the common case shouldn't need an extra click to read.
 */
export function OverlapFindingItem({ finding, defaultOpen }: { finding: OverlapFinding; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <li className="overflow-hidden rounded-lg border border-warning/40 border-l-4 border-l-warning bg-warning-soft">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" strokeWidth={2.5} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{finding.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Encontrado em {finding.offers.length} {finding.offers.length === 1 ? "item" : "itens"} do portfólio
          </p>
        </div>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2.25}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-warning/25 px-4 py-3.5">
          <ul className="space-y-1.5">
            {finding.offers.map((o) => (
              <li key={o.offerId} className="flex items-center gap-2 text-sm text-foreground">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                {KIND_LABEL[o.kind]} de {LINE_LABEL[o.productLine] ?? o.productLine}
                {o.insurerName ? ` — ${o.insurerName}` : ""}
              </li>
            ))}
          </ul>
          <p className="rounded-md bg-surface px-3 py-2.5 text-sm text-foreground">{recommendationFor(finding)}</p>
        </div>
      )}
    </li>
  );
}
