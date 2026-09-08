import { Car, Home, Hourglass, type LucideIcon } from "lucide-react";
import type { CustomerPortfolio, PolicySummary } from "@/server/customer-portfolio";
import type { ProductLine } from "@/domain/types";
import { daysUntil, formatDateBR } from "@/lib/dates";

/** Decorative category identity (not status) - each line of business gets its own tint, the way financial apps color-code categories so you recognize the row shape before reading it. */
const LINE_META: Record<ProductLine, { label: string; icon: LucideIcon; tint: string; tintSoft: string }> = {
  auto: { label: "Auto", icon: Car, tint: "text-tint-auto", tintSoft: "bg-tint-auto-soft" },
  housing: { label: "Residencial", icon: Home, tint: "text-tint-housing", tintSoft: "bg-tint-housing-soft" },
};

const MAX_VISIBLE_TAGS = 2;

function formatCurrency(amount: number): string {
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/** Renewal-clock judgment: overdue or due soon needs attention, comfortably in force doesn't. Same reasoning as everywhere else in the app - color only carries a real judgment, never decoration. */
function expiryTone(days: number): "success" | "warning" {
  return days <= 30 ? "warning" : "success";
}

function LineIcon({ productLine }: { productLine: ProductLine }) {
  const meta = LINE_META[productLine];
  const Icon = meta.icon;
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.tintSoft} ${meta.tint}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
    </span>
  );
}

function CoverageTags({ labels }: { labels: string[] }) {
  if (labels.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const visible = labels.slice(0, MAX_VISIBLE_TAGS);
  const overflow = labels.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((label) => (
        <span key={label} className="whitespace-nowrap rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
          {label}
        </span>
      ))}
      {overflow > 0 && <span className="text-[11px] text-muted-foreground">+{overflow}</span>}
    </div>
  );
}

function PolicyRow({ productLine, policy }: { productLine: ProductLine; policy: PolicySummary }) {
  const meta = LINE_META[productLine];
  const days = daysUntil(policy.termEndDate);
  const hasGraceWarning = policy.graceWarnings.length > 0;

  return (
    <tr className="border-b border-border transition-colors last:border-0 hover:bg-background/70">
      <td className="whitespace-nowrap p-3">
        <span className="flex items-center gap-2 text-sm text-foreground">
          <LineIcon productLine={productLine} />
          {meta.label}
        </span>
      </td>
      <td className="p-3 text-sm text-foreground">{policy.insurerName ?? "—"}</td>
      <td className="p-3">
        <CoverageTags labels={policy.mainCoverageLabels} />
      </td>
      <td className="whitespace-nowrap p-3 text-right">
        {policy.totalPremium != null ? (
          <span className="font-semibold tabular-nums text-success">{formatCurrency(policy.totalPremium)}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td className="whitespace-nowrap p-3">
        {days != null ? (
          <>
            <span className={`font-semibold tabular-nums ${expiryTone(days) === "warning" ? "text-warning" : "text-success"}`}>
              {days < 0 ? `venceu há ${Math.abs(days)}d` : `${days}d`}
            </span>
            {policy.termEndDate && <span className="ml-1.5 text-xs text-muted-foreground">até {formatDateBR(policy.termEndDate)}</span>}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
        {hasGraceWarning && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-warning">
            <Hourglass className="h-3 w-3 shrink-0" strokeWidth={2.25} />
            {policy.graceWarnings[0]}
          </div>
        )}
      </td>
    </tr>
  );
}

/**
 * One compact row per policy, both product lines in the same table - the
 * "loan list" density the user asked for, replacing one big card per
 * policy. Falls back to a single muted row when a line has none, rather
 * than omitting it (so "Auto: nothing" stays visible, not silently absent).
 */
export function PolicyTable({ lines }: { lines: CustomerPortfolio["lines"] }) {
  const rows = lines.flatMap((line) => line.policies.map((policy) => ({ productLine: line.productLine, policy })));
  const emptyLines = lines.filter((line) => line.policies.length === 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background/60 text-left">
            <th className="p-3 text-xs font-medium text-muted-foreground">Linha</th>
            <th className="p-3 text-xs font-medium text-muted-foreground">Seguradora</th>
            <th className="p-3 text-xs font-medium text-muted-foreground">Cobertura</th>
            <th className="p-3 text-right text-xs font-medium text-muted-foreground">Prêmio/mês</th>
            <th className="p-3 text-xs font-medium text-muted-foreground">Vigência</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ productLine, policy }) => (
            <PolicyRow key={policy.policyId} productLine={productLine} policy={policy} />
          ))}
          {emptyLines.map((line) => (
            <tr key={line.productLine} className="border-b border-border transition-colors last:border-0 hover:bg-background/70">
              <td className="whitespace-nowrap p-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LineIcon productLine={line.productLine} />
                  {LINE_META[line.productLine].label}
                </span>
              </td>
              <td colSpan={4} className="p-3 text-sm text-muted-foreground">
                Nenhuma apólice encontrada.
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
