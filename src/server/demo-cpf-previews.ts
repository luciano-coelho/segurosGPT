import "server-only";
import { DEMO_CPFS } from "@/domain/demo-cpfs";
import { computeOverlapInsight } from "@/domain/overlap-insight";
import { getCustomerPortfolio } from "./customer-portfolio";

export interface DemoCpfPreview {
  cpf: string;
  label: string;
  status: "positive" | "warning" | "neutral";
}

const STATUS_LABEL = { positive: "Portfólio limpo", warning: "Sobreposição encontrada", neutral: "Sem cobertura detalhada" } as const;

/**
 * Real per-CPF status for the dashboard's demo chips - not fabricated
 * copy. Runs the actual headless-consent + overlap pipeline for each of
 * the 4 demo CPFs so whoever is running a demo can see which one (if any)
 * currently shows a genuine overlap, instead of four identical-looking
 * chips. If none do today, the chips say so honestly (see
 * docs/ARCHITECTURE.md "Pontos em aberto" - usuario3/10117409073's login
 * still fails, and the mock's live coverage data means "shows overlap" can
 * change between requests).
 */
export async function getDemoCpfPreviews(): Promise<DemoCpfPreview[]> {
  const results = await Promise.allSettled(
    DEMO_CPFS.map(async (cpf) => {
      const portfolio = await getCustomerPortfolio(cpf);
      const totalPolicies = portfolio.lines.reduce((sum, l) => sum + l.policies.length, 0);
      const insight = computeOverlapInsight(portfolio.offers);
      const policyWord = totalPolicies === 1 ? "apólice" : "apólices";
      return { cpf, status: insight.status, label: `${totalPolicies} ${policyWord} — ${STATUS_LABEL[insight.status]}` };
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { cpf: DEMO_CPFS[i], status: "neutral" as const, label: "Indisponível no momento" },
  );
}
