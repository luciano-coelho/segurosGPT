import "server-only";
import { getAuthorisedAccessToken } from "@/lib/opin-client/consent";
import { getAutoPolicies, getAutoPolicyInfo } from "@/lib/opin-client/policies/auto";
import { getHousingPolicies, getHousingPolicyInfo } from "@/lib/opin-client/policies/housing";
import { demoAccountsByCpf } from "@/lib/opin-client/config";
import { normalizeAutoCoverages, type RawAutoCoverage } from "@/domain/taxonomy/mappers/auto";
import { normalizeHousingCoverages, type RawHousingCoverage } from "@/domain/taxonomy/mappers/housing";
import { riskLabel } from "@/domain/taxonomy/coverage-taxonomy";
import { graceLabel } from "@/domain/grace-period";
import type { NormalizedOffer, ProductLine } from "@/domain/types";

/** What a broker needs to decide something, not proof the integration works - no product plan name, no raw policy id (see docs/ARCHITECTURE.md "Histórico de decisões"). */
export interface PolicySummary {
  policyId: string;
  /** Small/secondary in the UI - commercial plan name has no decision value on its own. */
  productName?: string;
  insurerName?: string;
  /** Deduped, short risk labels (e.g. "Danos materiais", "Incêndio") - the actual coverage, which is what a broker scans for. */
  coverageLabels: string[];
  /** Same as coverageLabels, but only for coverages where isMainCoverage !== false - what the compact policy row shows (accessory coverage is noise there). */
  mainCoverageLabels: string[];
  /** Sum of per-coverage monthly-normalized premiums (see src/domain/premium.ts), only when the source API provided them (auto does; housing's DTO has no such field). */
  totalPremium?: number;
  termStartDate?: string;
  termEndDate?: string;
  /** Short warnings for coverages with a grace period > 0 (see src/domain/grace-period.ts) - deduped, present regardless of whether the window has already elapsed. */
  graceWarnings: string[];
}

export interface ProductLineSummary {
  productLine: ProductLine;
  policies: PolicySummary[];
}

export interface CustomerIdentity {
  name?: string;
  birthDate?: string;
  /** Whole years as of today, computed from birthDate - see ageFromBirthDate. */
  age?: number;
  city?: string;
  state?: string;
  address?: string;
}

