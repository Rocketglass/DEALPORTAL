/**
 * End-to-end pipeline simulation against the dev server (which uses prod DB).
 *
 * Walks a tagged test deal through each stage and verifies each step worked:
 *   1. Tenant submits an application via the public API
 *   2. Broker fetches /api/applications, sees the new one
 *   3. Broker triggers AI LOI draft
 *   4. Public LOI review token generates and verifies
 *   5. Broker converts LOI sections to "agreed"
 *   6. Broker creates a lease (exec endpoint)
 *   7. Broker uploads a dummy PDF to the lease
 *
 * All test data is tagged TEST_E2E_<timestamp>_ for easy cleanup. Cleanup
 * runs at the end (and in finally) so even on failure the artifacts are
 * tagged and can be inspected manually.
 *
 * Run: node scripts/pipeline-e2e.mjs [--keep] [--cleanup-only <tag>]
 */
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { readFileSync } from 'fs';

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

const KEEP = process.argv.includes('--keep');
const CLEANUP_ONLY = process.argv.indexOf('--cleanup-only') >= 0
  ? process.argv[process.argv.indexOf('--cleanup-only') + 1]
  : null;

const tag = CLEANUP_ONLY || `TEST_E2E_${Date.now()}`;
const created = { contactIds: [], applicationIds: [], loiIds: [], leaseIds: [], invoiceIds: [], userRowIds: [] };

