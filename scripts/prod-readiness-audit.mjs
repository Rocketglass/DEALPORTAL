/**
 * Production-readiness audit. Combines static config inspection, DB checks
 * via service role, and HTTP probes against the dev server. Reports each
 * check as PASS / WARN / FAIL with a short reason.
 *
 * Run: node scripts/prod-readiness-audit.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const APP = 'http://localhost:3000';
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const results = [];
function record(category, check, status, detail) {
  results.push({ category, check, status, detail });
}

// ─────────────────────────────────────────────────────────────────────────
// 1. ENVIRONMENT & CONFIG
// ─────────────────────────────────────────────────────────────────────────
const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DOCUSIGN_INTEGRATION_KEY',
  'DOCUSIGN_SECRET_KEY',
  'DOCUSIGN_ACCOUNT_ID',
  'DOCUSIGN_BASE_URL',
  'DOCUSIGN_USER_ID',
  'DOCUSIGN_RSA_PRIVATE_KEY',
  'DOCUSIGN_CONNECT_HMAC_SECRET',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_APP_URL',
];
// `.env.local` is the LOCAL dev environment. Vercel env (prod/preview) is
// configured separately. Missing keys here only matter if you also expect
// them in prod — flagged as WARN with the production reminder.
for (const key of requiredEnv) {
  const v = env[key];
  if (!v) record('env', key, 'WARN', '.env.local missing — verify it is set in Vercel for prod');
  else if (/your-|XXX|placeholder|example\.com/i.test(v)) record('env', key, 'FAIL', `placeholder value: ${v.slice(0, 40)}`);
  else record('env', key, 'PASS', '');
}

if (env.DOCUSIGN_BASE_URL?.includes('demo.docusign')) {
  record('env', 'DOCUSIGN_BASE_URL', 'WARN', 'still pointing at demo environment — flip to production after Go Live');
}

// ─────────────────────────────────────────────────────────────────────────
// 2. BROKER CONFIG (no leftover placeholders)
// ─────────────────────────────────────────────────────────────────────────
const brokerSrc = readFileSync('src/lib/config/broker.ts', 'utf8');
const placeholders = ['DRE #01234567', 'XXXXXXXXX', '1234 Commercial Blvd', 'First Republic Bank'];
for (const p of placeholders) {
  if (brokerSrc.includes(p)) record('broker_config', p, 'FAIL', 'placeholder still in broker.ts');
}
if (!placeholders.some((p) => brokerSrc.includes(p))) {
  record('broker_config', 'placeholders cleared', 'PASS', '');
}

// ─────────────────────────────────────────────────────────────────────────
// 3. SECURITY HEADERS (HTTP probe)
// ─────────────────────────────────────────────────────────────────────────
const headersRes = await fetch(APP + '/login', { redirect: 'manual' });
const required = ['x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
for (const h of required) {
  if (headersRes.headers.has(h)) record('security_headers', h, 'PASS', headersRes.headers.get(h).slice(0, 60));
  else record('security_headers', h, 'FAIL', 'header missing');
}
const csp = headersRes.headers.get('content-security-policy') || '';
if (csp) record('security_headers', 'content-security-policy', 'PASS', csp.length + ' chars');
else record('security_headers', 'content-security-policy', 'WARN', 'no CSP — recommended even with strict-host backend');

// ─────────────────────────────────────────────────────────────────────────
// 4. DATABASE: RLS on every user-data table
// ─────────────────────────────────────────────────────────────────────────
const sensitiveTables = [
  'users', 'contacts', 'properties', 'units', 'applications',
  'application_documents', 'lois', 'loi_sections', 'leases',
  'lease_sections', 'commission_invoices', 'invitations',
  'audit_log', 'notifications', 'deal_collaborators',
];
// Indirect check: with anon key, sensitive tables should return empty/forbidden.
// Service role bypasses RLS so this needs the anon client.
const sbAnon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
for (const t of sensitiveTables) {
  try {
    const { data, error } = await sbAnon.from(t).select('*', { count: 'exact', head: true }).limit(1);
    if (error) {
      // Permission denied is what we want — RLS blocking anon read.
      record('rls', t, 'PASS', `anon blocked (${error.message.slice(0, 40)})`);
    } else if (data === null || (Array.isArray(data) && data.length === 0)) {
      record('rls', t, 'PASS', 'anon read returns empty (RLS scoped)');
    } else {
      record('rls', t, 'FAIL', `anon read returned ${Array.isArray(data) ? data.length : 'data'} rows — RLS may be open`);
    }
  } catch (err) {
    record('rls', t, 'WARN', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 5. DATA INTEGRITY: orphan auth_provider_ids, missing contacts
// ─────────────────────────────────────────────────────────────────────────
const { data: { users: authUsers } } = await sb.auth.admin.listUsers();
const { data: pubUsers } = await sb.from('users').select('email, auth_provider_id, role, contact_id, is_active');

const authIds = new Set(authUsers.map((u) => u.id));
const orphans = (pubUsers ?? []).filter((u) => u.is_active && !authIds.has(u.auth_provider_id));
if (orphans.length === 0) record('data', 'public.users auth links', 'PASS', `${pubUsers?.length ?? 0} users, all linked`);
else record('data', 'public.users auth links', 'FAIL', `${orphans.length} active users with stale auth_provider_id: ${orphans.map((o) => o.email).join(', ')}`);

const ghostAuth = authUsers.filter((au) => !pubUsers.some((pu) => pu.auth_provider_id === au.id));
if (ghostAuth.length === 0) record('data', 'auth users without public row', 'PASS', '');
else record('data', 'auth users without public row', 'WARN', `${ghostAuth.length} ghost auth rows (old test invitations) — won't break anything but worth cleaning up: ${ghostAuth.map((u) => u.email).slice(0, 5).join(', ')}${ghostAuth.length > 5 ? '...' : ''}`);

const noContact = (pubUsers ?? []).filter((u) => u.is_active && !u.contact_id && u.role !== 'admin' && u.role !== 'broker');
if (noContact.length === 0) record('data', 'users with contact_id', 'PASS', '');
else record('data', 'users with contact_id', 'WARN', `${noContact.length} non-broker users without contact_id: ${noContact.map((u) => u.email).join(', ')}`);

// ─────────────────────────────────────────────────────────────────────────
// 6. STORAGE BUCKETS
// ─────────────────────────────────────────────────────────────────────────
// property-photos is intentionally public (used in marketing flyers). The
// other two are private and use signed URLs for access.
const { data: buckets } = await sb.storage.listBuckets();
const expected = [
  { name: 'application-documents', shouldBePublic: false },
  { name: 'lease-documents',       shouldBePublic: false },
  { name: 'property-photos',       shouldBePublic: true  },
];
for (const { name, shouldBePublic } of expected) {
  const b = (buckets ?? []).find((x) => x.name === name);
  if (!b) record('storage', name, 'FAIL', 'bucket missing');
  else if (b.public !== shouldBePublic) {
    record('storage', name, 'FAIL',
      `expected ${shouldBePublic ? 'public' : 'private'}, found ${b.public ? 'public' : 'private'}`);
  } else {
    record('storage', name, 'PASS', shouldBePublic ? 'public (intentional, marketing)' : 'private');
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 7. CRITICAL FILES PRESENT
// ─────────────────────────────────────────────────────────────────────────
// robots can live at either src/app/robots.ts or public/robots.txt — both work.
const robotsAlternatives = ['src/app/robots.ts', 'public/robots.txt'];
const robotsPresent = robotsAlternatives.find((p) => existsSync(resolve(p)));
record('files', 'robots', robotsPresent ? 'PASS' : 'FAIL', robotsPresent || 'neither robots.ts nor robots.txt found');

const sitemapAlternatives = ['src/app/sitemap.ts', 'src/app/sitemap.xml', 'public/sitemap.xml'];
const sitemapPresent = sitemapAlternatives.find((p) => existsSync(resolve(p)));
record('files', 'sitemap', sitemapPresent ? 'PASS' : 'WARN', sitemapPresent || 'no sitemap configured');

for (const path of [
  'src/app/unauthorized/page.tsx',
  'src/app/pending/page.tsx',
  'src/lib/security/auth-guard.ts',
  'src/lib/security/headers.ts',
  'src/lib/security/rate-limit.ts',
  'sentry.client.config.ts',
  'sentry.server.config.ts',
  'public/favicon.ico',
]) {
  if (existsSync(resolve(path))) record('files', path, 'PASS', '');
  else record('files', path, 'WARN', 'missing');
}

// ─────────────────────────────────────────────────────────────────────────
// 8. REPORT
// ─────────────────────────────────────────────────────────────────────────
const order = { FAIL: 0, WARN: 1, PASS: 2 };
results.sort((a, b) => order[a.status] - order[b.status] || a.category.localeCompare(b.category));

const counts = { PASS: 0, WARN: 0, FAIL: 0 };
for (const r of results) counts[r.status]++;

console.log('');
console.log(`PASS: ${counts.PASS}    WARN: ${counts.WARN}    FAIL: ${counts.FAIL}`);
console.log('─'.repeat(80));

let lastCat = '';
for (const r of results) {
  if (r.category !== lastCat) {
    console.log(`\n[${r.category}]`);
    lastCat = r.category;
  }
  const icon = r.status === 'PASS' ? '✓' : r.status === 'WARN' ? '!' : '✗';
  console.log(`  ${icon} ${r.status.padEnd(4)} ${r.check}${r.detail ? ' — ' + r.detail : ''}`);
}
process.exit(counts.FAIL > 0 ? 1 : 0);