export interface CustomerPortfolio {
  cpf: string;
  consentId: string;
  /** From the first policy whose `insureds` list has an entry matching this CPF - fields stay undefined when no policy has one (see matchingInsured). */
  customer: CustomerIdentity;
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

interface RawInsured {
  identification?: string;
  name?: string;
  birthDate?: string;
  city?: string;
  state?: string;
  address?: string;
}

interface RawAutoPolicyInfoResponse {
  // Despite the generated Java DTO having a flat top-level `coverages`
  // field, the mock's actual live response nests it under insuredObjects,
  // same shape as housing - confirmed empirically, not from the model.
  data: { insuredObjects?: Array<{ coverages?: RawAutoCoverage[] }>; termStartDate?: string; termEndDate?: string; insureds?: RawInsured[] };
}

interface RawHousingPolicyInfoResponse {
  data: { insuredObjects?: Array<{ coverages?: RawHousingCoverage[] }>; termStartDate?: string; termEndDate?: string; insureds?: RawInsured[] };
}

/**
 * `insureds[]` isn't reliably the searched customer - confirmed empirically
 * that housing's mock data can return an entry for a completely different
 * CPF (placeholder seed data, not tied to the actual policy owner). Only
 * trust an entry whose `identification` matches the CPF we searched for.
 */
function matchingInsured(insureds: RawInsured[] | undefined, cpf: string): RawInsured | undefined {
  return insureds?.find((i) => i.identification === cpf);
}

/** Whole-years age as of today - returns undefined for a missing or unparseable birthDate rather than a wrong number. */
function ageFromBirthDate(birthDate: string | undefined): number | undefined {
  if (!birthDate) return undefined;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear = now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function identityFromInsured(insured: RawInsured | undefined): CustomerIdentity | undefined {
  if (!insured) return undefined;
  return {
    name: insured.name,
    birthDate: insured.birthDate,
    age: ageFromBirthDate(insured.birthDate),
    city: insured.city,
    state: insured.state,
    address: insured.address,
  };
}

export function isDemoCpf(cpf: string): boolean {
  return cpf in demoAccountsByCpf;
}

function summariseCoverages(offer: NormalizedOffer): { labels: string[]; mainLabels: string[]; totalPremium?: number; graceWarnings: string[] } {
  const labels = new Set<string>();
  const mainLabels = new Set<string>();
  const graceWarnings = new Set<string>();
  let totalPremium = 0;
  let anyPremium = false;
  for (const item of offer.coverages) {
    for (const canonical of item.canonical) {
      const label = riskLabel(canonical.risk);
      labels.add(label);
      // Missing isMainCoverage defaults to "main" - the field isn't populated by every response we've seen, and treating absence as "hide it" would silently empty a row.
      if (item.isMainCoverage !== false) mainLabels.add(label);
    }
    if (item.premiumAmount != null) {
      anyPremium = true;
      totalPremium += item.premiumAmount;
    }
    const warning = graceLabel(item);
    if (warning) graceWarnings.add(warning);
  }
  return {
    labels: Array.from(labels),
    mainLabels: Array.from(mainLabels),
    totalPremium: anyPremium ? totalPremium : undefined,
    graceWarnings: Array.from(graceWarnings),
  };
}

interface PolicyDetail {
  policy: PolicySummary;
  offer: NormalizedOffer;
  customer?: CustomerIdentity;
}

async function buildAutoPolicyDetail(
  accessToken: string,
  insurerName: string | undefined,
  cpf: string,
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
  const { labels, mainLabels, totalPremium, graceWarnings } = summariseCoverages(offer);
  return {
    offer,
    customer: identityFromInsured(matchingInsured(info.data.insureds, cpf)),
    policy: {
      policyId: raw.policyId,
      productName: raw.productName,
      insurerName,
      coverageLabels: labels,
      mainCoverageLabels: mainLabels,
      totalPremium,
      termStartDate: info.data.termStartDate,
      termEndDate: info.data.termEndDate,
      graceWarnings,
    },
  };
}

async function buildHousingPolicyDetail(
  accessToken: string,
  insurerName: string | undefined,
  cpf: string,
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
  const { labels, mainLabels, totalPremium, graceWarnings } = summariseCoverages(offer);
  return {
    offer,
    customer: identityFromInsured(matchingInsured(info.data.insureds, cpf)),
    policy: {
      policyId: raw.policyId,
      productName: raw.productName,
      insurerName,
      coverageLabels: labels,
      mainCoverageLabels: mainLabels,
      totalPremium,
      termStartDate: info.data.termStartDate,
      termEndDate: info.data.termEndDate,
      graceWarnings,
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
    Promise.allSettled(autoRaw.policies.map((p) => buildAutoPolicyDetail(accessToken, autoRaw.insurerName, cpf, p))),
    Promise.allSettled(housingRaw.policies.map((p) => buildHousingPolicyDetail(accessToken, housingRaw.insurerName, cpf, p))),
  ]);

  const autoDetails = autoResults.filter((r): r is PromiseFulfilledResult<PolicyDetail> => r.status === "fulfilled").map((r) => r.value);
  const housingDetails = housingResults.filter((r): r is PromiseFulfilledResult<PolicyDetail> => r.status === "fulfilled").map((r) => r.value);
  const allDetails = [...autoDetails, ...housingDetails];

  return {
    cpf,
    consentId,
    customer: allDetails.find((d) => d.customer)?.customer ?? {},
    lines: [
      { productLine: "auto", policies: autoDetails.map((d) => d.policy) },
      { productLine: "housing", policies: housingDetails.map((d) => d.policy) },
    ],
    offers: allDetails.map((d) => d.offer),
  };
}
