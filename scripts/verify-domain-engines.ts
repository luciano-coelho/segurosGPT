/**
 * Dev utility: exercises the Comparison and Overlap engines against fixture
 * data shaped like real OPIN responses, without needing the mock running.
 * Run with: npx tsx scripts/verify-domain-engines.ts
 */
import { normalizeAutoCoverages } from "../src/domain/taxonomy/mappers/auto";
import { normalizeHousingCoverages } from "../src/domain/taxonomy/mappers/housing";
import { compareOffers } from "../src/domain/comparison-engine";
import { findOverlaps } from "../src/domain/overlap-engine";
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

console.log("\nAll assertions passed.");
