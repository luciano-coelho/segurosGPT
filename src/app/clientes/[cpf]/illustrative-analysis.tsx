import { Check, Minus } from "lucide-react";
import { normalizeAutoCoverages } from "@/domain/taxonomy/mappers/auto";
import { compareOffers } from "@/domain/comparison-engine";
import type { NormalizedOffer } from "@/domain/types";
import { StatusCard } from "@/components/status";
import { summarizeComparison } from "./comparison-summary";

/**
 * The Comparison Engine here is the real, production code (src/domain/) -
 * only the input is illustrative, for a reason deeper than "the API call
 * isn't wired up": this Mock OPIN environment simulates exactly one
 * insurance company ("Mock Insurer" - same participant behind every
 * policy and quote in this whole app). Its live full-quote endpoint
 * (POST /v1/request + GET .../quote-status) does work end-to-end and does
 * return a real ACPT response - but the premium it returns is a hardcoded
 * constant in the mock's source (QuoteAutoEntity.toResponse: always
 * "100.00", regardless of what coverage was requested - confirmed reading
 * insurance-server-lambdas). Wiring that in would replace an illustrative
 * example with a real API call that always answers the same fixed number
 * for every request, which communicates less than a made-up-but-varied
 * example does. A real multi-insurer comparison needs a mock (or
 * production) environment with more than one participant - see
 * docs/ARCHITECTURE.md "Pontos em aberto". Fictional insurer names below
 * on purpose, not "Seguradora A/B" placeholders.
 */

const quoteA: NormalizedOffer = {
  id: "quote-seguradora-a",
  kind: "quote",
  productLine: "auto",
  insurerName: "Seguradora Horizonte",
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
  insurerName: "Seguradora Aliança",
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
          Exemplo ilustrativo — motor de comparação real, seguradoras e valores fictícios. Este ambiente de mock só
          simula uma seguradora, então não há um segundo participante real pra comparar; a comparação de verdade
          entra assim que houver mais de uma seguradora conectada.
        </StatusCard>
      </div>

      {/* The decision, up front - not the last row of a table. Cheapest uses --accent, not
          status-success green: it's a call-out/highlight, not a status judgment (see globals.css). */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {summaries.map((s) => (
          <div
            key={s.offerId}
            className={`rounded-xl border p-4 transition-shadow ${s.isCheapest ? "border-accent/40 bg-accent-soft shadow-md" : "border-border bg-surface shadow-sm"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className={`font-display text-3xl font-semibold tracking-tight tabular-nums ${s.isCheapest ? "text-accent" : "text-foreground"}`}>
                {s.premiumAmount != null ? `R$ ${s.premiumAmount.toLocaleString("pt-BR")}` : "—"}
              </p>
              {s.isCheapest && (
                <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                  Mais barata
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-foreground">{s.headline}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
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
