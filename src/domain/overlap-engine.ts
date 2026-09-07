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
    premiumAmount?: number;
    insurerName?: string;
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
            premiumAmount: item.premiumAmount,
            insurerName: offer.insurerName,
          });
        }
      }
    }
  }

  return Array.from(byKey.values()).filter((finding) => finding.offers.length > 1);
}

/**
 * Rough potential-savings estimate: for each finding where at least 2 of
 * the redundant offers carry a premium, assumes the cheaper one could be
 * cancelled (keep the pricier/likely-more-complete coverage, drop the
 * redundant cheaper one) and adds that premium to the total. A judgment
 * call, not a spec - the point is a defensible, conservative number, not
 * "cancel whichever is bigger."
 *
 * Returns 0 when there are no findings at all (nothing to save on), a
 * number when at least one finding has quantifiable premiums, or null when
 * overlaps exist but none of them have premium data to work with (housing
 * coverage never does - see RawAutoCoverage vs RawHousingCoverage).
 */
export function estimatePotentialSavings(findings: OverlapFinding[]): number | null {
  if (findings.length === 0) return 0;

  let total = 0;
  let anyQuantified = false;
  for (const finding of findings) {
    const premiums = finding.offers.map((o) => o.premiumAmount).filter((p): p is number => p != null);
    if (premiums.length >= 2) {
      anyQuantified = true;
      total += Math.min(...premiums);
    }
  }
  return anyQuantified ? total : null;
}
