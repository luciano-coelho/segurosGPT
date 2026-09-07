import https from "node:https";
import { opinConfig, insecureLocalMock } from "./config";

export interface MtlsResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

export interface MtlsRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Low-level mTLS request shared by every OPIN call (token, consent,
 * interaction, resource APIs). Never follows redirects automatically -
 * the headless consent flow needs to read the Location header itself
 * (that's where the authorization code shows up), not have it swallowed.
 */
export function mtlsRequest(url: string, options: MtlsRequestOptions = {}): Promise<MtlsResponse> {
  const parsed = new URL(url);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: options.method ?? "GET",
        cert: opinConfig.mtlsCert,
        key: opinConfig.mtlsKey,
        rejectUnauthorized: !insecureLocalMock,
        headers: options.headers,
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body: data }),
        );
      },
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

export function basicAuthHeader(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
}

/** Merges Set-Cookie response headers into a single Cookie header value for the next request. */
export function mergeCookies(existing: string, setCookieHeaders: string[] | undefined): string {
  if (!setCookieHeaders?.length) return existing;
  const jar = new Map<string, string>();
  for (const pair of existing.split("; ").filter(Boolean)) {
    const [name, ...rest] = pair.split("=");
    jar.set(name, rest.join("="));
  }
  for (const setCookie of setCookieHeaders) {
    const [pair] = setCookie.split(";");
    const [name, ...rest] = pair.split("=");
    jar.set(name.trim(), rest.join("="));
  }
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function asArray(header: string | string[] | undefined): string[] | undefined {
  if (!header) return undefined;
  return Array.isArray(header) ? header : [header];
}

export function setCookiesOf(res: MtlsResponse): string[] | undefined {
  return asArray(res.headers["set-cookie"]);
}
