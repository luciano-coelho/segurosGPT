"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Hourglass } from "lucide-react";
import { riskLabel } from "@/domain/taxonomy/coverage-taxonomy";
import { InsightBubble } from "@/components/insight-bubble";
import type { OverlapFinding } from "@/domain/overlap-engine";

const LINE_LABEL: Record<string, string> = { auto: "Auto", housing: "Residencial" };
const KIND_LABEL: Record<"existing_policy" | "quote", string> = { existing_policy: "Apólice", quote: "Cotação em análise" };

function recommendationFor(finding: OverlapFinding): string {
  const risk = riskLabel(finding.canonical.risk).toLowerCase();
  if (finding.pending) {
    return `Uma das coberturas de ${risk} ainda está em carência - não é uma sobreposição ativa ainda, mas passa a ser assim que a carência terminar. Vale já planejar o ajuste.`;
  }
  return `Cliente pode estar pagando duas vezes por cobertura de ${risk}. Considere ajustar uma das apólices.`;
}

/**
 * The product's strongest proof-of-concept moment (docs/tests-back.md
 * section 4.1) - a genuine overlap, found across product lines, explained
 * in business language. Expandable so the collapsed list stays scannable
 * when a client has several findings, but defaults open when there's only
 * one - the common case shouldn't need an extra click to read.
 *
 * `finding.pending` (one of the redundant coverages is still in its grace
 * period, per src/domain/grace-period.ts) gets a visibly different, calmer
 * treatment - it's not a live double-payment yet, so it shouldn't compete
 * for attention with one that is.
 */
export function OverlapFindingItem({ finding, defaultOpen }: { finding: OverlapFinding; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const tone = finding.pending
    ? { border: "border-neutral/30", borderL: "border-l-neutral", bg: "bg-neutral-soft", text: "text-neutral", innerBorder: "border-neutral/20" }
    : { border: "border-warning/40", borderL: "border-l-warning", bg: "bg-warning-soft", text: "text-warning", innerBorder: "border-warning/25" };
  const Icon = finding.pending ? Hourglass : AlertTriangle;

  return (
    <li className={`overflow-hidden rounded-lg border ${tone.border} border-l-4 ${tone.borderL} ${tone.bg} shadow-sm transition-shadow hover:shadow-md`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.text}`} strokeWidth={2.5} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {finding.label}
            {finding.pending && <span className={`ml-2 text-xs font-normal ${tone.text}`}>Em carência</span>}
          </p>
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
        <div className={`space-y-3 border-t ${tone.innerBorder} px-4 py-3.5`}>
          <ul className="space-y-1.5">
            {finding.offers.map((o) => (
              <li key={o.offerId} className="flex items-center gap-2 text-sm text-foreground">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${finding.pending ? "bg-neutral" : "bg-warning"}`} />
                {KIND_LABEL[o.kind]} de {LINE_LABEL[o.productLine] ?? o.productLine}
                {o.insurerName ? ` — ${o.insurerName}` : ""}
                {o.inGracePeriod && <span className="text-xs text-neutral">(em carência)</span>}
              </li>
            ))}
          </ul>
          <InsightBubble>{recommendationFor(finding)}</InsightBubble>
        </div>
      )}
    </li>
  );
}
