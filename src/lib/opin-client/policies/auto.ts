import { randomUUID } from "node:crypto";
import { opinConfig } from "../config";
import { mtlsRequest } from "../mtls-http";

/** Reads the auto policies the customer already has - requires an access token from getAuthorisedAccessToken (AUTHORISATION_CODE grant, see docs/ARCHITECTURE.md 4.1). */
export async function getAutoPolicies(accessToken: string): Promise<unknown> {
  const res = await mtlsRequest(`${opinConfig.apiBaseUrl}/open-insurance/insurance-auto/v1/insurance-auto`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-fapi-interaction-id": randomUUID(),
    },
  });

  if (res.status !== 200) {
    throw new Error(`getAutoPolicies failed (${res.status}): ${res.body}`);
  }

  return JSON.parse(res.body);
}

/** Coverage list lives at data.coverages (unlike housing, which nests it under insuredObjects). */
export async function getAutoPolicyInfo(accessToken: string, policyId: string): Promise<unknown> {
  const res = await mtlsRequest(`${opinConfig.apiBaseUrl}/open-insurance/insurance-auto/v1/insurance-auto/${policyId}/policy-info`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-fapi-interaction-id": randomUUID(),
    },
  });

  if (res.status !== 200) {
    throw new Error(`getAutoPolicyInfo failed (${res.status}): ${res.body}`);
  }

  return JSON.parse(res.body);
}
