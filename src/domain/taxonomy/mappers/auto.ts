import type { CanonicalCoverage } from "../coverage-taxonomy";
import type { NormalizedCoverageItem } from "../../types";

/**
 * Matches InsuranceAutoCoverage.CodeEnum / QuoteAutoCoverage.CodeEnum exactly
 * (insurance-swagger generated models) - confirmed identical between the
 * quote and policy APIs for auto, unlike their conformance-suite reference
 * specs across versions (see docs/ARCHITECTURE.md section 9).
 */
export type AutoCoverageCode =
  | "CASCO_COMPREENSIVA"
  | "CASCO_INCENDIO_ROUBO_E_FURTO"
  | "CASCO_ROUBO_E_FURTO"
  | "CASCO_INCENDIO"
  | "CASCO_ALAGAMENTO"
  | "CASCO_COLISAO_INDENIZACAO_PARCIAL"
  | "CASCO_COLISAO_INDENIZACAO_INTEGRAL"
  | "RESPONSABILIDADE_CIVIL_FACULTATIVA_DE_VEICULOS_RCFV"
  | "RESPONSABILIDADE_CIVIL_FACULTATIVA_DO_CONDUTOR_RCFC"
  | "ACIDENTE_PESSOAIS_DE_PASSAGEIROS_APP_VEICULO"
  | "ACIDENTE_PESSOAIS_DE_PASSAGEIROS_APP_CONDUTOR"
  | "VIDROS"
  | "DIARIA_POR_INDISPONIBILIDADE"
  | "LFR_LANTERNAS_FAROIS_E_RETROVISORES"
  | "ACESSORIOS_E_EQUIPAMENTOS"
  | "CARRO_RESERVA"
  | "PEQUENOS_REPAROS"
  | "RESPONSABILIDADE_CIVIL_CARTA_VERDE"
  | "RESPONSABILIDADE_CIVIL_VEICULOS_DE_PASSEIO_ACORDOS_FORA_DO_MERCOSUL"
  | "OUTRAS";

/** A code can bundle more than one canonical risk (e.g. "compreensiva" = collision + fire + theft). */
const AUTO_COVERAGE_MAP: Record<AutoCoverageCode, CanonicalCoverage[]> = {
  CASCO_COMPREENSIVA: [
    { risk: "DANOS_MATERIAIS", asset: "VEICULO" },
    { risk: "INCENDIO", asset: "VEICULO" },
    { risk: "ROUBO_FURTO", asset: "VEICULO" },
  ],
  CASCO_INCENDIO_ROUBO_E_FURTO: [
    { risk: "INCENDIO", asset: "VEICULO" },
    { risk: "ROUBO_FURTO", asset: "VEICULO" },
  ],
  CASCO_ROUBO_E_FURTO: [{ risk: "ROUBO_FURTO", asset: "VEICULO" }],
  CASCO_INCENDIO: [{ risk: "INCENDIO", asset: "VEICULO" }],
  CASCO_ALAGAMENTO: [{ risk: "ALAGAMENTO", asset: "VEICULO" }],
  CASCO_COLISAO_INDENIZACAO_PARCIAL: [{ risk: "DANOS_MATERIAIS", asset: "VEICULO" }],
  CASCO_COLISAO_INDENIZACAO_INTEGRAL: [{ risk: "DANOS_MATERIAIS", asset: "VEICULO" }],
  RESPONSABILIDADE_CIVIL_FACULTATIVA_DE_VEICULOS_RCFV: [{ risk: "RESPONSABILIDADE_CIVIL", asset: "VEICULO" }],
  RESPONSABILIDADE_CIVIL_FACULTATIVA_DO_CONDUTOR_RCFC: [{ risk: "RESPONSABILIDADE_CIVIL", asset: "PESSOA" }],
  ACIDENTE_PESSOAIS_DE_PASSAGEIROS_APP_VEICULO: [{ risk: "ACIDENTES_PESSOAIS", asset: "PESSOA" }],
  ACIDENTE_PESSOAIS_DE_PASSAGEIROS_APP_CONDUTOR: [{ risk: "ACIDENTES_PESSOAIS", asset: "PESSOA" }],
  VIDROS: [{ risk: "VIDROS", asset: "VEICULO" }],
  DIARIA_POR_INDISPONIBILIDADE: [{ risk: "ASSISTENCIA", asset: "VEICULO" }],
  LFR_LANTERNAS_FAROIS_E_RETROVISORES: [{ risk: "DANOS_MATERIAIS", asset: "VEICULO" }],
  ACESSORIOS_E_EQUIPAMENTOS: [{ risk: "DANOS_MATERIAIS", asset: "VEICULO" }],
  CARRO_RESERVA: [{ risk: "ASSISTENCIA", asset: "VEICULO" }],
  PEQUENOS_REPAROS: [{ risk: "ASSISTENCIA", asset: "VEICULO" }],
  RESPONSABILIDADE_CIVIL_CARTA_VERDE: [{ risk: "RESPONSABILIDADE_CIVIL", asset: "VEICULO" }],
  RESPONSABILIDADE_CIVIL_VEICULOS_DE_PASSEIO_ACORDOS_FORA_DO_MERCOSUL: [{ risk: "RESPONSABILIDADE_CIVIL", asset: "VEICULO" }],
  OUTRAS: [{ risk: "OUTROS", asset: "OUTRO" }],
};

export function mapAutoCoverageCode(code: AutoCoverageCode): CanonicalCoverage[] {
  return AUTO_COVERAGE_MAP[code];
}

/** Raw shape of InsuranceAutoCoverage / QuoteAutoCoverage array items - field names ("coverage"/"coverageDetail") are specific to the auto APIs. */
export interface RawAutoCoverage {
  coverage: AutoCoverageCode;
  coverageDetail?: string;
}

export function normalizeAutoCoverages(raw: RawAutoCoverage[]): NormalizedCoverageItem[] {
  return raw.map((item) => ({
    sourceCode: item.coverage,
    productLine: "auto",
    canonical: mapAutoCoverageCode(item.coverage),
    description: item.coverageDetail,
  }));
}
