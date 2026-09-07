/**
 * Dev utility: sanity-checks the opin-client against a running Mock OPIN
 * environment (docker-compose --profile main up). Run with:
 *   npx tsx --env-file=.env.local scripts/verify-opin-connection.ts
 */
import { getAuthorisedAccessToken } from "../src/lib/opin-client/consent";
import { getAutoPolicies } from "../src/lib/opin-client/policies/auto";

const CPF = "76109277673";

async function main() {
  console.log("Requesting consent + headless authorisation for CPF", CPF, "...");
  const { accessToken, consentId } = await getAuthorisedAccessToken(
    CPF,
    [
      "RESOURCES_READ",
      "CUSTOMERS_PERSONAL_IDENTIFICATIONS_READ",
      "CUSTOMERS_PERSONAL_QUALIFICATION_READ",
      "DAMAGES_AND_PEOPLE_AUTO_READ",
      "DAMAGES_AND_PEOPLE_AUTO_POLICYINFO_READ",
    ],
    ["resources", "customers", "insurance-auto"],
  );
  console.log("Got consent-scoped access token. consentId:", consentId);

  const policies = await getAutoPolicies(accessToken);
  console.log("Auto policies:", JSON.stringify(policies, null, 2));
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
