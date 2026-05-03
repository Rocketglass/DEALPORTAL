/**
 * Test V2.4 — offline-signed flow for LOI + Lease.
 * Creates a draft LOI via ai-draft, marks agreed offline with a PDF upload,
 * verifies status flips, audit log entries, and signed_pdf_url is set.
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
const tag = `TEST_OFFLINE_${Date.now()}`;
const created = { loiIds:[], leaseIds:[], appIds:[], invoiceIds:[] };

// Pick a property + landlord/tenant
const { data: prop } = await sb.from('properties').select('id').limit(1).single();
const { data: unit } = await sb.from('units').select('id').eq('property_id', prop.id).limit(1).single();
const { data: brokerC } = await sb.from('contacts').select('id').eq('email','rocketglass4@hotmail.com').limit(1).single();
const { data: landC } = await sb.from('contacts').select('id').eq('type','landlord').limit(1).single();

// 1. Create a tenant contact + application + LOI
const { data: tenantC } = await sb.from('contacts').insert({ type:'prospect', first_name: tag, last_name:'Tenant', email:`${tag}@test.com`, company_name:`${tag}Biz` }).select('id').single();
const { data: app } = await sb.from('applications').insert({ property_id: prop.id, application_type:'property', contact_id: tenantC.id, status:'submitted', business_name:`${tag}Biz`, submitted_at: new Date().toISOString(), credit_check_status:'not_run' }).select('id').single();
created.appIds.push(app.id);

const draftR = await fetch(`${APP}/api/lois/ai-draft`, { method:'POST', headers:{cookie,'Content-Type':'application/json'}, body: JSON.stringify({ applicationId: app.id, propertyId: prop.id, unitId: unit.id, landlordContactId: landC.id })});
const draft = await draftR.json();
console.log('1. LOI draft:', draftR.status, draft.id?.slice(0,8));
created.loiIds.push(draft.id);

// 2. Mark agreed offline — POST a PDF
const pdf = readFileSync('/tmp/test-bill.pdf');
const fd = new FormData();
fd.append('file', new Blob([pdf], { type:'application/pdf' }), 'signed-loi.pdf');
const offR = await fetch(`${APP}/api/lois/${draft.id}/mark-agreed-offline`, { method:'POST', headers:{cookie}, body: fd });
const offJ = await offR.json().catch(()=>({}));
console.log('2. mark-agreed-offline:', offR.status, JSON.stringify(offJ).slice(0,180));

// 3. Verify status, signed_pdf_url, all sections agreed, audit log entry
const { data: loiAfter } = await sb.from('lois').select('id,status,signed_pdf_url').eq('id', draft.id).single();
const { data: secs } = await sb.from('loi_sections').select('section_key,status').eq('loi_id', draft.id);
const { data: audit } = await sb.from('audit_log').select('action,entity_id,created_at').eq('action','loi_agreed_offline').eq('entity_id', draft.id);
console.log('3. After offline-mark:');
console.log('   loi.status:', loiAfter?.status, '(expect: agreed)');
console.log('   signed_pdf_url:', loiAfter?.signed_pdf_url ? 'SET' : 'MISSING');
const allAgreed = secs?.every(s => s.status === 'agreed' || s.status === 'accepted');
console.log('   all sections agreed:', allAgreed, `(${secs?.filter(s=>s.status==='agreed'||s.status==='accepted').length}/${secs?.length})`);
console.log('   audit log entry:', audit?.length === 1 ? 'YES' : `MISSING (${audit?.length} entries)`);

// 4. Now test lease offline-execute. Create a lease from the agreed LOI.
const { data: lease, error: leaseErr } = await sb.from('leases').insert({
  property_id: prop.id, unit_id: unit.id,
  tenant_contact_id: tenantC.id, landlord_contact_id: landC.id, broker_contact_id: brokerC.id,
  loi_id: draft.id, status: 'draft',
  lessor_name: 'TEST Lessor', lessee_name: tag+'Biz',
  premises_address: '123 Test St', premises_city: 'San Diego', premises_state: 'CA', premises_sf: 1000,
  commencement_date: '2026-06-01', expiration_date: '2029-06-01',
  base_rent_monthly: 5000,
}).select('id').single();
if (leaseErr) { console.error('lease insert error:', leaseErr.message); throw leaseErr; }
created.leaseIds.push(lease.id);
console.log('\n4. Created lease:', lease.id.slice(0,8));

const fd2 = new FormData();
fd2.append('file', new Blob([pdf], { type:'application/pdf' }), 'executed-lease.pdf');
const exR = await fetch(`${APP}/api/leases/${lease.id}/mark-executed-offline`, { method:'POST', headers:{cookie}, body: fd2 });
const exJ = await exR.json().catch(()=>({}));
console.log('5. mark-executed-offline:', exR.status, JSON.stringify(exJ).slice(0,180));

const { data: leaseAfter } = await sb.from('leases').select('id,status,executed_pdf_url').eq('id', lease.id).single();
const { data: leaseAudit } = await sb.from('audit_log').select('action,entity_id').eq('action','lease_executed_offline').eq('entity_id', lease.id);
console.log('6. After offline-execute:');
console.log('   lease.status:', leaseAfter?.status, '(expect: executed)');
console.log('   executed_pdf_url:', leaseAfter?.executed_pdf_url ? 'SET' : 'MISSING');
console.log('   audit log entry:', leaseAudit?.length === 1 ? 'YES' : `MISSING (${leaseAudit?.length} entries)`);

// 7. Did downstream commission invoice auto-generate?
const { data: invoice } = await sb.from('commission_invoices').select('id,lease_id').eq('lease_id', lease.id);
console.log('   downstream invoice auto-generated:', invoice?.length > 0 ? `YES (${invoice.length})` : 'NO');
if (invoice?.length) created.invoiceIds.push(...invoice.map(i=>i.id));

// Cleanup
console.log('\n[cleanup]');
for (const id of created.invoiceIds) await sb.from('commission_invoices').delete().eq('id', id);
for (const id of created.leaseIds) await sb.from('leases').delete().eq('id', id);
for (const id of created.loiIds) {
  await sb.from('loi_sections').delete().eq('loi_id', id);
  await sb.from('lois').delete().eq('id', id);
}
for (const id of created.appIds) await sb.from('applications').delete().eq('id', id);
await sb.from('contacts').delete().eq('id', tenantC.id);
await sb.from('audit_log').delete().in('action', ['loi_agreed_offline','lease_executed_offline']).in('entity_id', [draft.id, lease.id]);
console.log('  done');
