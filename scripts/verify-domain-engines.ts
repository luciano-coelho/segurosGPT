/**
 * Dev utility: exercises the Comparison and Overlap engines against fixture
 * data shaped like real OPIN responses, without needing the mock running.
 * Run with: npx tsx scripts/verify-domain-engines.ts
 */
import { normalizeAutoCoverages } from "../src/domain/taxonomy/mappers/auto";
import { normalizeHousingCoverages } from "../src/domain/taxonomy/mappers/housing";
import { compareOffers } from "../src/domain/comparison-engine";
import { findOverlaps } from "../src/domain/overlap-engine";
import { normalizeToMonthly } from "../src/domain/premium";
import { graceLabel, isInGracePeriod } from "../src/domain/grace-period";
import type { NormalizedOffer } from "../src/domain/types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error("ASSERTION FAILED: " + message);
  console.log("OK:", message);
}

// Two competing auto quotes for the same customer, shaped like real QuoteAutoCoverage arrays.
const quoteA: NormalizedOffer = {
  id: "quote-seguradora-a",
  kind: "quote",
  productLine: "auto",
  insurerName: "Seguradora A",
  premiumAmount: 2400,
  coverages: normalizeAutoCoverages([
    { coverage: "CASCO_COMPREENSIVA", coverageDetail: "Cobertura compreensiva" },
    { coverage: "RESPONSABILIDADE_CIVIL_FACULTATIVA_DE_VEICULOS_RCFV" },
    { coverage: "VIDROS" },
  ]),
};

const quoteB: NormalizedOffer = {
  id: "quote-seguradora-b",
  kind: "quote",
  productLine: "auto",
  insurerName: "Seguradora B",
  premiumAmount: 2100,
  coverages: normalizeAutoCoverages([
    { coverage: "CASCO_ROUBO_E_FURTO" },
    { coverage: "RESPONSABILIDADE_CIVIL_FACULTATIVA_DE_VEICULOS_RCFV" },
    { coverage: "CARRO_RESERVA" },
  ]),
};

const matrix = compareOffers([quoteA, quoteB]);
console.log("\n=== Comparison matrix (auto quotes) ===");
for (const row of matrix.rows) {
  console.log(row.label.padEnd(35), JSON.stringify(row.coverageByOffer));
}
assert(
  matrix.rows.find((r) => r.label.startsWith("Responsabilidade civil"))?.coverageByOffer["quote-seguradora-a"] != null &&
    matrix.rows.find((r) => r.label.startsWith("Responsabilidade civil"))?.coverageByOffer["quote-seguradora-b"] != null,
  "both quotes show RC coverage in the matrix",
);
assert(
  matrix.rows.find((r) => r.label === "Vidros (veículo)")?.coverageByOffer["quote-seguradora-b"] === null,
  "quote B correctly shows no glass coverage",
);

// Existing auto policy (theft only) + a home policy that bundles death/disability for the policyholder.
const existingAutoPolicy: NormalizedOffer = {
  id: "policy-auto-existente",
  kind: "existing_policy",
  productLine: "auto",
  insurerName: "Seguradora C",
  coverages: normalizeAutoCoverages([
    { coverage: "CASCO_ROUBO_E_FURTO" },
    { coverage: "ACIDENTE_PESSOAIS_DE_PASSAGEIROS_APP_CONDUTOR" },
  ]),
};

const existingHomePolicy: NormalizedOffer = {
  id: "policy-residencial-existente",
  kind: "existing_policy",
  productLine: "housing",
  insurerName: "Seguradora D",
  coverages: normalizeHousingCoverages([
    { code: "ROUBO_E_FURTO_AO_CONTEUDO" },
    { code: "MORTE_E_INVALIDEZ_TOTAL_E_PERMANENTE" },
  ]),
};

const overlaps = findOverlaps([existingAutoPolicy, existingHomePolicy]);
console.log("\n=== Overlap findings (auto policy + home policy) ===");
for (const f of overlaps) {
  console.log(f.label, "->", f.offers.map((o) => `${o.offerId} (${o.sourceCode})`).join(" & "));
}

