/**
 * HMAC-signed tokens for public LOI review URLs.
 *
 * Tokens are formatted as `{expiry}.{signature}` where:
 *   - expiry is a Unix timestamp (seconds) — 7 days from generation
 *   - signature is an HMAC-SHA256 of `{loiId}:{expiry}` using SUPABASE_SERVICE_ROLE_KEY
 *
 * This prevents unauthenticated access to LOI data without a valid, non-expired link.
 */

import { createHmac } from 'crypto';

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return secret;
}

/**
 * Base64url encode (no padding) — safe for query parameters.
 */
function base64url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate a signed review token for a given LOI ID.
 * Returns `{expiry}.{signature}` (base64url-encoded signature).
 */
export function generateLoiReviewToken(loiId: string): string {
  const expiry = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = `${loiId}:${expiry}`;
  const signature = createHmac('sha256', getSecret()).update(payload).digest();
  return `${expiry}.${base64url(signature)}`;
}

/**
 * Verify that a review token is valid and not expired for the given LOI ID.
 */
export function verifyLoiReviewToken(loiId: string, token: string): boolean {
  try {
    const dotIndex = token.indexOf('.');
    if (dotIndex === -1) return false;

    const expiryStr = token.slice(0, dotIndex);
    const providedSig = token.slice(dotIndex + 1);

    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry)) return false;

    // Check expiration
    if (Math.floor(Date.now() / 1000) > expiry) return false;

    // Recompute expected signature
    const payload = `${loiId}:${expiry}`;
    const expectedSig = base64url(
      createHmac('sha256', getSecret()).update(payload).digest(),
    );

    // Constant-time comparison
    if (providedSig.length !== expectedSig.length) return false;
    let mismatch = 0;
    for (let i = 0; i < providedSig.length; i++) {
      mismatch |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}
