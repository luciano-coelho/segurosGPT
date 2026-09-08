/**
 * Matches InsuranceAutoInsuredObjectCoverage.PremiumPeriodicityEnum exactly
 * (insurance-swagger generated model) - the only periodicities that convert
 * cleanly to a monthly figure. ESPORADICA (occasional/irregular) and
 * PAGAMENTO_UNICO (one-off) aren't recurring at a fixed cadence, so there's
 * no honest monthly-equivalent to compute - normalizeToMonthly returns
 * undefined for those, and for OUTROS/unrecognized values, rather than
 * silently mixing them into a monthly total.
 */
const MONTHS_PER_PERIOD: Partial<Record<string, number>> = {
  MENSAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  QUADRIMESTRAL: 4,
  SEMESTRAL: 6,
  ANUAL: 12,
};

/**
 * Converts a premium to its monthly equivalent so summariseCoverages() and
 * estimatePotentialSavings() never sum/compare amounts billed at different
 * cadences as if they were the same unit (e.g. R$100/month vs R$100/year
 * are not the same R$100 - the second is ~R$8.33/month).
 */
export function normalizeToMonthly(amount: number, periodicity: string | undefined): number | undefined {
  if (!periodicity) return undefined;
  const months = MONTHS_PER_PERIOD[periodicity];
  return months ? amount / months : undefined;
}