assert(
  overlaps.some(
    (f) => f.label === "Acidentes pessoais (pessoa)" && f.offers.length === 2,
  ),
  "genuine cross-line overlap found: personal-accident coverage duplicated between the auto and home policies",
);
assert(
  !overlaps.some((f) => f.label.startsWith("Roubo e furto")),
  "NO false-positive overlap between vehicle theft and home-contents theft - different insured asset, correctly not flagged",
);

// Premium normalization - annual and monthly premiums must not be summed/compared raw.
console.log("\n=== Premium normalization ===");
assert(normalizeToMonthly(1200, "ANUAL") === 100, "R$1200/year normalizes to R$100/month");
assert(normalizeToMonthly(100, "MENSAL") === 100, "R$100/month stays R$100/month");
assert(normalizeToMonthly(600, "SEMESTRAL") === 100, "R$600/semester normalizes to R$100/month");
assert(normalizeToMonthly(100, "ESPORADICA") === undefined, "an irregular-cadence premium is not force-converted to monthly");
assert(normalizeToMonthly(100, "PAGAMENTO_UNICO") === undefined, "a one-off payment is not force-converted to monthly");

// A quote with two coverages billed at different cadences: this is exactly the bug the user
// flagged - summing R$100/month + R$1200/year raw would wrongly total R$1300 instead of ~R$200/month.
const mixedCadenceQuote = normalizeAutoCoverages([
  { coverage: "VIDROS", premiumAmount: { amount: "100.00" }, premiumPeriodicity: "MENSAL" },
  { coverage: "CASCO_ROUBO_E_FURTO", premiumAmount: { amount: "1200.00" }, premiumPeriodicity: "ANUAL" },
]);
const totalMonthly = mixedCadenceQuote.reduce((sum, c) => sum + (c.premiumAmount ?? 0), 0);
assert(totalMonthly === 200, `mixed monthly+annual coverages sum to R$200/month equivalent, got ${totalMonthly}`);

// Grace period - a coverage with gracePeriod > 0 gets a label; one still inside its window suppresses "active overlap" framing.
console.log("\n=== Grace period ===");
const today = new Date().toISOString().slice(0, 10);
const [inGraceCoverage] = normalizeAutoCoverages([
  { coverage: "VIDROS", termStartDate: today, gracePeriod: 30, gracePeriodicity: "DIA", gracePeriodCountingMethod: "UTEIS" },
]);
assert(graceLabel(inGraceCoverage) === "Carência de 30 dias úteis — cobertura ainda não vigente para sinistro.", "grace label reads naturally");
assert(isInGracePeriod(inGraceCoverage), "a coverage that started today with a 30-day grace period is still in it");

const [pastGraceCoverage] = normalizeAutoCoverages([
  { coverage: "VIDROS", termStartDate: "2020-01-01", gracePeriod: 30, gracePeriodicity: "DIA" },
]);
assert(!isInGracePeriod(pastGraceCoverage), "a coverage from 2020 with a 30-day grace period is long past it");

const [noGraceCoverage] = normalizeAutoCoverages([{ coverage: "VIDROS" }]);
assert(graceLabel(noGraceCoverage) === undefined, "no gracePeriod means no label");

// A finding where one side is still in grace should be marked pending, not treated as a live overlap.
const policyStillInGrace: NormalizedOffer = {
  id: "policy-in-grace",
  kind: "existing_policy",
  productLine: "auto",
  insurerName: "Seguradora E",
  coverages: normalizeAutoCoverages([
    { coverage: "ACIDENTE_PESSOAIS_DE_PASSAGEIROS_APP_CONDUTOR", termStartDate: today, gracePeriod: 30, gracePeriodicity: "DIA" },
  ]),
};
const pendingOverlaps = findOverlaps([existingHomePolicy, policyStillInGrace]);
const pendingFinding = pendingOverlaps.find((f) => f.label === "Acidentes pessoais (pessoa)");
assert(!!pendingFinding?.pending, "an overlap where one side is still in its grace period is marked pending, not a live redundancy");

console.log("\nAll assertions passed.");
