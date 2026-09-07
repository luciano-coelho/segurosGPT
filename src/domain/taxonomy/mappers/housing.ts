import type { CanonicalCoverage } from "../coverage-taxonomy";
import type { NormalizedCoverageItem } from "../../types";

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

export function mapHousingCoverageCode(code: HousingCoverageCode): CanonicalCoverage[] {
  return HOUSING_COVERAGE_MAP[code];
}

/** Raw shape of InsuranceHousingCoverage array items - "code"/"description", unlike auto's "coverage"/"coverageDetail". */
export interface RawHousingCoverage {
  code: HousingCoverageCode;
  description?: string;
}

export function normalizeHousingCoverages(raw: RawHousingCoverage[]): NormalizedCoverageItem[] {
  return raw.map((item) => ({
    sourceCode: item.code,
    productLine: "housing",
    canonical: mapHousingCoverageCode(item.code),
    description: item.description,
  }));
}
