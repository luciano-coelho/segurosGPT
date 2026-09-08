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

export type GracePeriodicity = "DIA" | "MES" | "ANO";
export type GracePeriodCountingMethod = "UTEIS" | "CORRIDOS";

export interface NormalizedCoverageItem {
  sourceCode: string;
  productLine: ProductLine;
  /** One source code can bundle more than one canonical risk (e.g. auto's "compreensiva"). */
  canonical: CanonicalCoverage[];
  description?: string;
  /**
   * Per-coverage premium, monthly-normalized (see src/domain/premium.ts),
   * when the source API provides both an amount AND a periodicity we can
   * safely convert (confirmed present on live auto policy-info; housing's
   * DTO has no premiumAmount field at all, only a moot premiumPeriodicity).
   * Never a raw, un-normalized amount - comparing/summing raw amounts
   * across different periodicities (e.g. monthly vs annual) is wrong.
   */
  premiumAmount?: number;
  /** True for the coverage that defines the policy itself, false/absent for accessory coverages - the future Gap Engine only treats main coverages as "expected" (see docs/ARCHITECTURE.md). */
  isMainCoverage?: boolean;
  /** This specific coverage's own term start - not necessarily the same as the policy's, though it usually is in this mock. */
  termStartDate?: string;
  /** Absent/0 = no grace period. When present and >0, the coverage isn't in force yet for `gracePeriod` `gracePeriodicity` units from `termStartDate` (see src/domain/grace-period.ts). Not always present even when the schema supports it - confirmed empirically absent on some live auto responses. */
  gracePeriod?: number;
  gracePeriodicity?: GracePeriodicity;
  gracePeriodCountingMethod?: GracePeriodCountingMethod;
}

export interface NormalizedOffer {
  id: string;
  kind: "existing_policy" | "quote";
  productLine: ProductLine;
  insurerName?: string;
  premiumAmount?: number;
  coverages: NormalizedCoverageItem[];
}
