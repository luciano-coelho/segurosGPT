import { Car, Home, type LucideIcon } from "lucide-react";
import type { PolicySummary, ProductLineSummary } from "@/server/customer-portfolio";
import { StatusBadge } from "@/components/status";

const LINE_META: Record<string, { label: string; icon: LucideIcon }> = {
  auto: { label: "Auto", icon: Car },
  housing: { label: "Residencial", icon: Home },
};

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function PolicyRow({ policy }: { policy: PolicySummary }) {
  const footer = [
    policy.totalPremium != null ? `R$ ${policy.totalPremium.toLocaleString("pt-BR")}` : null,
    policy.termEndDate ? `vigente até ${formatDate(policy.termEndDate)}` : null,
  ].filter(Boolean);

  return (
    <li>
      <p className="text-sm font-medium text-foreground">{policy.insurerName ?? "Seguradora não informada"}</p>

      {policy.coverageLabels.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {policy.coverageLabels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">Cobertura detalhada indisponível.</p>
      )}

      {footer.length > 0 && <p className="mt-1.5 text-xs text-muted-foreground">{footer.join(" · ")}</p>}
      {policy.productName && <p className="mt-1 text-[10px] text-muted-foreground/60">{policy.productName}</p>}
    </li>
  );
}

export function PolicyLineCard({ line }: { line: ProductLineSummary }) {
  const meta = LINE_META[line.productLine] ?? { label: line.productLine, icon: Car };
  const Icon = meta.icon;
  const hasPolicies = line.policies.length > 0;

  return (
    <div className={`rounded-xl border bg-surface p-4 ${hasPolicies ? "border-border" : "border-neutral/15"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              hasPolicies ? "bg-background text-muted-foreground" : "bg-neutral-soft text-neutral"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
          <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
        </div>
        {!hasPolicies && <StatusBadge status="neutral">Sem apólice</StatusBadge>}
      </div>

      {hasPolicies ? (
        <ul className="mt-3 space-y-3 divide-y divide-border border-t border-border pt-3 [&>li:not(:first-child)]:pt-3">
          {line.policies.map((p) => (
            <PolicyRow key={p.policyId} policy={p} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">Nenhuma apólice encontrada.</p>
      )}
    </div>
  );
}
