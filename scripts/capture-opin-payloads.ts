/**
 * Dev utility: captures every raw payload the app receives from the OPIN
 * environment, for one real demo CPF, and writes them to docs/opin-payloads-sample.md.
 * Nothing here is normalized/shaped by our domain layer - this is exactly
 * what the wire sends back, so anyone can see what data is (and isn't)
 * available. Run with: npx tsx --env-file=.env.local scripts/capture-opin-payloads.ts
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { opinConfig } from "../src/lib/opin-client/config";
import { mtlsRequest } from "../src/lib/opin-client/mtls-http";
import { getClientCredentialsToken } from "../src/lib/opin-client/token";
import { decodeJwsPayload } from "../src/lib/opin-client/jwt";
import { createAutoLeadQuote } from "../src/lib/opin-client/quotes/auto";
import { authoriseConsentHeadless } from "../src/lib/opin-client/consent";
import { getAutoPolicies, getAutoPolicyInfo } from "../src/lib/opin-client/policies/auto";
import { getHousingPolicies, getHousingPolicyInfo } from "../src/lib/opin-client/policies/housing";

const CPF = "76109277673";

interface Entry {
  title: string;
  usedFor: string;
  description: string;
  payload: unknown;
}

const entries: Entry[] = [];

function record(title: string, usedFor: string, description: string, payload: unknown) {
  entries.push({ title, usedFor, description, payload });
  console.log(`captured: ${title}`);
}

interface RawPolicyListResponse {
  data: Array<{ companies: Array<{ policies: Array<{ policyId: string }> }> }>;
}

async function main() {
  // 1. client_credentials token (quote-auto-lead scope)
  const leadToken = await getClientCredentialsToken("quote-auto-lead");
  record(
    "Token client_credentials (scope quote-auto-lead)",
    "Autenticação pra pedir cotação nova",
    "POST /token no Mock AS, mTLS + client_secret_basic. Não precisa de CPF nem de aprovação do cliente.",
    { access_token: leadToken.slice(0, 12) + "…(truncado)", token_type: "Bearer", expires_in: 900, scope: "quote-auto-lead" },
  );

  // 2. Auto lead quote (comparação ilustrativa NÃO usa isto - é só prova de que a chamada funciona)
  const leadQuote = await createAutoLeadQuote(CPF, "Usuário 1", [
    { branch: "0111", code: "CASCO_COMPREENSIVA", description: "Cobertura compreensiva" },
    { branch: "0111", code: "RESPONSABILIDADE_CIVIL_FACULTATIVA_DE_VEICULOS_RCFV", description: "RC facultativa" },
  ]);
  record(
    "POST /open-insurance/quote-auto/v1/lead/request",
    "Não usado em nenhuma tela hoje - a comparação de propostas é ilustrativa (ver docs/ARCHITECTURE.md)",
    "Pede uma cotação nova de auto. Resposta só confirma recebimento (status RCVD) - não devolve prêmio nem coberturas calculadas.",
    leadQuote.raw,
  );

  // 3. Consent creation - full decoded body (createConsent only returns consentId; replicate here for the raw shape)
  const consentToken = await getClientCredentialsToken("consents");
  const consentBody = JSON.stringify({
    data: {
      loggedUser: { document: { identification: CPF, rel: "CPF" } },
      permissions: [
        "RESOURCES_READ",
        "DAMAGES_AND_PEOPLE_AUTO_READ",
        "DAMAGES_AND_PEOPLE_AUTO_POLICYINFO_READ",
        "DAMAGES_AND_PEOPLE_HOUSING_READ",
        "DAMAGES_AND_PEOPLE_HOUSING_POLICYINFO_READ",
      ],
      expirationDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  const consentRes = await mtlsRequest(`${opinConfig.apiBaseUrl}/open-insurance/consents/v2/consents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${consentToken}`,
      "x-fapi-interaction-id": randomUUID(),
      "x-idempotency-key": randomUUID(),
    },
    body: consentBody,
  });
  const consentDecoded = decodeJwsPayload(consentRes.body);
  record(
    "POST /open-insurance/consents/v2/consents (decodificado do JWS)",
    "Passo 1 do fluxo de autorização - registra o que vai ser pedido, ainda não dá acesso a nada",
    "Resposta vem assinada (JWS compacto, application/jwt) - aqui já decodificada. O corpo que enviamos é o objeto acima (loggedUser + permissions + expirationDateTime).",
    consentDecoded,
  );
  const consentId = (consentDecoded as { data: { consentId: string } }).data.consentId;

  // 4. Headless authorisation - the JARM-decoded final response (code) - captured by re-running the flow's last step
  const { code, codeVerifier, redirectUri } = await authoriseConsentHeadless(CPF, consentId, ["resources", "insurance-auto", "insurance-housing"]);
  record(
    "Resposta final do /auth (JARM, decodificada)",
    "Passo 2 - o titular (simulado) aprova o consentimento",
    "O Mock AS responde com um JWT assinado (JARM) na query string, não um `code` direto. Aqui só o campo relevante - o JWT completo também carrega state/aud/exp/iss.",
    { code: code.slice(0, 12) + "…(truncado)" },
  );

  // 5. Token exchange (authorization_code)
  const tokenRes = await mtlsRequest(`${opinConfig.authBaseUrl}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${opinConfig.clientId}:${opinConfig.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: codeVerifier }).toString(),
  });
  const tokenJson = JSON.parse(tokenRes.body);
  record(
    "POST /token (grant_type=authorization_code)",
    "Passo 3 - troca o code pelo access token vinculado ao consentimento",
    "Esse access_token é o que autentica todas as chamadas de dado real abaixo.",
    { ...tokenJson, access_token: String(tokenJson.access_token).slice(0, 12) + "…(truncado)" },
  );
  const accessToken = tokenJson.access_token as string;

  // 6-9. Real resource data
  const autoPolicies = await getAutoPolicies(accessToken);
  record(
    "GET /open-insurance/insurance-auto/v1/insurance-auto",
    "Cards de portfólio (linha Auto) + KPI de apólices ativas",
    "Lista de apólices de auto do cliente - só policyId e nome do produto, sem detalhe de cobertura.",
    autoPolicies,
  );

  const autoPolicyId = (autoPolicies as RawPolicyListResponse).data[0]?.companies[0]?.policies[0]?.policyId;
  if (autoPolicyId) {
    const autoInfo = await getAutoPolicyInfo(accessToken, autoPolicyId);
    record(
      `GET /open-insurance/insurance-auto/v1/insurance-auto/${autoPolicyId}/policy-info`,
      "Tags de cobertura, prêmio, vigência no card de apólice + Overlap Engine + nome do cliente",
      "Detalhe completo da apólice - é daqui que tiramos coverages (normalizados pelo domain layer), termStartDate/termEndDate e insureds[].name.",
      autoInfo,
    );
  }

  const housingPolicies = await getHousingPolicies(accessToken);
  record(
    "GET /open-insurance/insurance-housing/v1/insurance-housing",
    "Cards de portfólio (linha Residencial) + KPI de apólices ativas",
    "Mesma estrutura da lista de auto.",
    housingPolicies,
  );

  const housingPolicyId = (housingPolicies as RawPolicyListResponse).data[0]?.companies[0]?.policies[0]?.policyId;
  if (housingPolicyId) {
    const housingInfo = await getHousingPolicyInfo(accessToken, housingPolicyId);
    record(
      `GET /open-insurance/insurance-housing/v1/insurance-housing/${housingPolicyId}/policy-info`,
      "Tags de cobertura no card de apólice + Overlap Engine + nome do cliente",
      "Note a diferença de shape pro auto: aqui não existe premiumAmount por cobertura em lugar nenhum.",
      housingInfo,
    );
  }

  // Write the markdown doc
  const lines: string[] = [];
  lines.push("# Payloads reais recebidos do OPIN — captura de referência");
  lines.push("");
  lines.push(`> Gerado por \`scripts/capture-opin-payloads.ts\` contra o ambiente Mock OPIN rodando localmente, pro CPF de teste \`${CPF}\`. Tokens truncados por segurança; todo o resto é a resposta real, sem edição, na ordem em que o app realmente chama cada endpoint.`);
  lines.push("");
  lines.push("## Índice");
  lines.push("");
  for (const e of entries) lines.push(`- [${e.title}](#${e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")})`);
  lines.push("");

  for (const e of entries) {
    lines.push(`## ${e.title}`);
    lines.push("");
    lines.push(`**Usado para:** ${e.usedFor}`);
    lines.push("");
    lines.push(e.description);
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(e.payload, null, 2));
    lines.push("```");
    lines.push("");
  }

  const outPath = path.join(process.cwd(), "docs", "opin-payloads-sample.md");
  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(`\nWritten to ${outPath}`);
}

main().catch((err) => {
  console.error("FAILED", err);
  process.exit(1);
});
