import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Header() {
  return (
    <>
      {/* Thin brand rule across the very top of the page - the one thing marking this as a product with its own identity, not a generic internal tool. */}
      <div className="h-[3px] w-full bg-brand" />
      <header className="border-b border-border bg-surface/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
              <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2.25} />
            </span>
            <span className="font-display text-[16px] font-semibold tracking-tight">
              Seguros<span className="text-brand">GPT</span>
            </span>
          </Link>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">Ambiente de demonstração</span>
        </div>
      </header>
    </>
  );
}
