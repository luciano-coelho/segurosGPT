import { Check, Minus } from "lucide-react";
import { normalizeAutoCoverages } from "@/domain/taxonomy/mappers/auto";
import { compareOffers } from "@/domain/comparison-engine";
import type { NormalizedOffer } from "@/domain/types";
import { StatusBadge, StatusCard } from "@/components/status";
import { summarizeComparison } from "./comparison-summary";

/**
 * The Comparison Engine here is the real, production code (src/domain/) -
 * only the input is illustrative: today's new-quote flow (see
 * src/lib/opin-client/quotes/auto.ts) only confirms a lead was received
 * ("status: RCVD"), it doesn't return comparable premium/coverage numbers
 * synchronously - that needs the quote-result polling/webhook flow, not
 * built yet (see docs/ARCHITECTURE.md "Pontos em aberto"). This section
 * proves the comparison engine works, not that live quote results are wired.
 */

const quoteA: NormalizedOffer = {
  id: "quote-seguradora-a",
  kind: "quote",
  productLine: "auto",
  insurerName: "Seguradora A",
  premiumAmount: 2400,
  coverages: normalizeAutoCoverages([
    { coverage: "CASCO_COMPREENSIVA", coverageDetail: "Cobertura compreensiva" },
    { coverage: "RESPONSABILIDADE_CIVIL_FACULTATIVA_DE_VEICULOS_RCFV" },
    { coverage: "VIDROS" },
  ]),
};

const quoteB: NormalizedOffer = {
  id: "quote-seguradora-b",
  kind: "quote",
  productLine: "auto",
  insurerName: "Seguradora B",
  premiumAmount: 2100,
  coverages: normalizeAutoCoverages([
    { coverage: "CASCO_ROUBO_E_FURTO" },
    { coverage: "RESPONSABILIDADE_CIVIL_FACULTATIVA_DE_VEICULOS_RCFV" },
    { coverage: "CARRO_RESERVA" },
  ]),
};

export function IllustrativeComparison() {
  const matrix = compareOffers([quoteA, quoteB]);
  const summaries = summarizeComparison(matrix);

  return (
    <div>
      <div className="mb-4">
        <StatusCard status="warning">
          Exemplo ilustrativo — motor real de comparação, cotações de exemplo (a busca de cotações novas ainda não
          retorna prêmio comparável ao vivo).
        </StatusCard>
      </div>

      {/* The decision, up front - not the last row of a table. */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {summaries.map((s) => (
          <div
            key={s.offerId}
            className={`rounded-xl border p-4 ${s.isCheapest ? "border-success/40 bg-success-soft" : "border-border bg-surface"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className={`text-3xl font-semibold tracking-tight tabular-nums ${s.isCheapest ? "text-success" : "text-foreground"}`}>
                {s.premiumAmount != null ? `R$ ${s.premiumAmount.toLocaleString("pt-BR")}` : "—"}
              </p>
              {s.isCheapest && <StatusBadge status="positive">Mais barata</StatusBadge>}
            </div>
            <p className="mt-1.5 text-sm text-foreground">{s.headline}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/60 text-left">
              <th className="p-3 font-medium text-muted-foreground">Cobertura</th>
              {matrix.offers.map((o) => (
                <th key={o.id} className="p-3 font-medium text-foreground">
                  {o.insurerName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.canonicalKey} className="border-b border-border last:border-0">
                <td className="p-3 text-muted-foreground">{row.label}</td>
                {matrix.offers.map((o) => (
                  <td key={o.id} className="p-3">
                    {row.coverageByOffer[o.id] ? (
                      <Check className="h-4 w-4 text-success" strokeWidth={2.5} />
                    ) : (
                      <Minus className="h-4 w-4 text-border" strokeWidth={2.5} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
