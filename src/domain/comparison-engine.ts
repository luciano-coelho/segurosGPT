import { canonicalKey, canonicalLabel } from "./taxonomy/coverage-taxonomy";
import type { NormalizedOffer } from "./types";

export interface ComparisonRow {
  canonicalKey: string;
  label: string;
  /** offerId -> the source coverage code that covers this canonical key on that offer, or null if absent. */
  coverageByOffer: Record<string, string | null>;
}

export interface ComparisonMatrix {
  offers: Array<{ id: string; insurerName?: string; premiumAmount?: number }>;
  rows: ComparisonRow[];
}

/**
 * Deterministic, row-per-canonical-coverage comparison across offers (new
 * quotes, or existing policies) - typically offers of the same product line,
 * since that's what a broker compares side by side. No AI involved: this is
 * the auditable ground truth the "insight" summary explains afterwards (see
 * docs/ARCHITECTURE.md section 2, design principle).
 */
export function compareOffers(offers: NormalizedOffer[]): ComparisonMatrix {
  const rowsByKey = new Map<string, ComparisonRow>();

  for (const offer of offers) {
    for (const item of offer.coverages) {
      for (const canonical of item.canonical) {
        const key = canonicalKey(canonical);
        let row = rowsByKey.get(key);
        if (!row) {
          row = { canonicalKey: key, label: canonicalLabel(canonical), coverageByOffer: {} };
          rowsByKey.set(key, row);
        }
        row.coverageByOffer[offer.id] = item.sourceCode;
      }
    }
  }

  for (const row of rowsByKey.values()) {
    for (const offer of offers) {
      if (!(offer.id in row.coverageByOffer)) row.coverageByOffer[offer.id] = null;
    }
  }

  return {
    offers: offers.map((o) => ({ id: o.id, insurerName: o.insurerName, premiumAmount: o.premiumAmount })),
    rows: Array.from(rowsByKey.values()).sort((a, b) => a.label.localeCompare(b.label)),
  };
}
