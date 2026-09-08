import type { OverlapInsight } from "./real-overlap-section";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/**
 * "accent" is the editorial-metric default for a plain fact (no judgment
 * attached) - Apólices ativas, Prêmio mensal. "success"/"warning"/"neutral"
 * are reserved for the two tiles that carry an actual finding (Sobreposições,
 * Economia potencial) - those come from src/domain's status vocabulary and
 * must keep meaning "good/attention/no data", not just "highlighted number".
 */
const TONE_CLASS: Record<"accent" | "success" | "warning" | "neutral", string> = {
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  neutral: "text-foreground",
};

function KpiTile({
  label,
  value,
  sublabel,
  tone,
}: {
  label: string;
  value: string;
  sublabel: string;
  tone: "accent" | "success" | "warning" | "neutral";
}) {
  return (
    <div className="flex-1 px-5 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-3xl font-semibold tracking-tight tabular-nums ${TONE_CLASS[tone]}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}

/**
 * The one-glance answer to "does this client have a problem or not" - what
 * a broker actually opens the page wanting to know, ahead of the detail
 * sections below (requested explicitly: this block replaces reading all of
 * them to form an opinion). Order is fixed: apólices, prêmio, sobreposições,
 * economia - inventory facts first, then the two judgment tiles.
 */
export function ClientSummary({
  totalPolicies,
  totalMonthlyPremium,
  overlap,
}: {
  totalPolicies: number;
  totalMonthlyPremium?: number;
  overlap: OverlapInsight;
}) {
  const overlapCount = overlap.overlaps.length;

  const overlapValue = overlapCount === 0 ? "0" : String(overlapCount);
  const overlapSub =
    overlap.withCoverageCount === 0
      ? "sem cobertura detalhada disponível"
      : overlapCount === 0
        ? "portfólio limpo"
        : overlapCount === 1
          ? "sobreposição encontrada"
          : "sobreposições encontradas";
  const overlapTone: "success" | "warning" | "neutral" = overlap.status === "positive" ? "success" : overlap.status === "warning" ? "warning" : "neutral";

  const savingsValue = overlap.savings === null ? "—" : overlap.savings === 0 ? "—" : formatCurrency(overlap.savings);
  const savingsSub =
    overlap.savings === null
      ? "sem dado de prêmio disponível"
      : overlap.savings === 0
        ? "nada a economizar"
        : "estimativa, ao cancelar a cobertura redundante mais barata";
  const savingsTone: "success" | "warning" | "neutral" = overlap.savings && overlap.savings > 0 ? "success" : "neutral";

  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface shadow-md sm:flex-row sm:divide-x sm:divide-y-0">
      <KpiTile label="Apólices ativas" value={String(totalPolicies)} sublabel="no Open Insurance" tone="accent" />
      <KpiTile
        label="Prêmio mensal equiv."
        value={totalMonthlyPremium != null ? formatCurrency(totalMonthlyPremium) : "—"}
        sublabel={totalMonthlyPremium != null ? "soma normalizada por mês" : "sem dado de prêmio disponível"}
        tone="accent"
      />
      <KpiTile label="Sobreposições" value={overlapValue} sublabel={overlapSub} tone={overlapTone} />
      <KpiTile label="Economia potencial" value={savingsValue} sublabel={savingsSub} tone={savingsTone} />
    </div>
  );
}