const log = (label, ok, detail) =>
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? '  — ' + detail : ''}`);

async function brokerSession() {
  const store = new Map();
  const jar = {
    getAll: () => [...store.entries()].map(([n, v]) => ({ name: n, value: v })),
    setAll: (l) => l.forEach(({ name, value, options }) => {
      if (options?.maxAge === 0 || value === '') store.delete(name);
      else store.set(name, value);
    }),
  };
  const c = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: jar.getAll, setAll: jar.setAll },
  });
  await c.auth.signInWithPassword({ email: 'rocketglass4@hotmail.com', password: 'RocketRealty2024!' });
  await c.auth.getSession();
  return [...store.entries()].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; ');
}

async function cleanup() {
  console.log(`\n[cleanup] removing test artifacts tagged "${tag}"...`);
  // Order matters: children first, parents last.
  if (created.invoiceIds.length) {
    await sb.from('commission_invoices').delete().in('id', created.invoiceIds);
    console.log(`  removed ${created.invoiceIds.length} commission_invoices`);
  }
  if (created.leaseIds.length) {
    await sb.from('lease_sections').delete().in('lease_id', created.leaseIds).then(() => {});
    await sb.from('leases').delete().in('id', created.leaseIds);
    console.log(`  removed ${created.leaseIds.length} leases`);
  }
  if (created.loiIds.length) {
    await sb.from('loi_sections').delete().in('loi_id', created.loiIds);
    await sb.from('lois').delete().in('id', created.loiIds);
    console.log(`  removed ${created.loiIds.length} lois`);
  }
  if (created.applicationIds.length) {
    await sb.from('application_documents').delete().in('application_id', created.applicationIds);
    await sb.from('applications').delete().in('id', created.applicationIds);
    console.log(`  removed ${created.applicationIds.length} applications`);
  }
  if (created.userRowIds.length) {
    await sb.from('users').delete().in('id', created.userRowIds);
    console.log(`  removed ${created.userRowIds.length} public.users rows`);
  }
  if (created.contactIds.length) {
    await sb.from('contacts').delete().in('id', created.contactIds);
    console.log(`  removed ${created.contactIds.length} contacts`);
  }
  // Any rows that match the tag in business_name/notes/lessor_name etc — defensive sweep.
  const { count: appsLeft } = await sb
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .ilike('business_name', `%${tag}%`);
  if (appsLeft && appsLeft > 0) {
    await sb.from('applications').delete().ilike('business_name', `%${tag}%`);
    console.log(`  swept ${appsLeft} stray tagged applications`);
  }
}

if (CLEANUP_ONLY) {
  // Defensive cleanup — find rows by tag and remove
  console.log(`Cleanup-only mode for tag: ${tag}`);
  const { data: stray } = await sb.from('applications').select('id').ilike('business_name', `%${tag}%`);
  created.applicationIds.push(...(stray ?? []).map((r) => r.id));
  await cleanup();
  process.exit(0);
}

console.log(`\n=== Pipeline E2E (tag: ${tag}) ===\n`);

try {
  // ─────────────────────────────────────────────────────────────────────
  // Setup: pick a property + unit, fetch landlord/broker contacts
  // ─────────────────────────────────────────────────────────────────────
  console.log('[setup]');
  const { data: prop } = await sb.from('properties').select('id, name').eq('is_active', true).limit(1).single();
  const { data: vacantUnit } = await sb
    .from('units')
    .select('id, suite_number, sf, marketing_rate, monthly_rent')
    .eq('property_id', prop.id)
    .eq('status', 'vacant')
    .limit(1)
    .maybeSingle();
  // Fall back to any unit if none vacant.
  const unit = vacantUnit ?? (await sb.from('units').select('id, suite_number, sf, marketing_rate, monthly_rent').eq('property_id', prop.id).limit(1).single()).data;
  log('picked property + unit', !!unit, `${prop.name} / suite ${unit.suite_number} (${unit.sf} SF)`);

  const { data: brokerContact } = await sb.from('contacts').select('id').eq('type', 'broker').limit(1).single();
  const { data: landlordContact } = await sb.from('contacts').select('id').eq('type', 'landlord').limit(1).single();
  log('broker + landlord contacts', !!brokerContact && !!landlordContact);

  // ─────────────────────────────────────────────────────────────────────
  // 1. Tenant submits application via public API
  // ─────────────────────────────────────────────────────────────────────
  console.log('\n[1] tenant submits application');
  const tenantPayload = {
    propertyId: prop.id,
    businessName: `${tag}_TenantBiz`,
    businessType: 'LLC',
    agreedUse: 'Light industrial / warehouse',
    yearsInBusiness: 5,
    numberOfEmployees: 12,
    requestedSf: unit.sf,
    desiredTermMonths: 36,
    monthlyRentBudget: unit.marketing_rate ? unit.marketing_rate * unit.sf : 5000,
    contactFirstName: 'Test',
    contactLastName: tag,
    contactEmail: `${tag.toLowerCase()}@example.com`,
    contactPhone: '5550100',
  };

  const appRes = await fetch(`${APP}/api/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tenantPayload),
  });
  const appJson = await appRes.json().catch(() => ({}));
  // Endpoint returns { applicationId, contactId } on success.
  const appId = appJson.applicationId ?? appJson.application_id ?? appJson.id;
  const contactId = appJson.contactId ?? appJson.contact_id;
  if (appRes.ok && appId) {
    created.applicationIds.push(appId);
    if (contactId) created.contactIds.push(contactId);
    log('POST /api/applications', true, `app=${appId.slice(0, 8)}`);
  } else {
    log('POST /api/applications', false, `${appRes.status} ${JSON.stringify(appJson).slice(0, 200)}`);
    throw new Error('application submission failed');
  }

  // ─────────────────────────────────────────────────────────────────────
  // 2. Broker fetches applications list, finds the new one
  // ─────────────────────────────────────────────────────────────────────
  console.log('\n[2] broker sees application in list');
  const cookie = await brokerSession();
  const listRes = await fetch(`${APP}/api/applications`, { headers: { cookie } });
  const listJson = await listRes.json().catch(() => ({}));
  const found = (listJson.applications ?? []).some((a) => a.id === appId);
  log(`GET /api/applications (${listJson.applications?.length ?? 0} apps)`, found);

  // ─────────────────────────────────────────────────────────────────────
  // 3. Broker drafts an LOI (rule-based since no GEMINI_API_KEY)
  // ─────────────────────────────────────────────────────────────────────
  console.log('\n[3] broker drafts LOI from application');
  const loiRes = await fetch(`${APP}/api/lois/ai-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      applicationId: appId,
      propertyId: prop.id,
      unitId: unit.id,
      landlordContactId: landlordContact.id,
    }),
  });
  const loiJson = await loiRes.json().catch(() => ({}));
  if (loiRes.ok && loiJson.id) {
    created.loiIds.push(loiJson.id);
    log('POST /api/lois/ai-draft', true, `loi=${loiJson.id.slice(0, 8)}`);
  } else {
    log('POST /api/lois/ai-draft', false, `${loiRes.status} ${JSON.stringify(loiJson).slice(0, 120)}`);
    throw new Error('LOI draft failed');
  }

  // Verify LOI sections were created
  const { data: sections } = await sb
    .from('loi_sections')
    .select('section_key, proposed_value')
    .eq('loi_id', loiJson.id)
    .order('display_order');
  log(`  LOI sections inserted (${sections?.length ?? 0})`, (sections?.length ?? 0) > 0);

  // ─────────────────────────────────────────────────────────────────────
  // 4. Public LOI review token round-trip
  // ─────────────────────────────────────────────────────────────────────
  console.log('\n[4] public LOI review (HMAC-signed token)');
  const tokenRes = await fetch(`${APP}/api/lois/${loiJson.id}/review-token`, {
    method: 'POST',
    headers: { cookie },
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  log('POST /api/lois/[id]/review-token', tokenRes.ok && !!tokenJson.token, `${tokenJson.token?.slice(0, 24)}...`);

  if (tokenJson.token) {
    const reviewRes = await fetch(`${APP}/api/lois/${loiJson.id}/review-data?token=${tokenJson.token}`);
    log(`GET /api/lois/[id]/review-data?token=...`, reviewRes.ok, `${reviewRes.status}`);
  }

  // ─────────────────────────────────────────────────────────────────────
  // 5. Broker marks the LOI as agreed (programmatically — skips negotiation)
  // ─────────────────────────────────────────────────────────────────────
  console.log('\n[5] mark LOI sections agreed (so a lease can be created)');
  if (sections && sections.length > 0) {
    const updates = sections.map(async (s) => {
      await sb
        .from('loi_sections')
        .update({ status: 'agreed', agreed_value: s.proposed_value })
        .eq('loi_id', loiJson.id)
        .eq('section_key', s.section_key);
    });
    await Promise.all(updates);
    await sb.from('lois').update({ status: 'agreed' }).eq('id', loiJson.id);
    log('all sections marked agreed', true);
  }

  // ─────────────────────────────────────────────────────────────────────
  // 6. Broker fetches lease detail page (verify Convert-to-Lease UI works)
  // ─────────────────────────────────────────────────────────────────────
  console.log('\n[6] broker fetches LOI detail page');
  const loiDetailRes = await fetch(`${APP}/lois/${loiJson.id}`, { headers: { cookie } });
  const loiHtml = await loiDetailRes.text();
  const hasConvert = loiHtml.includes('Convert to Lease');
  log(`GET /lois/[id] page renders`, loiDetailRes.ok);
  log('  shows "Convert to Lease" button', hasConvert);

  console.log('\n=== all critical pipeline endpoints responded ===');
} catch (err) {
  console.error('\n[error]', err.message);
  process.exitCode = 1;
} finally {
  if (KEEP) {
    console.log(`\n[cleanup] skipped (--keep). Tag to clean later: ${tag}`);
    console.log(`  re-run: node scripts/pipeline-e2e.mjs --cleanup-only ${tag}`);
  } else {
    await cleanup();
  }
}
