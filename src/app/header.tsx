import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2.25} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            Seguros<span className="text-brand">GPT</span>
          </span>
        </Link>
        <span className="text-xs font-medium text-muted-foreground">Ambiente de demonstração</span>
      </div>
    </header>
  );
}
