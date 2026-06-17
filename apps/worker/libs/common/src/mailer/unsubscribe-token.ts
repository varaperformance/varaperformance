import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromBase64Url(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

function hmac(payload: string, secret: string): Buffer {
  return createHmac("sha256", `unsubscribe:${secret}`).update(payload).digest();
}

/**
 * Generate a signed unsubscribe token for email links.
 * Token format: `base64url(userId:exp).base64url(hmac)`.
 */
export function generateUnsubscribeToken(
  userId: string,
  secret: string,
): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${userId}:${exp}`;
  const sig = hmac(payload, secret);
  return `${toBase64Url(Buffer.from(payload))}.${toBase64Url(sig)}`;
}

/**
 * Verify an unsubscribe token and return the userId if valid.
 * Returns `null` for expired or tampered tokens.
 */
export function verifyUnsubscribeToken(
  token: string,
  secret: string,
): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;
  let payload: string;
  try {
    payload = fromBase64Url(payloadB64).toString("utf8");
  } catch {
    return null;
  }

  // Verify signature (timing-safe)
  const expected = hmac(payload, secret);
  let actual: Buffer;
  try {
    actual = fromBase64Url(sigB64);
  } catch {
    return null;
  }
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual)) return null;

  // Parse payload
  const sepIdx = payload.lastIndexOf(":");
  if (sepIdx === -1) return null;
  const userId = payload.slice(0, sepIdx);
  const exp = Number(payload.slice(sepIdx + 1));
  if (!userId || Number.isNaN(exp)) return null;
  if (Date.now() > exp) return null;

  return userId;
}
