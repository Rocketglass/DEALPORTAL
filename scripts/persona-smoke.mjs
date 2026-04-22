/**
 * E2E smoke test — logs in via Supabase Auth, lets @supabase/ssr write real
 * cookies via a callback jar, then reuses those cookies to hit each persona's
 * critical routes on the dev server.
 *
 * Not a full Playwright suite — exercises every server component that runs
 * the auth-guard + principalContactId refactor, flagging any 500/4xx.
 *
 * For personas where we don't have a password, we use the Supabase admin API
 * to generate a one-time magic-link OTP and verify it, which yields a real
 * session without mutating the account.
 */
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const APP = 'http://localhost:3000';

function newJar() {
  const store = new Map();
  return {
    getAll: () => [...store.entries()].map(([name, value]) => ({ name, value })),
    setAll: (list) => {
      for (const { name, value, options } of list) {
        if (options?.maxAge === 0 || value === '') store.delete(name);
        else store.set(name, value);
      }
    },
    asCookieHeader: () =>
      [...store.entries()].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; '),
  };
}

async function signInWithPassword(email, password) {
  const jar = newJar();
  const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: jar.getAll, setAll: jar.setAll },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`password sign-in failed for ${email}: ${error.message}`);
  await client.auth.getSession();
  return jar;
}

/**
 * Sign in without a password by minting a magic-link OTP via the admin API,
 * then exchanging it for a session. Non-destructive — account is unaffected.
 */
async function signInWithOtp(email) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw new Error(`magiclink failed for ${email}: ${error.message}`);
  const otp = data.properties?.email_otp;
  if (!otp) throw new Error(`no OTP returned for ${email}`);

  const jar = newJar();
  const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: jar.getAll, setAll: jar.setAll },
  });
  const { error: verErr } = await client.auth.verifyOtp({ email, token: otp, type: 'magiclink' });
  if (verErr) throw new Error(`OTP verify failed for ${email}: ${verErr.message}`);
  await client.auth.getSession();
  return jar;
}

async function hit(path, jar) {
  const res = await fetch(`${APP}${path}`, {
    headers: { cookie: jar.asCookieHeader() },
    redirect: 'manual',
  });
  return { status: res.status, location: res.headers.get('location') };
}

async function runPersona(label, email, signInMethod, routes) {
  console.log(`\n=== ${label} (${email}) ===`);
  let jar;
  try {
    jar = await signInMethod();
  } catch (err) {
    console.log(`  SKIP: ${err.message}`);
    return;
  }
  for (const path of routes) {
    try {
      const { status, location } = await hit(path, jar);
      const tag =
        status === 200 ? 'OK' :
        status >= 300 && status < 400 ? 'REDIRECT' :
        status === 401 || status === 403 ? 'DENIED' :
        status === 404 ? '404' :
        status >= 500 ? 'CRASH' : 'UNEXPECTED';
      const where = location ? ` → ${location}` : '';
      console.log(`  [${String(status).padStart(3)}] ${tag.padEnd(9)} ${path}${where}`);
    } catch (err) {
      console.log(`  [ERR]  ${path} — ${err.message}`);
    }
  }
}

// Pull a few real IDs from the DB so we can exercise detail pages too.
async function pickIds() {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: props } = await admin.from('properties').select('id').limit(1);
  const { data: leases } = await admin.from('leases').select('id').limit(1);
  const { data: lois } = await admin.from('lois').select('id').limit(1);
  const { data: apps } = await admin.from('applications').select('id').limit(1);
  return {
    propertyId: props?.[0]?.id,
    leaseId: leases?.[0]?.id,
    loiId: lois?.[0]?.id,
    applicationId: apps?.[0]?.id,
  };
}

const ids = await pickIds();
console.log('Sample IDs:', ids);

const brokerRoutes = [
  '/dashboard',
  '/properties',
  '/applications',
  '/lois',
  '/leases',
  '/invoices',
  '/comps',
  '/users',
  '/settings',
  ids.propertyId ? `/properties/${ids.propertyId}` : null,
  ids.propertyId ? `/properties/${ids.propertyId}/print` : null,
  ids.leaseId ? `/leases/${ids.leaseId}` : null,
  ids.leaseId ? `/leases/${ids.leaseId}/print` : null,
  ids.loiId ? `/lois/${ids.loiId}` : null,
  ids.applicationId ? `/applications/${ids.applicationId}` : null,
].filter(Boolean);

const tenantRoutes = [
  '/tenant/dashboard',
  '/tenant/applications',
  '/tenant/leases',
  '/tenant/lois',
];

const landlordRoutes = [
  '/landlord/dashboard',
  '/landlord/applications',
  '/landlord/lois',
  '/landlord/leases',
  '/landlord/properties',
];

await runPersona('BROKER', 'rocketglass4@hotmail.com',
  () => signInWithPassword('rocketglass4@hotmail.com', 'RocketRealty2024!'), brokerRoutes);

await runPersona('ADMIN', 'neil@sersweai.com',
  () => signInWithPassword('neil@sersweai.com', 'RocketRealty2024!'), brokerRoutes);

await runPersona('TENANT', 'neilbajaj72@hotmail.com',
  () => signInWithOtp('neilbajaj72@hotmail.com'), tenantRoutes);

await runPersona('LANDLORD', 'rocketglass@gmail.com',
  () => signInWithOtp('rocketglass@gmail.com'), landlordRoutes);

// Admin should be allowed into landlord/tenant portals (role check in middleware
// allows broker/admin everywhere). Verify that too.
await runPersona('ADMIN-in-landlord-portal', 'neil@sersweai.com',
  () => signInWithPassword('neil@sersweai.com', 'RocketRealty2024!'), landlordRoutes);

await runPersona('ADMIN-in-tenant-portal', 'neil@sersweai.com',
  () => signInWithPassword('neil@sersweai.com', 'RocketRealty2024!'), tenantRoutes);
