import fs from "node:fs";
import path from "node:path";

const certsDir = path.join(process.cwd(), "certs");

export const opinConfig = {
  authBaseUrl: process.env.OPIN_AUTH_BASE_URL ?? "https://auth.local",
  apiBaseUrl: process.env.OPIN_API_BASE_URL ?? "https://api.local",
  clientId: process.env.OPIN_CLIENT_ID ?? "client",
  clientSecret: process.env.OPIN_CLIENT_SECRET ?? "1234",
  mtlsCert: fs.readFileSync(path.join(certsDir, "client_one.crt")),
  mtlsKey: fs.readFileSync(path.join(certsDir, "client_one.key")),
};

/**
 * The mock's local CA chain doesn't verify cleanly from outside its own
 * containers (same reason README.md's own examples use `curl -k`), so TLS
 * verification is disabled for these local-only hosts. Never do this for a
 * real Open Insurance participant.
 */
export const insecureLocalMock = true;

export const demoAccountsByCpf: Record<string, { login: string; password: string }> = {
  "76109277673": { login: "usuario1@seguradoramodelo.com.br", password: mustGetPassword() },
  "08116143018": { login: "usuario2@iniciadoramodelo.com.br", password: mustGetPassword() },
  "10117409073": { login: "usuario3@seguradoramodelo.com.br", password: mustGetPassword() },
  "87517400444": { login: "usuario4@iniciadoramodelo.com.br", password: mustGetPassword() },
};

function mustGetPassword(): string {
  const password = process.env.OPIN_MOCK_ACCOUNT_PASSWORD;
  if (!password) {
    throw new Error("OPIN_MOCK_ACCOUNT_PASSWORD is not set (see .env.local)");
  }
  return password;
}
