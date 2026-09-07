import type { CanonicalCoverage } from "./taxonomy/coverage-taxonomy";

export type ProductLine = "auto" | "housing";

export interface NormalizedCoverageItem {
  sourceCode: string;
  productLine: ProductLine;
  /** One source code can bundle more than one canonical risk (e.g. auto's "compreensiva"). */
  canonical: CanonicalCoverage[];
  description?: string;
}

export interface NormalizedOffer {
  id: string;
  kind: "existing_policy" | "quote";
  productLine: ProductLine;
  insurerName?: string;
  premiumAmount?: number;
  coverages: NormalizedCoverageItem[];
}
