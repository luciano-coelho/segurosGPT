import { randomBytes, randomUUID, createHash } from "node:crypto";
import { opinConfig, demoAccountsByCpf } from "./config";
import { mergeCookies, mtlsRequest, setCookiesOf } from "./mtls-http";
import { getClientCredentialsToken, exchangeCodeForToken } from "./token";
import { decodeJwsPayload } from "./jwt";

export type ConsentPermission = string;

interface CreateConsentResult {
  consentId: string;
}

/**
 * Creates a consent request (client_credentials - this step alone doesn't
 * grant access, it just registers *what* access is being requested; the
 * customer/account still has to approve it via the AUTHORISATION_CODE
 * interaction below). Response body is always a signed JWS
 * (ResponseSigningFilter), decoded here without signature verification -
 * acceptable for our own local mock, never for a real participant.
 */
export async function createConsent(cpf: string, permissions: ConsentPermission[]): Promise<CreateConsentResult> {
  const token = await getClientCredentialsToken("consents");
  const expirationDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const body = JSON.stringify({
    data: {
      loggedUser: { document: { identification: cpf, rel: "CPF" } },
      permissions,
      expirationDateTime,
    },
  });

  const res = await mtlsRequest(`${opinConfig.apiBaseUrl}/open-insurance/consents/v2/consents`, {
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
    throw new Error(`createConsent failed (${res.status}): ${res.body}`);
  }

  const payload = decodeJwsPayload<{ data: { consentId: string } }>(res.body);
  return { consentId: payload.data.consentId };
}

const REDIRECT_URI = "https://oauth.pstmn.io/v1/callback"; // registered for client_id "client", never actually hit - we only read the Location header.

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

/**
 * Drives the AUTHORISATION_CODE interaction headlessly against the Mock AS
 * (login form -> consent approval), standing in for the resource owner's
 * browser. Only viable because the mock's login is a plain form (see
 * docs/ARCHITECTURE.md 4.1) - never do this against a real institution.
 * Returns the authorization code and PKCE verifier, ready for exchangeCodeForToken.
 */
export async function authoriseConsentHeadless(
  cpf: string,
  consentId: string,
  oauthScopes: string[],
): Promise<{ code: string; codeVerifier: string; redirectUri: string }> {
  const account = demoAccountsByCpf[cpf];
  if (!account) {
    throw new Error(`No demo Mock AS account mapped for CPF ${cpf} (see docs/ARCHITECTURE.md section 9)`);
  }

  let cookie = "";
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());

  const authUrl = new URL(`${opinConfig.authBaseUrl}/auth`);
  authUrl.searchParams.set("client_id", opinConfig.clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("response_mode", "jwt"); // JARM: FAPI profile rejects plain query response_mode
  // "openid" + "consent:<id>" identify the consent; the product-line scopes
  // (e.g. "insurance-auto") are what SimpleAuthorisation.scopesToRoles maps
  // to the @Secured role each controller actually checks - consent
  // permissions alone (EnumConsentPermission) do NOT grant endpoint access.
  authUrl.searchParams.set("scope", ["openid", `consent:${consentId}`, ...oauthScopes].join(" "));
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("state", randomUUID());
  authUrl.searchParams.set("nonce", randomUUID());
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  let res = await mtlsRequest(authUrl.toString());
  cookie = mergeCookies(cookie, setCookiesOf(res));

  // Follow same-origin redirects (auth.local hops through /interaction/:uid
  // a few times) until we land on an absolute, cross-origin Location - that's
  // the final redirect back to REDIRECT_URI carrying the JARM `response` JWT.
  let location = res.headers.location as string | undefined;
  let uid = extractInteractionUid(location);
  if (!uid) {
    throw new Error(`Expected a redirect into /interaction/:uid, got: ${res.status} ${location ?? res.body.slice(0, 300)}`);
  }

  // GET /interaction/:uid -> renders the login form (prompt "login")
  res = await mtlsRequest(`${opinConfig.authBaseUrl}/interaction/${uid}`, {
    headers: { Cookie: cookie },
  });
  cookie = mergeCookies(cookie, setCookiesOf(res));

  // POST /interaction/:uid/login
  const loginBody = new URLSearchParams({ login: account.login, password: account.password }).toString();
  res = await mtlsRequest(`${opinConfig.authBaseUrl}/interaction/${uid}/login`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: loginBody,
  });
  cookie = mergeCookies(cookie, setCookiesOf(res));
  if (res.status !== 302 && res.status !== 303) {
    throw new Error(`Login step did not redirect (${res.status}): ${res.body.slice(0, 500)}`);
  }

  // The redirect from /login goes through /auth/:uid (oidc-provider resumes
  // the authorization request) before landing back on /interaction/:uid with
  // the next prompt ("consent") - a real browser follows every hop, so we
  // must too, rather than assuming the uid/path stay the same.
  location = res.headers.location as string | undefined;
  for (let hop = 0; hop < 5 && location; hop++) {
    const next = new URL(location, opinConfig.authBaseUrl);
    const consentUid = extractInteractionUid(next.pathname);
    if (consentUid) {
      uid = consentUid;
      break;
    }
    res = await mtlsRequest(next.toString(), { headers: { Cookie: cookie } });
    cookie = mergeCookies(cookie, setCookiesOf(res));
    location = res.headers.location as string | undefined;
  }

  // GET /interaction/:uid -> renders the consent approval screen (prompt "consent").
  // Its HTML embeds one hidden input per resource the customer can share
  // (name="<scope>-accounts", e.g. "housing-accounts", "auto-accounts") -
  // this is the resource-selection step: which specific policies get linked
  // to the consent (HousingService.checkConsentCoversPolicy checks exactly
  // this link later). Skipping it (empty confirm body) creates a consent
  // that's approved but covers zero policies - the "consent does not cover
  // this housing!" 400 downstream. We select everything offered, same as
  // the UI's checkboxes being checked by default.
  res = await mtlsRequest(`${opinConfig.authBaseUrl}/interaction/${uid}`, {
    headers: { Cookie: cookie },
  });
  cookie = mergeCookies(cookie, setCookiesOf(res));
  const resourceSelections = extractResourceSelections(res.body);
  if (process.env.OPIN_DEBUG) {
    console.error("[resource selections]", resourceSelections);
  }

  // POST /interaction/:uid/confirm - approves the consent
  const confirmBody = new URLSearchParams();
  for (const [field, value] of resourceSelections) confirmBody.append(field, value);
  res = await mtlsRequest(`${opinConfig.authBaseUrl}/interaction/${uid}/confirm`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded" },
    body: confirmBody.toString(),
  });
  cookie = mergeCookies(cookie, setCookiesOf(res));
  if (process.env.OPIN_DEBUG) {
    console.error("[confirm]", res.status, res.headers.location, res.body.slice(0, 800));
  }

  // From here it's a short chain of same-origin redirects ending in an
  // absolute redirect to REDIRECT_URI with the JARM `response` JWT.
  location = res.headers.location as string | undefined;
  for (let hop = 0; hop < 5 && location && !location.startsWith(REDIRECT_URI); hop++) {
    const next = new URL(location, opinConfig.authBaseUrl);
    res = await mtlsRequest(next.toString(), { headers: { Cookie: cookie } });
    cookie = mergeCookies(cookie, setCookiesOf(res));
    if (process.env.OPIN_DEBUG) {
      console.error("[hop]", next.toString(), "->", res.status, res.headers.location);
    }
    location = res.headers.location as string | undefined;
  }

  if (!location || !location.startsWith(REDIRECT_URI)) {
    throw new Error(`Consent flow did not reach the redirect URI. Last location: ${location}`);
  }

  const responseJwt = new URL(location).searchParams.get("response");
  if (!responseJwt) {
    throw new Error(`Final redirect missing JARM 'response' param: ${location}`);
  }
  const jarm = decodeJwsPayload<{ code?: string; error?: string; error_description?: string }>(responseJwt);
  if (!jarm.code) {
    throw new Error(`Authorisation failed: ${jarm.error} - ${jarm.error_description}`);
  }
  return { code: jarm.code, codeVerifier, redirectUri: REDIRECT_URI };
}

