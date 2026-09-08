import type { GracePeriodCountingMethod, GracePeriodicity, NormalizedCoverageItem } from "./types";

const UNIT_LABEL: Record<GracePeriodicity, { singular: string; plural: string }> = {
  DIA: { singular: "dia", plural: "dias" },
  MES: { singular: "mês", plural: "meses" },
  ANO: { singular: "ano", plural: "anos" },
};

const COUNTING_SUFFIX: Record<GracePeriodCountingMethod, string> = {
  UTEIS: " úteis",
  CORRIDOS: " corridos",
};

/** Approximate days-per-unit for grace-window math - calendar days regardless of DIAS_UTEIS/DIAS_CORRIDOS, which is a simplification (see isInGracePeriod). */
const APPROX_DAYS: Record<GracePeriodicity, number> = { DIA: 1, MES: 30, ANO: 365 };

/** "Carência de 30 dias úteis — cobertura ainda não vigente para sinistro." - undefined when there's no grace period to report. */
export function graceLabel(item: NormalizedCoverageItem): string | undefined {
  if (!item.gracePeriod || item.gracePeriod <= 0 || !item.gracePeriodicity) return undefined;
  const unit = UNIT_LABEL[item.gracePeriodicity];
  const quantity = item.gracePeriod === 1 ? `1 ${unit.singular}` : `${item.gracePeriod} ${unit.plural}`;
  const suffix = item.gracePeriodicity === "DIA" && item.gracePeriodCountingMethod ? COUNTING_SUFFIX[item.gracePeriodCountingMethod] : "";
  return `Carência de ${quantity}${suffix} — cobertura ainda não vigente para sinistro.`;
}

/**
 * Whether `item` is, as of `now`, still inside its grace window (started at
 * termStartDate, lasting gracePeriod/gracePeriodicity). Approximate: treats
 * MES as 30 days and ANO as 365, calendar days regardless of
 * DIAS_UTEIS/DIAS_CORRIDOS - exact business-day arithmetic isn't worth the
 * complexity for a "heads up, don't treat this as a live overlap yet" flag.
 * false whenever there isn't enough data (no gracePeriod, no termStartDate)
 * to say otherwise.
 */
export function isInGracePeriod(item: NormalizedCoverageItem, now: Date = new Date()): boolean {
  if (!item.gracePeriod || item.gracePeriod <= 0 || !item.gracePeriodicity || !item.termStartDate) return false;
  const start = new Date(item.termStartDate);
  if (Number.isNaN(start.getTime())) return false;
  const graceEnds = new Date(start);
  graceEnds.setDate(graceEnds.getDate() + item.gracePeriod * APPROX_DAYS[item.gracePeriodicity]);
  return now < graceEnds;
}
