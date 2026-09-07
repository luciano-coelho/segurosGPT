import { canonicalKey, canonicalLabel, type CanonicalCoverage } from "./taxonomy/coverage-taxonomy";
import type { NormalizedOffer } from "./types";

export interface OverlapFinding {
  canonicalKey: string;
  label: string;
  canonical: CanonicalCoverage;
  offers: Array<{
    offerId: string;
    productLine: string;
    kind: "existing_policy" | "quote";
    sourceCode: string;
  }>;
}

/**
 * Deterministic redundancy check across a customer's WHOLE portfolio -
 * existing policies and new quotes, any product line, any combination (see
 * docs/ARCHITECTURE.md section 2: not hardcoded to one illustrative pair).
 * Groups coverage by canonical (risk, asset) key; any key touched by more
 * than one offer is a candidate overlap. Matching on asset as well as risk
 * is what keeps this from false-flagging e.g. auto theft against home-
 * contents theft - same risk word, different insured thing.
 */
export function findOverlaps(offers: NormalizedOffer[]): OverlapFinding[] {
  const byKey = new Map<string, OverlapFinding>();

  for (const offer of offers) {
    for (const item of offer.coverages) {
      for (const canonical of item.canonical) {
        const key = canonicalKey(canonical);
        let finding = byKey.get(key);
        if (!finding) {
          finding = { canonicalKey: key, label: canonicalLabel(canonical), canonical, offers: [] };
          byKey.set(key, finding);
        }
        // Same offer can list a category more than once via bundled codes (e.g. "compreensiva");
        // count the offer once per category, not once per source code.
        if (!finding.offers.some((o) => o.offerId === offer.id)) {
          finding.offers.push({
            offerId: offer.id,
            productLine: offer.productLine,
            kind: offer.kind,
            sourceCode: item.sourceCode,
          });
        }
      }
    }
  }

  return Array.from(byKey.values()).filter((finding) => finding.offers.length > 1);
}
