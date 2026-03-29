import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSecurityHeaders } from '@/lib/security/headers';
import { checkRateLimit } from '@/lib/security/rate-limit';

/**
 * Broker/admin portal routes — existing dashboard routes.
 */
const BROKER_PORTAL_ROUTES = [
  '/dashboard',
  '/properties',
  '/applications',
  '/lois',
  '/leases',
  '/invoices',
  '/comps',
  '/users',
  '/settings',
];

/**
 * Landlord portal routes — accessible by landlord and landlord_agent roles.
 */
const LANDLORD_PORTAL_ROUTES = [
  '/landlord',
];

/**
 * Tenant portal routes — accessible by tenant and tenant_agent roles.
 */
const TENANT_PORTAL_ROUTES = [
  '/tenant',
];

/**
 * All portal routes that require authentication.
 */
const PROTECTED_PORTAL_ROUTES = [
  ...BROKER_PORTAL_ROUTES,
  ...LANDLORD_PORTAL_ROUTES,
  ...TENANT_PORTAL_ROUTES,
];

/**
 * Routes that must always be publicly accessible — even though they may start
 * with a prefix that looks protected. Listed explicitly to avoid false matches.
 */
const PUBLIC_ROUTES = [
  '/auth/callback',
  '/auth/confirm',
  '/applications/status',
  '/invite', // Invitation acceptance page
];

/**
 * Auth pages that logged-in users should be redirected away from.
 */
const AUTH_PAGES = ['/login', '/register'];

/**
 * Pages accessible to authenticated users regardless of role.
 * The /pending page must be reachable by 'pending' users.
 */
