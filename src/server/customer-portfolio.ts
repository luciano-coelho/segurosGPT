import "server-only";
import { getAuthorisedAccessToken } from "@/lib/opin-client/consent";
import { getAutoPolicies, getAutoPolicyInfo } from "@/lib/opin-client/policies/auto";
import { getHousingPolicies, getHousingPolicyInfo } from "@/lib/opin-client/policies/housing";
import { demoAccountsByCpf } from "@/lib/opin-client/config";
import { normalizeAutoCoverages, type RawAutoCoverage } from "@/domain/taxonomy/mappers/auto";
import { normalizeHousingCoverages, type RawHousingCoverage } from "@/domain/taxonomy/mappers/housing";
import { riskLabel } from "@/domain/taxonomy/coverage-taxonomy";
import type { NormalizedOffer, ProductLine } from "@/domain/types";

/** What a broker needs to decide something, not proof the integration works - no product plan name, no raw policy id (see docs/ARCHITECTURE.md "Histórico de decisões"). */
export interface PolicySummary {
  policyId: string;
  /** Small/secondary in the UI - commercial plan name has no decision value on its own. */
  productName?: string;
  insurerName?: string;
  /** Deduped, short risk labels (e.g. "Danos materiais", "Incêndio") - the actual coverage, which is what a broker scans for. */
  coverageLabels: string[];
  /** Sum of per-coverage premiums, only when the source API provided them (auto does; housing's DTO has no such field). */
  totalPremium?: number;
  termStartDate?: string;
  termEndDate?: string;
}

export interface ProductLineSummary {
  productLine: ProductLine;
  policies: PolicySummary[];
}

export interface CustomerPortfolio {
  cpf: string;
  consentId: string;
  lines: ProductLineSummary[];
  /** Real, coverage-level offers for the domain engines - one per existing policy, empty coverages array if policy-info couldn't be fetched. */
  offers: NormalizedOffer[];
}

interface RawPolicyListResponse {
  data: Array<{
    brand?: string;
    companies: Array<{
      companyName?: string;
      cnpjNumber?: string;
      policies: Array<{ policyId: string; productName?: string }>;
    }>;
  }>;
}

interface RawAutoPolicyInfoResponse {
  // Despite the generated Java DTO having a flat top-level `coverages`
  // field, the mock's actual live response nests it under insuredObjects,
  // same shape as housing - confirmed empirically, not from the model.
  data: { insuredObjects?: Array<{ coverages?: RawAutoCoverage[] }>; termStartDate?: string; termEndDate?: string };
}

interface RawHousingPolicyInfoResponse {
  data: { insuredObjects?: Array<{ coverages?: RawHousingCoverage[] }>; termStartDate?: string; termEndDate?: string };
}

export function isDemoCpf(cpf: string): boolean {
  return cpf in demoAccountsByCpf;
}

function summariseCoverages(offer: NormalizedOffer): { labels: string[]; totalPremium?: number } {
  const labels = new Set<string>();
  let totalPremium = 0;
  let anyPremium = false;
  for (const item of offer.coverages) {
    for (const canonical of item.canonical) labels.add(riskLabel(canonical.risk));
    if (item.premiumAmount != null) {
      anyPremium = true;
      totalPremium += item.premiumAmount;
    }
  }
  return { labels: Array.from(labels), totalPremium: anyPremium ? totalPremium : undefined };
}

interface PolicyDetail {
  policy: PolicySummary;
  offer: NormalizedOffer;
}

async function buildAutoPolicyDetail(
  accessToken: string,
  insurerName: string | undefined,
  raw: { policyId: string; productName?: string },
): Promise<PolicyDetail> {
  const info = (await getAutoPolicyInfo(accessToken, raw.policyId)) as RawAutoPolicyInfoResponse;
  const rawCoverages = (info.data.insuredObjects ?? []).flatMap((obj) => obj.coverages ?? []);
  const offer: NormalizedOffer = {
    id: raw.policyId,
    kind: "existing_policy",
    productLine: "auto",
    insurerName,
    coverages: normalizeAutoCoverages(rawCoverages),
  };
  const { labels, totalPremium } = summariseCoverages(offer);
  return {
    offer,
    policy: {
      policyId: raw.policyId,
      productName: raw.productName,
      insurerName,
      coverageLabels: labels,
      totalPremium,
      termStartDate: info.data.termStartDate,
      termEndDate: info.data.termEndDate,
    },
  };
}

