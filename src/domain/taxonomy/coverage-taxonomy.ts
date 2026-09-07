/**
 * Canonical coverage taxonomy: the layer that lets the Comparison and
 * Overlap engines reason across product lines without knowing each line's
 * own OPIN vocabulary. See docs/ARCHITECTURE.md section 5.
 *
 * A canonical key is (risk, asset), not risk alone: two coverages only
 * really overlap if they protect the same *kind of thing* against the same
 * *kind of risk*. "Roubo do carro" (auto theft) and "roubo do conteúdo da
 * residência" (home contents theft) both being "ROUBO_FURTO" is not a
 * redundancy - they're different assets. Collapsing on risk alone would
 * flag that as a false positive.
 */

export type RiskCategory =
  | "RESPONSABILIDADE_CIVIL"
  | "DANOS_MATERIAIS"
  | "INCENDIO"
  | "ALAGAMENTO"
  | "ROUBO_FURTO"
  | "ACIDENTES_PESSOAIS"
  | "ASSISTENCIA"
  | "VIDROS"
  | "OUTROS";

export type InsuredAsset = "VEICULO" | "IMOVEL" | "CONTEUDO_RESIDENCIA" | "PESSOA" | "OUTRO";

export interface CanonicalCoverage {
  risk: RiskCategory;
  asset: InsuredAsset;
}

export function canonicalKey(c: CanonicalCoverage): string {
  return `${c.risk}::${c.asset}`;
}

const RISK_LABELS: Record<RiskCategory, string> = {
  RESPONSABILIDADE_CIVIL: "Responsabilidade civil",
  DANOS_MATERIAIS: "Danos materiais",
  INCENDIO: "Incêndio",
  ALAGAMENTO: "Alagamento",
  ROUBO_FURTO: "Roubo e furto",
  ACIDENTES_PESSOAIS: "Acidentes pessoais",
  ASSISTENCIA: "Assistência",
  VIDROS: "Vidros",
  OUTROS: "Outros",
};

const ASSET_LABELS: Record<InsuredAsset, string> = {
  VEICULO: "veículo",
  IMOVEL: "imóvel",
  CONTEUDO_RESIDENCIA: "conteúdo da residência",
  PESSOA: "pessoa",
  OUTRO: "outro",
};

export function canonicalLabel(c: CanonicalCoverage): string {
  return `${RISK_LABELS[c.risk]} (${ASSET_LABELS[c.asset]})`;
}

/** Risk name alone, no asset suffix - for contexts where the asset is already implied (e.g. tags on a single policy's card). */
export function riskLabel(risk: RiskCategory): string {
  return RISK_LABELS[risk];
}
