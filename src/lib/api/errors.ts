/**
 * Centralized error response helpers — keep server-side details out of
 * client responses to avoid leaking schema names, query text, or stack
 * traces. Always log the full error server-side; return a generic message
 * to the client.
 */

import { NextResponse } from 'next/server';

/**
 * Return a sanitized 500 response. Logs the full error server-side under
 * a `[route]` tag (caller supplies the tag — typically the API path or
 * file location).
 */
export function internalError(tag: string, error: unknown): NextResponse {
  console.error(`[${tag}] internal error:`, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/**
 * Return a 401 with a curated message. Auth-layer errors are safe to
 * surface (e.g. "Unauthorized: missing session") because they describe
 * the request, not the database.
 */
export function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Return a 403 with a curated message.
 */
export function forbidden(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