async function buildHousingPolicyDetail(
  accessToken: string,
  insurerName: string | undefined,
  raw: { policyId: string; productName?: string },
): Promise<PolicyDetail> {
  const info = (await getHousingPolicyInfo(accessToken, raw.policyId)) as RawHousingPolicyInfoResponse;
  const rawCoverages = (info.data.insuredObjects ?? []).flatMap((obj) => obj.coverages ?? []);
  const offer: NormalizedOffer = {
    id: raw.policyId,
    kind: "existing_policy",
    productLine: "housing",
    insurerName,
    coverages: normalizeHousingCoverages(rawCoverages),
  };
  const { labels, totalPremium } = summariseCoverages(offer);
  return {
    offer,
    policy: {
      policyId: raw.policyId,
      productName: raw.productName,
      insurerName,
      coverageLabels: labels,
      totalPremium,
      termStartDate: info.data.termStartDate,
      termEndDate: info.data.termEndDate,
    },
  };
}

function rawPolicies(raw: RawPolicyListResponse): { insurerName?: string; policies: Array<{ policyId: string; productName?: string }> } {
  const company = raw.data[0]?.companies[0];
  return { insurerName: company?.companyName, policies: company?.policies ?? [] };
}

/**
 * Real, live portfolio for a demo CPF: what the customer already has in
 * Auto and Housing (only lines wired up so far - see docs/ARCHITECTURE.md
 * section 5), including coverage-level detail per policy. Getting that
 * detail requires selecting the offered resources during the headless
 * consent interaction (see consent.ts / ARCHITECTURE.md section 9) - a
 * policy whose policy-info fetch fails is dropped from both `lines` and
 * `offers` rather than failing the whole portfolio.
 */
export async function getCustomerPortfolio(cpf: string): Promise<CustomerPortfolio> {
  const { accessToken, consentId } = await getAuthorisedAccessToken(
    cpf,
    [
      "RESOURCES_READ",
      "DAMAGES_AND_PEOPLE_AUTO_READ",
      "DAMAGES_AND_PEOPLE_AUTO_POLICYINFO_READ",
      "DAMAGES_AND_PEOPLE_HOUSING_READ",
      "DAMAGES_AND_PEOPLE_HOUSING_POLICYINFO_READ",
    ],
    ["resources", "insurance-auto", "insurance-housing"],
  );

  const [auto, housing] = await Promise.all([
    getAutoPolicies(accessToken) as Promise<RawPolicyListResponse>,
    getHousingPolicies(accessToken) as Promise<RawPolicyListResponse>,
  ]);
  const autoRaw = rawPolicies(auto);
  const housingRaw = rawPolicies(housing);

  const [autoResults, housingResults] = await Promise.all([
    Promise.allSettled(autoRaw.policies.map((p) => buildAutoPolicyDetail(accessToken, autoRaw.insurerName, p))),
    Promise.allSettled(housingRaw.policies.map((p) => buildHousingPolicyDetail(accessToken, housingRaw.insurerName, p))),
  ]);

  const autoDetails = autoResults.filter((r): r is PromiseFulfilledResult<PolicyDetail> => r.status === "fulfilled").map((r) => r.value);
  const housingDetails = housingResults.filter((r): r is PromiseFulfilledResult<PolicyDetail> => r.status === "fulfilled").map((r) => r.value);

  return {
    cpf,
    consentId,
    lines: [
      { productLine: "auto", policies: autoDetails.map((d) => d.policy) },
      { productLine: "housing", policies: housingDetails.map((d) => d.policy) },
    ],
    offers: [...autoDetails, ...housingDetails].map((d) => d.offer),
  };
}
