import type { ComparisonMatrix } from "@/domain/comparison-engine";

export interface OfferSummary {
  offerId: string;
  insurerName?: string;
  premiumAmount?: number;
  isCheapest: boolean;
  isMostComplete: boolean;
  /** One sentence, "{seguradora}: ..." - the trade-off already computed, not left for the broker to work out from the table. */
  headline: string;
}

function humanJoinNem(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} nem ${items[items.length - 1]}`;
}

/**
 * Turns the raw comparison matrix into the trade-off a broker actually
 * needs: who's cheapest, who's most complete, and what the cheaper one is
 * missing to get there - the calculation the table alone leaves to the
 * reader. Deterministic (counts + arithmetic), same "no AI in the
 * calculation" principle as the domain engines (see docs/ARCHITECTURE.md
 * section 2) - only the sentence wording is fixed/templated here, not the
 * underlying comparison.
 */
export function summarizeComparison(matrix: ComparisonMatrix): OfferSummary[] {
  const coveredCounts = matrix.offers.map((o) => matrix.rows.filter((r) => r.coverageByOffer[o.id]).length);
  const maxCovered = Math.max(...coveredCounts, 0);
  const prices = matrix.offers.map((o) => o.premiumAmount).filter((p): p is number => p != null);
  const cheapestPrice = prices.length > 0 ? Math.min(...prices) : undefined;

  return matrix.offers.map((offer, i) => {
    const isMostComplete = maxCovered > 0 && coveredCounts[i] === maxCovered;
    const isCheapest = cheapestPrice != null && offer.premiumAmount === cheapestPrice;
    // Strip the "(bem)" suffix for the missing-coverage sentence - within one comparison the asset is
    // implied (it's all auto, or all the same line), repeating "(veículo)" on every item reads as noise.
    const missing = matrix.rows
      .filter((r) => !r.coverageByOffer[offer.id])
      .map((r) => r.label.replace(/\s*\([^)]*\)$/, "").toLowerCase());
    const name = offer.insurerName ?? "Seguradora";

    let headline: string;
    if (isMostComplete && isCheapest) {
      headline = `${name}: melhor opção — mais completa e mais barata.`;
    } else if (isMostComplete) {
      const diff = cheapestPrice != null && offer.premiumAmount != null ? offer.premiumAmount - cheapestPrice : undefined;
      headline = diff && diff > 0 ? `${name}: mais completa, R$ ${diff.toLocaleString("pt-BR")} mais cara.` : `${name}: mais completa.`;
    } else if (isCheapest) {
      headline = missing.length > 0 ? `${name}: mais barata, sem ${humanJoinNem(missing)}.` : `${name}: mais barata.`;
    } else {
      headline = `${name}: opção intermediária.`;
    }

    return {
      offerId: offer.id,
      insurerName: offer.insurerName,
      premiumAmount: offer.premiumAmount,
      isCheapest,
      isMostComplete,
      headline,
    };
  });
}