const ROLE_EXEMPT_PAGES = ['/pending'];

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
  result: { limit: number; remaining: number; reset: number },
): void {
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set(
    'X-RateLimit-Reset',
    String(Math.ceil(result.reset / 1000)),
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

/**
 * Race a promise against a timeout. Returns the fallback if the promise
 * does not settle within `ms` milliseconds.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const RATE_LIMIT_PASS = {
  success: true,
  limit: 0,
  remaining: 1,
  reset: Date.now() + 60_000,
};

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Get client IP for rate limiting
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const pathname = request.nextUrl.pathname;

  // Skip rate limiting for static assets and Next.js internals
  const isStaticOrInternal =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js');

  // Timeout after 3s — if Upstash is unresponsive, allow the request
  const rateLimitResult = isStaticOrInternal
    ? RATE_LIMIT_PASS
    : await withTimeout(
        checkRateLimit(clientIp, pathname),
        3000,
        RATE_LIMIT_PASS,
      );

  // CSRF validation for mutation requests
  if (!validateCsrf(request)) {
    console.error(
      `[Security] CSRF validation failed for ${request.method} ${pathname} from IP ${clientIp}`,
    );
    const response = NextResponse.json(
      { error: 'CSRF validation failed' },
      { status: 403 },
    );
    applySecurityHeaders(response);
    return response;
  }

  // Rate limit exceeded
  if (!rateLimitResult.success) {
    console.warn(
      `[Security] Rate limit exceeded for IP ${clientIp} on ${pathname}`,
    );
    const response = NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 },
    );
    applySecurityHeaders(response);
    applyRateLimitHeaders(response, rateLimitResult);
    response.headers.set(
      'Retry-After',
      String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
    );
    return response;
  }

  // If Supabase isn't configured, still apply security headers but skip auth
  if (!url || !key) {
    const response = NextResponse.next({ request });
    applySecurityHeaders(response);
    applyRateLimitHeaders(response, rateLimitResult);
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

  // Timeout after 4s — if Supabase is unresponsive, treat as unauthenticated
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    4000,
    { data: { user: null }, error: null } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>,
  );

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
    applyRateLimitHeaders(response, rateLimitResult);
    return response;
  }

  // Role-based access control — redirect 'pending' users away from portal routes.
  // Users with role='pending' have authenticated but have not been approved by an admin.
  // They can only access role-exempt pages (e.g. /pending) and auth callback routes.
  if (
    user &&
    isProtectedRoute(pathname) &&
    !ROLE_EXEMPT_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    // Query the user's role from public.users — the user can read their own row via RLS.
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('auth_provider_id', user.id)
      .single();

    const role = userRow?.role;

    // If user has no row yet (race condition) or role is 'pending', redirect to /pending
    if (!role || role === 'pending') {
      console.warn(
        `[Auth] Pending user ${user.email} attempted to access ${pathname}`,
      );
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/pending';
      redirectUrl.search = '';
      const response = NextResponse.redirect(redirectUrl);
      applySecurityHeaders(response);
      applyRateLimitHeaders(response, rateLimitResult);
      return response;
    }

    // Role-based portal routing — redirect users to their designated portal
    // if they try to access a portal area that doesn't match their role.
    if (role && role !== 'pending') {
      const isLandlordRole = role === 'landlord' || role === 'landlord_agent';
      const isTenantRole = role === 'tenant' || role === 'tenant_agent';
      const isBrokerRole = role === 'broker' || role === 'admin';

      const isAccessingBrokerPortal = BROKER_PORTAL_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      );
      const isAccessingLandlordPortal = LANDLORD_PORTAL_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      );
      const isAccessingTenantPortal = TENANT_PORTAL_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      );

      // Redirect non-broker roles away from broker portal
      if (isAccessingBrokerPortal && !isBrokerRole) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = isLandlordRole ? '/landlord/dashboard' : '/tenant/dashboard';
        redirectUrl.search = '';
        const response = NextResponse.redirect(redirectUrl);
        applySecurityHeaders(response);
        applyRateLimitHeaders(response, rateLimitResult);
        return response;
      }

      // Redirect non-landlord roles away from landlord portal
      if (isAccessingLandlordPortal && !isLandlordRole && !isBrokerRole) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = isTenantRole ? '/tenant/dashboard' : '/dashboard';
        redirectUrl.search = '';
        const response = NextResponse.redirect(redirectUrl);
        applySecurityHeaders(response);
        applyRateLimitHeaders(response, rateLimitResult);
        return response;
      }

      // Redirect non-tenant roles away from tenant portal
      if (isAccessingTenantPortal && !isTenantRole && !isBrokerRole) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = isLandlordRole ? '/landlord/dashboard' : '/dashboard';
        redirectUrl.search = '';
        const response = NextResponse.redirect(redirectUrl);
        applySecurityHeaders(response);
        applyRateLimitHeaders(response, rateLimitResult);
        return response;
      }
    }
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
    /^\/api\/lois\/[^/]+\/respond/.test(pathname) ||
    // Tenant: view available inspection time slots
    /^\/api\/properties\/[^/]+\/inspection-slots/.test(pathname) ||
    // Tenant: book an inspection tour
    /^\/api\/properties\/[^/]+\/book-inspection/.test(pathname) ||
    // Public: look up invitation details by token
    pathname === '/api/invitations/accept';

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
    applyRateLimitHeaders(response, rateLimitResult);
    return response;
  }

  // Redirect logged-in users away from auth pages
  if (user && AUTH_PAGES.includes(pathname)) {
    // Query user role for correct redirect
    const { data: loginUserRow } = await supabase
      .from('users')
      .select('role')
      .eq('auth_provider_id', user.id)
      .single();

    const loginRole = loginUserRow?.role;
    const redirectUrl = request.nextUrl.clone();

    if (loginRole === 'landlord' || loginRole === 'landlord_agent') {
      redirectUrl.pathname = '/landlord/dashboard';
    } else if (loginRole === 'tenant' || loginRole === 'tenant_agent') {
      redirectUrl.pathname = '/tenant/dashboard';
    } else {
      redirectUrl.pathname = '/dashboard';
    }

    const response = NextResponse.redirect(redirectUrl);
    applySecurityHeaders(response);
    applyRateLimitHeaders(response, rateLimitResult);
    return response;
  }

  // Apply security headers to all responses
  applySecurityHeaders(supabaseResponse);
  applyRateLimitHeaders(supabaseResponse, rateLimitResult);

  return supabaseResponse;
}
