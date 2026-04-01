/**
 * Security headers configuration for the Rocket Realty Portal.
 *
 * Strict CSP prevents data exfiltration — only allows connections
 * to the app's own domain and the Supabase project URL.
 */

/**
 * Build a strict Content-Security-Policy that prevents data exfiltration.
 * Only the app's own origin and the configured Supabase URL are allowed
 * as connection targets. Everything else is blocked.
 */
function buildContentSecurityPolicy(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  // Allowed sources for each directive
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', ...(supabaseUrl ? [supabaseUrl] : [])],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      // Supabase project URL for API, Auth, Storage, and Realtime
      ...(supabaseUrl ? [supabaseUrl, supabaseUrl.replace('https://', 'wss://')] : []),
    ],
    'frame-src': [
      'https://maps.google.com',
      'https://*.google.com',
      // Supabase Storage signed URLs for document viewer iframe
      ...(supabaseUrl ? [supabaseUrl] : []),
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    // Upgrade insecure requests in production
    'upgrade-insecure-requests': [],
  };

  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Returns all security headers that should be applied to every response.
 * Use this in middleware and/or next.config.ts headers configuration.
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Strict CSP — prevents data exfiltration to unauthorized domains
    'Content-Security-Policy': buildContentSecurityPolicy(),

    // Prevent the page from being embedded in an iframe anywhere
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Control referrer information leakage
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Disable unnecessary browser features
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',

    // Force HTTPS for 1 year including subdomains
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

    // Disable legacy XSS filter — rely on CSP instead
    'X-XSS-Protection': '0',

    // Prevent DNS prefetching to unknown domains (data exfiltration vector)
    'X-DNS-Prefetch-Control': 'off',

    // Prevent MIME type sniffing for downloads
    'X-Download-Options': 'noopen',

    // Prevent Adobe cross-domain policy loading
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
}

/**
 * Returns security headers as an array of {key, value} objects,
 * suitable for Next.js headers() config.
 */
export function getSecurityHeadersArray(): Array<{ key: string; value: string }> {
  const headers = getSecurityHeaders();
  return Object.entries(headers).map(([key, value]) => ({ key, value }));
}
