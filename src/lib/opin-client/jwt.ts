/** Decodes a compact JWS payload without verifying the signature - fine for
 * reading our own mock's responses locally, never for a real participant. */
export function decodeJwsPayload<T = unknown>(compactJws: string): T {
  const [, payload] = compactJws.split(".");
  if (!payload) throw new Error("Not a compact JWS: " + compactJws.slice(0, 40));
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
}
