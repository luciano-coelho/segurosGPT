import { opinConfig } from "./config";
import { basicAuthHeader, mtlsRequest } from "./mtls-http";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const cache = new Map<string, CachedToken>();

/**
 * client_credentials token, scoped. Covers every Quote* endpoint and consent
 * creation - anything NOT gated behind a specific customer's consent
 * (see docs/ARCHITECTURE.md, section 4.1).
 */
export async function getClientCredentialsToken(scope: string): Promise<string> {
  const cached = cache.get(scope);
  if (cached && cached.expiresAt > Date.now() + 5_000) {
    return cached.accessToken;
  }

  const body = new URLSearchParams({ grant_type: "client_credentials", scope }).toString();
  const res = await mtlsRequest(`${opinConfig.authBaseUrl}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(opinConfig.clientId, opinConfig.clientSecret),
    },
    body,
  });

  if (res.status !== 200) {
    throw new Error(`client_credentials token request failed (${res.status}): ${res.body}`);
  }

  const parsed = JSON.parse(res.body) as { access_token: string; expires_in: number };
  cache.set(scope, {
    accessToken: parsed.access_token,
    expiresAt: Date.now() + parsed.expires_in * 1000,
  });
  return parsed.access_token;
}

/** code -> access token exchange, used to finish the headless authorisation_code flow. */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  }).toString();

  const res = await mtlsRequest(`${opinConfig.authBaseUrl}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(opinConfig.clientId, opinConfig.clientSecret),
    },
    body,
  });

  if (res.status !== 200) {
    throw new Error(`authorization_code token exchange failed (${res.status}): ${res.body}`);
  }

  const parsed = JSON.parse(res.body) as { access_token: string; expires_in: number };
  return { accessToken: parsed.access_token, expiresIn: parsed.expires_in };
}
