import { formatCpf } from "@/lib/format";
import { formatDateBR } from "@/lib/dates";
import type { CustomerIdentity } from "@/server/customer-portfolio";

function Field({ label, value, wide, emphasis }: { label: string; value: string; wide?: boolean; emphasis?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={emphasis ? "font-display text-base font-medium text-foreground" : "text-sm text-foreground"}>{value}</p>
    </div>
  );
}

/**
 * Dense identification block, not a card with breathing room - the goal is
 * everything visible at once, no scrolling (user's explicit spec). Label
 * on top of value, small and uppercase, tight vertical rhythm. Only the
 * name gets the display face/size bump - it's the closest thing to a
 * "title" here, everything else stays plain and small on purpose.
 */
export function CustomerIdentityBlock({ cpf, customer }: { cpf: string; customer: CustomerIdentity }) {
  const birthDisplay = customer.birthDate
    ? `${formatDateBR(customer.birthDate)}${customer.age != null ? ` (${customer.age} anos)` : ""}`
    : "—";
  const cityState = [customer.city, customer.state].filter(Boolean).join(" - ") || "—";

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        <Field label="Nome" value={customer.name ?? "—"} emphasis />
        <Field label="CPF" value={formatCpf(cpf)} />
        <Field label="Nascimento" value={birthDisplay} />
        <Field label="Cidade / Estado" value={cityState} />
        <Field label="Endereço" value={customer.address ?? "—"} wide />
      </div>
    </div>
  );
}
