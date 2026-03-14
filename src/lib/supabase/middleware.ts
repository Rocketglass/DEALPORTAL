import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSecurityHeaders } from '@/lib/security/headers';

/**
 * All portal routes that require broker/admin authentication.
 * These are the protected paths — no public or tenant access.
 */
const PROTECTED_PORTAL_ROUTES = [
  '/dashboard',
  '/properties',
  '/applications',
  '/lois',
  '/leases',
  '/invoices',
  '/settings',
];

/**
 * Routes that must always be publicly accessible — even though they may start
 * with a prefix that looks protected. Listed explicitly to avoid false matches.
 */
const PUBLIC_ROUTES = [
  '/auth/callback',
  '/auth/confirm',
];

/**
 * Auth pages that logged-in users should be redirected away from.
 */
const AUTH_PAGES = ['/login', '/register'];

/**
 * Check if a pathname matches any protected portal route.
 * Explicitly-listed public routes are never considered protected.
 */
function isProtectedRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.some((pub) => pathname === pub || pathname.startsWith(`${pub}/`))) {
    return false;
  }
  return PROTECTED_PORTAL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Simple in-memory rate limiting tracker.
 * In production, this would be Redis-backed. For now, this provides
 * rate-limit headers as hints and basic per-IP tracking.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // per window

function getRateLimitInfo(ip: string): { remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(ip, { count: 1, resetAt });
    return { remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt };
  }

  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count);
  return { remaining, resetAt: entry.resetAt };
}

/**
 * Apply security headers to a response.
 */
function applySecurityHeaders(response: NextResponse): void {
  const headers = getSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
}

/**
 * Apply rate limit headers to a response.
 */
function applyRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetAt: number,
): void {
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set(
    'X-RateLimit-Reset',
    String(Math.ceil(resetAt / 1000)),
  );
}

/**
 * Validate CSRF token for mutation requests.
 * Checks that the Origin or Referer header matches the app's host.
 * This prevents cross-site request forgery on state-changing operations.
 */
function validateCsrf(request: NextRequest): boolean {
  const method = request.method.toUpperCase();

  // Only validate mutation methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  // Webhook endpoints are exempt — they use their own signature verification
  if (request.nextUrl.pathname.startsWith('/api/webhooks/')) {
    return true;
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  if (!host) return true; // Cannot validate without host

  // Check Origin header first (most reliable)
  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.host === host;
    } catch {
      return false;
    }
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === host;
    } catch {
      return false;
    }
  }

  // If neither Origin nor Referer is present, allow the request.
  // Some legitimate requests (e.g., from native apps, curl) may not send these.
  // The server-side auth checks and RLS provide the primary protection.
  return true;
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Get client IP for rate limiting
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const rateLimitInfo = getRateLimitInfo(clientIp);

  // CSRF validation for mutation requests
  if (!validateCsrf(request)) {
    console.error(
      `[Security] CSRF validation failed for ${request.method} ${request.nextUrl.pathname} from IP ${clientIp}`,
    );
    const response = NextResponse.json(
      { error: 'CSRF validation failed' },
      { status: 403 },
    );
    applySecurityHeaders(response);
    return response;
  }

  // Rate limit exceeded
  if (rateLimitInfo.remaining <= 0) {
    console.warn(
      `[Security] Rate limit exceeded for IP ${clientIp} on ${request.nextUrl.pathname}`,
    );
    const response = NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 },
    );
    applySecurityHeaders(response);
    applyRateLimitHeaders(response, 0, rateLimitInfo.resetAt);
    response.headers.set(
      'Retry-After',
      String(Math.ceil((rateLimitInfo.resetAt - Date.now()) / 1000)),
    );
    return response;
  }

  // If Supabase isn't configured, still apply security headers but skip auth
  if (!url || !key) {
    const response = NextResponse.next({ request });
    applySecurityHeaders(response);
    applyRateLimitHeaders(response, rateLimitInfo.remaining, rateLimitInfo.resetAt);
    return response;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected portal routes — redirect to login if not authenticated
  if (!user && isProtectedRoute(pathname)) {
    console.warn(
      `[Auth] Unauthenticated access attempt to ${pathname} from IP ${clientIp}`,
    );
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(redirectUrl);
    applySecurityHeaders(response);
    applyRateLimitHeaders(response, rateLimitInfo.remaining, rateLimitInfo.resetAt);
    return response;
  }

  // Public API routes — accessible without authentication.
  // Service-role client is used inside these handlers to bypass RLS.
  // Keep this list narrow — only routes that genuinely need unauthenticated access.
  const isPublicApiRoute =
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/public/') ||
    // Tenant: look up application status by email
    pathname === '/api/applications/status' ||
    // Tenant: upload documents to an existing application
    /^\/api\/applications\/[^/]+\/documents/.test(pathname) ||
    // Tenant: submit the initial application
    pathname === '/api/applications' ||
    // Landlord: read LOI sections for public review page
    /^\/api\/lois\/[^/]+\/review-data/.test(pathname) ||
    // Landlord: submit LOI section responses
    /^\/api\/lois\/[^/]+\/respond/.test(pathname);

  // Protected API routes — return 401 JSON if not authenticated
  // /auth/callback is a public route; it runs before a session exists
  if (
    !user &&
    pathname.startsWith('/api/') &&
    !isPublicApiRoute
  ) {
    console.warn(
      `[Auth] Unauthenticated API access attempt to ${pathname} from IP ${clientIp}`,
    );
    const response = NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
    applySecurityHeaders(response);
    applyRateLimitHeaders(response, rateLimitInfo.remaining, rateLimitInfo.resetAt);
    return response;
  }

  // Redirect logged-in users away from auth pages
  if (user && AUTH_PAGES.includes(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    const response = NextResponse.redirect(redirectUrl);
    applySecurityHeaders(response);
    applyRateLimitHeaders(response, rateLimitInfo.remaining, rateLimitInfo.resetAt);
    return response;
  }

  // Apply security headers to all responses
  applySecurityHeaders(supabaseResponse);
  applyRateLimitHeaders(supabaseResponse, rateLimitInfo.remaining, rateLimitInfo.resetAt);

  return supabaseResponse;
}
