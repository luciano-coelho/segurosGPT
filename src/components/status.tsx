import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CircleCheck, Info } from "lucide-react";
import type { Status } from "@/domain/types";

export type { Status } from "@/domain/types";

const STATUS_META: Record<Status, { icon: LucideIcon; border: string; bg: string; text: string; label: string }> = {
  positive: { icon: CircleCheck, border: "border-success/25", bg: "bg-success-soft", text: "text-success", label: "Positivo" },
  warning: { icon: AlertTriangle, border: "border-warning/30", bg: "bg-warning-soft", text: "text-warning", label: "Atenção" },
  neutral: { icon: Info, border: "border-neutral/20", bg: "bg-neutral-soft", text: "text-neutral", label: "Sem dado" },
};

export function StatusBadge({ status, children }: { status: Status; children: ReactNode }) {
  const { bg, text, icon: Icon } = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${bg} px-2.5 py-1 text-xs font-medium ${text}`}>
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {children}
    </span>
  );
}

export function StatusCard({
  status,
  children,
  icon,
}: {
  status: Status;
  children: ReactNode;
  /** Override the default icon for this status (e.g. a duplicate-coverage icon instead of the generic warning triangle). */
  icon?: LucideIcon;
}) {
  const meta = STATUS_META[status];
  const Icon = icon ?? meta.icon;
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border ${meta.border} ${meta.bg} px-4 py-3`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.text}`} strokeWidth={2.25} />
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}
