/**
 * Upstash Redis rate limiting with tiered limits.
 *
 * Gracefully degrades to a no-op when Upstash credentials are not configured,
 * so the app continues to work without rate limiting rather than crashing.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Tier definitions — requests per sliding window
// ---------------------------------------------------------------------------

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch ms
}

const PASS: RateLimitResult = {
  success: true,
  limit: 0,
  remaining: 1,
  reset: Date.now() + 60_000,
};

// ---------------------------------------------------------------------------
// Redis client (lazily initialised)
// ---------------------------------------------------------------------------

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

// ---------------------------------------------------------------------------
// Limiters (created once, reused across requests)
// ---------------------------------------------------------------------------

let generalLimiter: Ratelimit | null = null;
let authLimiter: Ratelimit | null = null;
let publicApiLimiter: Ratelimit | null = null;
let emailLookupLimiter: Ratelimit | null = null;

function getGeneralLimiter(): Ratelimit | null {
  if (generalLimiter) return generalLimiter;
  const r = getRedis();
  if (!r) return null;
  generalLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(200, '60 s'),
    prefix: 'rl:general',
  });
  return generalLimiter;
}

function getAuthLimiter(): Ratelimit | null {
  if (authLimiter) return authLimiter;
  const r = getRedis();
  if (!r) return null;
  authLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    prefix: 'rl:auth',
  });
  return authLimiter;
}

function getPublicApiLimiter(): Ratelimit | null {
  if (publicApiLimiter) return publicApiLimiter;
  const r = getRedis();
  if (!r) return null;
  publicApiLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(60, '60 s'),
    prefix: 'rl:public',
  });
  return publicApiLimiter;
}

function getEmailLookupLimiter(): Ratelimit | null {
  if (emailLookupLimiter) return emailLookupLimiter;
  const r = getRedis();
  if (!r) return null;
  emailLookupLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(1, '3600 s'), // 1 lookup per hour
    prefix: 'rl:email-lookup',
  });
  return emailLookupLimiter;
}

// ---------------------------------------------------------------------------
// Route classification
// ---------------------------------------------------------------------------

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/register' ||
    pathname === '/api/auth/reset-password' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/reset-password'
  );
}

function isPublicApiRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/public/') ||
    pathname === '/api/applications/status' ||
    pathname === '/api/applications' ||
    /^\/api\/applications\/[^/]+\/documents/.test(pathname) ||
    /^\/api\/lois\/[^/]+\/review-data/.test(pathname) ||
    /^\/api\/lois\/[^/]+\/respond/.test(pathname) ||
    /^\/api\/properties\/[^/]+\/inspection-slots/.test(pathname) ||
    /^\/api\/properties\/[^/]+\/book-inspection/.test(pathname)
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check rate limit for a request. Returns the result with limit/remaining/reset.
 * If Upstash is not configured, always allows the request (graceful degradation).
 */
/**
 * Check rate limit for an email-keyed lookup (e.g. application status).
 * Limits to 3 requests per email per hour to prevent email enumeration.
 * If Upstash is not configured, falls back to an in-memory Map.
 */
export async function checkEmailRateLimit(
  email: string,
): Promise<RateLimitResult> {
  const limiter = getEmailLookupLimiter();

  // Fallback: in-memory rate limiting when Upstash is not configured
  if (!limiter) {
    return checkEmailRateLimitInMemory(email);
  }

  try {
    const result = await limiter.limit(email);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    console.error('[rate-limit] Upstash error on email lookup, allowing request:', err);
    return PASS;
  }
}

// ---------------------------------------------------------------------------
// In-memory fallback for email rate limiting (no Upstash)
// ---------------------------------------------------------------------------

const emailLookupMap = new Map<string, { count: number; resetAt: number }>();

function checkEmailRateLimitInMemory(email: string): RateLimitResult {
  const now = Date.now();
  const windowMs = 3_600_000; // 1 hour
  const maxRequests = 10;

  const entry = emailLookupMap.get(email);

  if (!entry || now >= entry.resetAt) {
    emailLookupMap.set(email, { count: 1, resetAt: now + windowMs });
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, reset: now + windowMs };
  }

  entry.count += 1;

  if (entry.count > maxRequests) {
    return { success: false, limit: maxRequests, remaining: 0, reset: entry.resetAt };
  }

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    reset: entry.resetAt,
  };
}

/**
 * Check rate limit for a request. Returns the result with limit/remaining/reset.
 * If Upstash is not configured, always allows the request (graceful degradation).
 */
export async function checkRateLimit(
  ip: string,
  pathname: string,
): Promise<RateLimitResult> {
  let limiter: Ratelimit | null;

  if (isAuthRoute(pathname)) {
    limiter = getAuthLimiter();
  } else if (isPublicApiRoute(pathname)) {
    limiter = getPublicApiLimiter();
  } else {
    limiter = getGeneralLimiter();
  }

  // Graceful degradation — no Upstash configured
  if (!limiter) return PASS;

  try {
    const result = await limiter.limit(ip);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    // If Redis is down, allow the request rather than blocking all traffic
    console.error('[rate-limit] Upstash error, allowing request:', err);
    return PASS;
  }
}

// ---------------------------------------------------------------------------
// Per-email auth limiter (account lockout via rate limiting)
// ---------------------------------------------------------------------------

let perEmailAuthLimiter: Ratelimit | null = null;

function getPerEmailAuthLimiter(): Ratelimit | null {
  if (perEmailAuthLimiter) return perEmailAuthLimiter;
  const r = getRedis();
  if (!r) return null;
  perEmailAuthLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(5, '900 s'), // 5 attempts per 15 minutes per email
    prefix: 'rl:auth-email',
  });
  return perEmailAuthLimiter;
}

export async function checkAuthEmailRateLimit(email: string): Promise<RateLimitResult> {
  const limiter = getPerEmailAuthLimiter();
  if (!limiter) return PASS;
  try {
    const result = await limiter.limit(email);
    return { success: result.success, limit: result.limit, remaining: result.remaining, reset: result.reset };
  } catch (err) {
    console.error('[rate-limit] Upstash error on auth email limit:', err);
    return PASS;
  }
}
