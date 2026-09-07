import { findOverlaps, estimatePotentialSavings, type OverlapFinding } from "./overlap-engine";
import type { NormalizedOffer, Status } from "./types";

export interface OverlapInsight {
  status: Status;
  withCoverageCount: number;
  overlaps: OverlapFinding[];
  /** null = overlaps exist but no premium data to quantify them; 0 = no overlaps at all. */
  savings: number | null;
}

/**
 * Single source of truth for a customer's overlap status - used by the
 * client page (section badge, KPI summary, section body) and by the
 * dashboard's demo-CPF previews (src/server/demo-cpf-previews.ts), so both
 * places agree on what "this client has an overlap" means. Pure
 * computation, no I/O - takes already-fetched offers.
 */
export function computeOverlapInsight(offers: NormalizedOffer[]): OverlapInsight {
  const withCoverage = offers.filter((o) => o.coverages.length > 0);
  const overlaps = findOverlaps(withCoverage);
  const status: Status = withCoverage.length === 0 ? "neutral" : overlaps.length > 0 ? "warning" : "positive";
  return { status, withCoverageCount: withCoverage.length, overlaps, savings: estimatePotentialSavings(overlaps) };
}
