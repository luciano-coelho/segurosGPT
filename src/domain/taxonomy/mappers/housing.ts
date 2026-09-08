import type { CanonicalCoverage } from "../coverage-taxonomy";
import type { GracePeriodCountingMethod, GracePeriodicity, NormalizedCoverageItem } from "../../types";

/** Matches InsuranceHousingCoverage.CodeEnum exactly (insurance-swagger generated model). */
export type HousingCoverageCode =
  | "DANOS_ELETRICOS"
  | "DANOS_FISICOS_AO_CONTEUDO"
  | "DANOS_FISICOS_AO_IMOVEL"
  | "MORTE_E_INVALIDEZ_TOTAL_E_PERMANENTE"
  | "PAGAMENTO_DE_ALUGUEL"
  | "RESPONSABILIDADE_CIVIL_DO_CONSTRUTOR"
  | "ROUBO_E_FURTO_AO_CONTEUDO"
  | "OUTRAS";

const HOUSING_COVERAGE_MAP: Record<HousingCoverageCode, CanonicalCoverage[]> = {
  DANOS_ELETRICOS: [{ risk: "DANOS_MATERIAIS", asset: "IMOVEL" }],
  DANOS_FISICOS_AO_CONTEUDO: [{ risk: "DANOS_MATERIAIS", asset: "CONTEUDO_RESIDENCIA" }],
  DANOS_FISICOS_AO_IMOVEL: [{ risk: "DANOS_MATERIAIS", asset: "IMOVEL" }],
  // Same canonical key as Auto's personal-accident coverages - home policies
  // often bundle death/disability protection for the policyholder, which
  // can genuinely double up with a standalone or auto-bundled equivalent.
  MORTE_E_INVALIDEZ_TOTAL_E_PERMANENTE: [{ risk: "ACIDENTES_PESSOAIS", asset: "PESSOA" }],
  PAGAMENTO_DE_ALUGUEL: [{ risk: "ASSISTENCIA", asset: "IMOVEL" }],
  RESPONSABILIDADE_CIVIL_DO_CONSTRUTOR: [{ risk: "RESPONSABILIDADE_CIVIL", asset: "IMOVEL" }],
  ROUBO_E_FURTO_AO_CONTEUDO: [{ risk: "ROUBO_FURTO", asset: "CONTEUDO_RESIDENCIA" }],
  OUTRAS: [{ risk: "OUTROS", asset: "OUTRO" }],
};

/** `code` is untyped `string` here, not `HousingCoverageCode` - the live API is not guaranteed to only send codes from our known subset. Unknown codes fall back to OUTROS/OUTRO rather than crash the whole portfolio (see auto.ts's mapAutoCoverageCode, same reasoning). */
export function mapHousingCoverageCode(code: string): CanonicalCoverage[] {
  const mapped = HOUSING_COVERAGE_MAP[code as HousingCoverageCode];
  if (!mapped) {
    console.warn(`[taxonomy] unmapped housing coverage code "${code}", falling back to OUTROS/OUTRO`);
    return [{ risk: "OUTROS", asset: "OUTRO" }];
  }
  return mapped;
}

/** Raw shape of InsuranceHousingCoverage array items - "code"/"description", unlike auto's "coverage"/"coverageDetail". No premiumAmount field exists in this DTO at all (confirmed empirically - see docs/opin-payloads-sample.md), so unlike auto there's nothing to normalize here. */
export interface RawHousingCoverage {
  code: string;
  description?: string;
  isMainCoverage?: boolean;
  termStartDate?: string;
  gracePeriod?: number;
  gracePeriodicity?: GracePeriodicity;
  gracePeriodCountingMethod?: GracePeriodCountingMethod;
}

export function normalizeHousingCoverages(raw: RawHousingCoverage[]): NormalizedCoverageItem[] {
  return raw.map((item) => ({
    sourceCode: item.code,
    productLine: "housing",
    canonical: mapHousingCoverageCode(item.code),
    description: item.description,
    isMainCoverage: item.isMainCoverage,
    termStartDate: item.termStartDate,
    gracePeriod: item.gracePeriod,
    gracePeriodicity: item.gracePeriodicity,
    gracePeriodCountingMethod: item.gracePeriodCountingMethod,
  }));
}
