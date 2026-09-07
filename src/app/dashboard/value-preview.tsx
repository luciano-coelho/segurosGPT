import { AlertTriangle, TrendingUp } from "lucide-react";
import { StatusBadge } from "@/components/status";

const STAT_CLASS = "text-2xl font-semibold tracking-tight tabular-nums text-foreground";

/**
 * Static value-prop preview - what a broker sees after searching, before
 * they've searched anything. Numbers are illustrative example copy, not
 * live data (unlike the demo CPF chips next to it, which run the real
 * pipeline) - flagged the same way every other illustrative surface in the
 * app is (see docs/ARCHITECTURE.md "Sistema de status de 3 estados").
 */
export function ValuePreview() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 text-left shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">O que você vai ver</p>
        <StatusBadge status="warning">Exemplo</StatusBadge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-y border-border py-4">
        <div>
          <p className={STAT_CLASS}>12</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">clientes analisados</p>
        </div>
        <div>
          <p className={`${STAT_CLASS} text-warning`}>3</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">sobreposições encontradas</p>
        </div>
        <div>
          <p className={`${STAT_CLASS} text-success`}>R$ 340</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">economia média/caso</p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2.25} />
        <p className="text-xs text-foreground">
          Ex.: <span className="font-medium">acidentes pessoais</span> coberto no seguro auto e no residencial ao
          mesmo tempo.
        </p>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <TrendingUp className="h-3 w-3" strokeWidth={2.25} />
        Comparação de propostas e portfólio completo, por CPF
      </div>
    </div>
  );
}
