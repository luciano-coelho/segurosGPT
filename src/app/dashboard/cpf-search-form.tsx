"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { StatusBadge } from "@/components/status";
import { formatCpf } from "@/lib/format";
import type { DemoCpfPreview } from "@/server/demo-cpf-previews";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function CpfSearchForm({ demoCpfs }: { demoCpfs: DemoCpfPreview[] }) {
  const router = useRouter();
  const [cpf, setCpf] = useState("");

  function goToCpf(value: string) {
    const digits = onlyDigits(value);
    if (digits.length !== 11) return;
    router.push(`/clientes/${digits}`);
  }

  const isValid = onlyDigits(cpf).length === 11;

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToCpf(cpf);
        }}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface p-1.5 shadow-md transition-shadow focus-within:border-accent/50 focus-within:shadow-lg focus-within:ring-4 focus-within:ring-accent/10"
      >
        <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
        <input
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="000.000.000-00"
          inputMode="numeric"
          maxLength={14}
          autoFocus
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!isValid}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm transition-all hover:enabled:scale-[1.03] hover:enabled:shadow-md active:enabled:scale-[0.98] disabled:opacity-35"
        >
          Buscar
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-left shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">Clientes de demonstração</p>
        <div className="mt-2.5 space-y-1.5">
          {demoCpfs.map((d) => (
            <button
              key={d.cpf}
              type="button"
              onClick={() => goToCpf(d.cpf)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md active:translate-y-0"
            >
              <span className="font-mono text-xs text-foreground/80">{formatCpf(d.cpf)}</span>
              <StatusBadge status={d.status}>{d.label}</StatusBadge>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
