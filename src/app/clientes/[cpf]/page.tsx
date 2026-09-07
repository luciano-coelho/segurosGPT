import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, ShieldAlert, Split } from "lucide-react";
import { getCustomerPortfolio, isDemoCpf } from "@/server/customer-portfolio";
import { PolicyLineCard } from "./policy-line-card";
import { IllustrativeComparison } from "./illustrative-analysis";
import { RealOverlapSection, computeOverlapInsight } from "./real-overlap-section";
import { ClientSummary } from "./client-summary";
import { StatusBadge, StatusCard } from "@/components/status";

function formatCpf(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
      Nova busca
    </Link>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  badge,
}: {
  icon: typeof LayoutGrid;
  title: string;
  subtitle: string;
  badge?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {badge}
    </div>
  );
}

export default async function ClientePage({ params }: { params: Promise<{ cpf: string }> }) {
  const { cpf } = await params;

  if (!isDemoCpf(cpf)) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <BackLink />
        <h1 className="mt-4 text-xl font-semibold tracking-tight">CPF {formatCpf(cpf)}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este ambiente é o Mock OPIN, que só tem dados reais para 4 CPFs de teste. Volte e escolha um deles.
        </p>
      </main>
    );
  }

  let portfolio: Awaited<ReturnType<typeof getCustomerPortfolio>> | null = null;
  let portfolioError: string | null = null;
  try {
    portfolio = await getCustomerPortfolio(cpf);
  } catch (err) {
    portfolioError = (err as Error).message;
  }

  const totalPolicies = portfolio?.lines.reduce((sum, l) => sum + l.policies.length, 0) ?? 0;
  const overlapStatusLabel = { positive: "Bem coberto", warning: "Atenção", neutral: "Sem dado" } as const;
  const overlapInsight = portfolio ? computeOverlapInsight(portfolio.offers) : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <BackLink />

      <div className="mt-4 border-b border-border pb-6">
        <p className="text-xs font-medium text-muted-foreground">Cliente</p>
        <h1 className="mt-0.5 font-mono text-xl font-semibold tracking-tight text-foreground">{formatCpf(cpf)}</h1>
      </div>

      {portfolio && overlapInsight && (
        <div className="mt-6">
          <ClientSummary totalPolicies={totalPolicies} overlap={overlapInsight} />
        </div>
      )}

      <section className="mt-10">
        <SectionHeading
          icon={LayoutGrid}
          title="Portfólio no Open Insurance"
          subtitle="O que o cliente já tem contratado, por linha de produto"
          badge={portfolioError ? <StatusBadge status="warning">Falha na consulta</StatusBadge> : undefined}
        />
        {portfolioError ? (
          <StatusCard status="warning">Não foi possível consultar o ambiente OPIN: {portfolioError}</StatusCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {portfolio!.lines.map((line) => (
              <PolicyLineCard key={line.productLine} line={line} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeading
          icon={ShieldAlert}
          title="Alertas de sobreposição"
          subtitle="Cobertura duplicada entre apólices — dado real deste cliente"
          badge={overlapInsight && <StatusBadge status={overlapInsight.status}>{overlapStatusLabel[overlapInsight.status]}</StatusBadge>}
        />
        {portfolioError || !overlapInsight ? (
          <p className="text-sm text-muted-foreground">Indisponível — falha ao consultar o portfólio.</p>
        ) : (
          <RealOverlapSection insight={overlapInsight} />
        )}
      </section>

      <section className="mt-10">
        <SectionHeading
          icon={Split}
          title="Comparação de propostas"
          subtitle="Cotações novas lado a lado, por cobertura e prêmio"
          badge={<StatusBadge status="warning">Dado ilustrativo</StatusBadge>}
        />
        <IllustrativeComparison />
      </section>
    </main>
  );
}