/** Parses `<input type="hidden" name="X-accounts" value="Y">` pairs out of the consent screen HTML (see interaction.ejs). */
function extractResourceSelections(html: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const re = /name="([a-z-]+-accounts)"\s*\n?\s*value="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    pairs.push([match[1], match[2]]);
  }
  return pairs;
}

function extractInteractionUid(location: string | undefined): string | undefined {
  if (!location) return undefined;
  const match = location.match(/\/interaction\/([^/?#]+)/);
  return match?.[1];
}

/**
 * End-to-end: create the consent, approve it headlessly, exchange for a
 * scoped access token. `permissions` are the consent's EnumConsentPermission
 * values (what data the consent record covers); `oauthScopes` are the
 * technical OAuth scopes (e.g. "insurance-auto") that actually unlock the
 * corresponding controller's @Secured role - see SimpleAuthorisation.java's
 * scopesToRoles map. The two rarely differ in which product line they name,
 * but the mock enforces access via the scope, not the consent permissions.
 */
export async function getAuthorisedAccessToken(
  cpf: string,
  permissions: ConsentPermission[],
  oauthScopes: string[],
): Promise<{ accessToken: string; consentId: string }> {
  const { consentId } = await createConsent(cpf, permissions);
  const { code, codeVerifier, redirectUri } = await authoriseConsentHeadless(cpf, consentId, oauthScopes);
  const { accessToken } = await exchangeCodeForToken(code, codeVerifier, redirectUri);
  return { accessToken, consentId };
}
