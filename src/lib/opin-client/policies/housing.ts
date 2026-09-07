import { randomUUID } from "node:crypto";
import { opinConfig } from "../config";
import { mtlsRequest } from "../mtls-http";

/** Reads the housing policies the customer already has - requires an access token from getAuthorisedAccessToken (AUTHORISATION_CODE grant, see docs/ARCHITECTURE.md 4.1). */
export async function getHousingPolicies(accessToken: string): Promise<unknown> {
  const res = await mtlsRequest(`${opinConfig.apiBaseUrl}/open-insurance/insurance-housing/v1/insurance-housing`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-fapi-interaction-id": randomUUID(),
    },
  });

  if (res.status !== 200) {
    throw new Error(`getHousingPolicies failed (${res.status}): ${res.body}`);
  }

  return JSON.parse(res.body);
}

/** The coverage list lives under policy-info, not the top-level policy list. */
export async function getHousingPolicyInfo(accessToken: string, policyId: string): Promise<unknown> {
  const res = await mtlsRequest(`${opinConfig.apiBaseUrl}/open-insurance/insurance-housing/v1/insurance-housing/${policyId}/policy-info`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-fapi-interaction-id": randomUUID(),
    },
  });

  if (res.status !== 200) {
    throw new Error(`getHousingPolicyInfo failed (${res.status}): ${res.body}`);
  }

  return JSON.parse(res.body);
}
