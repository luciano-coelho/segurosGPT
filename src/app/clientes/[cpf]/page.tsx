import Link from "next/link";
import { ArrowLeft, LayoutGrid, ShieldAlert, Split, UserRound } from "lucide-react";
import { getCustomerPortfolio, isDemoCpf } from "@/server/customer-portfolio";
import { CustomerIdentityBlock } from "./customer-identity-block";
import { PolicyTable } from "./policy-table";
import { IllustrativeComparison } from "./illustrative-analysis";
import { RealOverlapSection, computeOverlapInsight } from "./real-overlap-section";
import { ClientSummary } from "./client-summary";
import { ChatWidget } from "./chat-widget";
import { SectionFrame } from "@/components/section-frame";
import { StatusBadge, StatusCard } from "@/components/status";
import { formatCpf } from "@/lib/format";

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

  const allPolicies = portfolio?.lines.flatMap((l) => l.policies) ?? [];
  const totalPolicies = allPolicies.length;
  const premiums = allPolicies.map((p) => p.totalPremium).filter((p): p is number => p != null);
  const totalMonthlyPremium = premiums.length > 0 ? premiums.reduce((sum, p) => sum + p, 0) : undefined;
  const overlapStatusLabel = { positive: "Bem coberto", warning: "Atenção", neutral: "Sem dado" } as const;
  const overlapInsight = portfolio ? computeOverlapInsight(portfolio.offers) : null;

  return (
    <main className="hero-gradient mx-auto max-w-6xl px-6 py-8">
      <BackLink />

      {portfolioError || !portfolio ? (
        <div className="mt-4">
          <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">{formatCpf(cpf)}</h1>
          <div className="mt-4">
            <StatusCard status="warning">Não foi possível consultar o ambiente OPIN: {portfolioError}</StatusCard>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <SectionFrame icon={UserRound} title="Cliente" subtitle="Identificação no Open Insurance">
              <CustomerIdentityBlock cpf={cpf} customer={portfolio.customer} />
            </SectionFrame>

            <SectionFrame icon={LayoutGrid} title="Portfólio no Open Insurance" subtitle="O que o cliente já tem contratado, por linha de produto">
              <PolicyTable lines={portfolio.lines} />
            </SectionFrame>

            <SectionFrame
              icon={ShieldAlert}
              title="Alertas de sobreposição"
              subtitle="Cobertura duplicada entre apólices — dado real deste cliente"
              badge={overlapInsight && <StatusBadge status={overlapInsight.status}>{overlapStatusLabel[overlapInsight.status]}</StatusBadge>}
            >
              {overlapInsight && <RealOverlapSection insight={overlapInsight} />}
            </SectionFrame>

            <SectionFrame
              icon={Split}
              title="Comparação de propostas"
              subtitle="Cotações novas lado a lado, por cobertura e prêmio"
              badge={<StatusBadge status="warning">Dado ilustrativo</StatusBadge>}
            >
              <IllustrativeComparison />
            </SectionFrame>
          </div>

          {overlapInsight && (
            <aside className="relative order-first lg:sticky lg:top-6 lg:order-none">
              <SectionFrame>
                <ClientSummary totalPolicies={totalPolicies} totalMonthlyPremium={totalMonthlyPremium} overlap={overlapInsight} />
              </SectionFrame>
              <ChatWidget />
            </aside>
          )}
        </div>
      )}
    </main>
  );
}
