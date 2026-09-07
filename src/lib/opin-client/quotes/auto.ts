import { randomUUID } from "node:crypto";
import { opinConfig } from "../config";
import { mtlsRequest } from "../mtls-http";
import { getClientCredentialsToken } from "../token";
import { buildDemoQuoteCustomer } from "../types";

/** Matches the running server's QuoteAutoCoverage.CodeEnum exactly (insurance-swagger generated model). */
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
  | "VIDROS"
  | "CARRO_RESERVA"
  | "OUTRAS";

export interface AutoLeadQuoteResult {
  consentId: string;
  raw: unknown;
}

/**
 * Requests an auto insurance quote "lead" for a prospective customer -
 * client_credentials only, no consent flow (see docs/ARCHITECTURE.md 4.1).
 * This is the API a broker uses to shop new proposals, as opposed to
 * reading a policy the customer already has.
 */
export async function createAutoLeadQuote(
  cpf: string,
  civilName: string,
  coverages: Array<{ branch: string; code: AutoCoverageCode; description: string }>,
): Promise<AutoLeadQuoteResult> {
  const token = await getClientCredentialsToken("quote-auto-lead");
  const consentId = `urn:segurosgpt:${randomUUID()}`;
  const expirationDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const body = JSON.stringify({
    data: {
      consentId,
      expirationDateTime,
      quoteCustomer: buildDemoQuoteCustomer(cpf, civilName),
      quoteData: { coverages },
    },
  });

  const res = await mtlsRequest(`${opinConfig.apiBaseUrl}/open-insurance/quote-auto/v1/lead/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-fapi-interaction-id": randomUUID(),
      "x-idempotency-key": randomUUID(),
    },
    body,
  });

  if (res.status !== 201) {
    throw new Error(`createAutoLeadQuote failed (${res.status}): ${res.body}`);
  }

  return { consentId, raw: JSON.parse(res.body) };
}
