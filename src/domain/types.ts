import type { CanonicalCoverage } from "./taxonomy/coverage-taxonomy";

export type ProductLine = "auto" | "housing";

/**
 * The app's one status vocabulary — exactly 3 judgment states, always
 * carried by color + icon + border in the UI, never text alone (see
 * src/components/status.tsx):
 *   positive -> client well covered / better price / sales opportunity
 *   warning  -> overlap found / incomplete or simulated data
 *   neutral  -> no judgment ("no data available" etc.)
 * `danger` is deliberately not part of this set - see globals.css.
 * Lives here (not in components/status.tsx) so domain logic - which can
 * compute a Status without any React involved - doesn't depend on the UI
 * layer for a plain string union.
 */
export type Status = "positive" | "warning" | "neutral";

export interface NormalizedCoverageItem {
  sourceCode: string;
  productLine: ProductLine;
  /** One source code can bundle more than one canonical risk (e.g. auto's "compreensiva"). */
  canonical: CanonicalCoverage[];
  description?: string;
  /** Per-coverage premium, when the source API provides one (confirmed present on live auto policy-info; housing's DTO has no equivalent field at all). */
  premiumAmount?: number;
}

export interface NormalizedOffer {
  id: string;
  kind: "existing_policy" | "quote";
  productLine: ProductLine;
  insurerName?: string;
  premiumAmount?: number;
  coverages: NormalizedCoverageItem[];
}
