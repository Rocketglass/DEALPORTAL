/**
 * P1.2 race fix verification — fire 2 simultaneous Mark-Executed-Offline
 * requests against the same lease. Confirm:
 *  - exactly one returns 200 with an invoice_id
 *  - exactly one returns 409 'already marked executed'
 *  - exactly ONE commission_invoice exists for the lease
 *  - the orphan storage upload from the loser is cleaned up
 */
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { readFileSync } from 'fs';

const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()];}));

async function cookieFor(email) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const otp = link.properties.email_otp;
  const store = new Map();
  const jar = { getAll: () => [...store.entries()].map(([n,v]) => ({name:n,value:v})), setAll: (l)=>{ for(const{name,value,options}of l){if(options?.maxAge===0||value==='')store.delete(name);else store.set(name,value);}}};
  const c = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: jar });
  await c.auth.verifyOtp({ email, token: otp, type: 'email' });
  return [...store.entries()].map(([n,v]) => `${n}=${encodeURIComponent(v)}`).join('; ');
}

const cookie = await cookieFor('rocketglass4@hotmail.com');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const APP = 'http://localhost:3000';
const tag = `TEST_RACE_${Date.now()}`;

const { data: prop } = await sb.from('properties').select('id').limit(1).single();
const { data: unit } = await sb.from('units').select('id').eq('property_id', prop.id).limit(1).single();
const { data: brokerC } = await sb.from('contacts').select('id').eq('email','rocketglass4@hotmail.com').limit(1).single();
const { data: landC } = await sb.from('contacts').select('id').eq('type','landlord').limit(1).single();
const { data: tenantC } = await sb.from('contacts').insert({ type:'prospect', first_name: tag, last_name:'T', email:`${tag}@test.com`, company_name: tag+'Biz' }).select('id').single();

const { data: lease } = await sb.from('leases').insert({
  property_id: prop.id, unit_id: unit.id,
  tenant_contact_id: tenantC.id, landlord_contact_id: landC.id, broker_contact_id: brokerC.id,
  status: 'draft',
  lessor_name: 'Race Lessor', lessee_name: tag+'Biz',
  premises_address: '123 Race St', premises_city: 'San Diego', premises_state: 'CA', premises_sf: 1000,
  commencement_date: '2026-06-01', expiration_date: '2029-06-01',
  base_rent_monthly: 5000,
}).select('id').single();
console.log('Created lease:', lease.id.slice(0,8));

// Fire 2 simultaneous mark-executed-offline POSTs
const pdf = readFileSync('/tmp/test-bill.pdf');
function makeReq(label) {
  const fd = new FormData();
  fd.append('file', new Blob([pdf], { type:'application/pdf' }), `signed-${label}.pdf`);
  return fetch(`${APP}/api/leases/${lease.id}/mark-executed-offline`, { method:'POST', headers:{cookie}, body: fd }).then(async r=>({label, status:r.status, body: await r.json().catch(()=>({}))}));
}
const [a, b] = await Promise.all([makeReq('A'), makeReq('B')]);
console.log('\nrequest A:', a.status, JSON.stringify(a.body).slice(0,150));
console.log('request B:', b.status, JSON.stringify(b.body).slice(0,150));

const winners = [a,b].filter(r=>r.status===200);
const losers = [a,b].filter(r=>r.status===409);
console.log(`\nresult: ${winners.length} winner(s), ${losers.length} loser(s)`);

// Count invoices generated for this lease
const { data: invs } = await sb.from('commission_invoices').select('id').eq('lease_id', lease.id);
console.log(`commission_invoices for lease: ${invs?.length} (expect: 1)`);
const racePassed = winners.length === 1 && losers.length === 1 && invs?.length === 1;
console.log(`\n${racePassed ? '✅' : '❌'} RACE FIX ${racePassed ? 'PASSED' : 'FAILED'}`);

// Verify orphan storage cleanup — list lease-documents/<lease.id>/
const { data: storedFiles } = await sb.storage.from('lease-documents').list(lease.id);
const offlineFiles = (storedFiles ?? []).filter(f=>f.name.startsWith('executed-offline-'));
console.log(`offline PDFs still in storage for this lease: ${offlineFiles.length} (expect: 1 — only winner's)`);

// Cleanup
console.log('\n[cleanup]');
await sb.from('units').update({current_lease_id: null}).eq('current_lease_id', lease.id);
if (invs) await sb.from('commission_invoices').delete().in('id', invs.map(i=>i.id));
await sb.from('lease_sections').delete().eq('lease_id', lease.id);
await sb.from('leases').delete().eq('id', lease.id);
await sb.from('contacts').delete().eq('id', tenantC.id);
await sb.from('audit_log').delete().eq('action', 'lease_executed_offline').eq('entity_id', lease.id);
for (const f of offlineFiles) await sb.storage.from('lease-documents').remove([`${lease.id}/${f.name}`]);
console.log('  done');
