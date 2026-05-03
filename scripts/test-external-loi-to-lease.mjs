/**
 * P1.1 verification — external-address LOI → lease conversion.
 * Confirms migration 023 lets leases.property_id / unit_id be NULL.
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
const tag = `TEST_EXT_${Date.now()}`;

// Setup: tenant + landlord (broker is auto from session)
const { data: tenantC } = await sb.from('contacts').insert({ type:'prospect', first_name: tag, last_name:'Tenant', email:`${tag}@test.com`, company_name: tag+'Biz' }).select('id').single();
const { data: landC } = await sb.from('contacts').insert({ type:'landlord', first_name:'Off', last_name:'System', email:`offsystem_${tag}@test.com` }).select('id').single();
const { data: brokerC } = await sb.from('contacts').select('id').eq('email','rocketglass4@hotmail.com').limit(1).single();

// 1. Create LOI in OFF-SYSTEM mode — no property_id, no unit_id, freeform address
console.log('1. POST /api/lois (off-system: external_address only)');
const loiRes = await fetch(`${APP}/api/lois`, {
  method:'POST', headers:{cookie,'Content-Type':'application/json'},
  body: JSON.stringify({
    tenant_contact_id: tenantC.id, landlord_contact_id: landC.id, broker_contact_id: brokerC.id,
    status: 'draft',
    external_address: '123 Off-System Way',
    external_city: 'San Diego', external_state: 'CA', external_zip: '92101',
    external_property_type: 'Industrial', external_suite: 'B-12',
    sections: [{ section_key:'base_rent', section_label:'Base Rent', display_order:1, proposed_value:'$5,000/month', status:'proposed' }],
  }),
});
const loi = await loiRes.json();
console.log('   status:', loiRes.status, 'loi.id:', loi.id?.slice(0,8));
if (!loi.id) { console.error('LOI create failed:', loi); process.exit(1); }

// Verify the LOI has external fields and null property/unit
const { data: loiRow } = await sb.from('lois').select('property_id,unit_id,external_address,external_city,external_state,external_suite').eq('id', loi.id).single();
console.log('   property_id:', loiRow.property_id, '(expect null)');
console.log('   external_address:', loiRow.external_address);

// 2. Convert to lease — same shape /leases/new submits with property_id:null, unit_id:null
console.log('\n2. POST /api/leases (off-system: property_id=null, unit_id=null)');
const leaseRes = await fetch(`${APP}/api/leases`, {
  method:'POST', headers:{cookie,'Content-Type':'application/json'},
  body: JSON.stringify({
    loi_id: loi.id,
    property_id: null,
    unit_id: null,
    tenant_contact_id: tenantC.id,
    landlord_contact_id: landC.id,
    broker_contact_id: brokerC.id,
    status: 'draft',
    form_type: 'AIR-NNN',
    lessor_name: 'Off System LLC',
    lessee_name: tag+'Biz',
    premises_address: loiRow.external_address,
    premises_city: loiRow.external_city,
    premises_state: loiRow.external_state,
    premises_sf: 2500,
    commencement_date: '2026-06-01',
    expiration_date: '2029-06-01',
    base_rent_monthly: 5000,
    parking_type: 'unreserved',
    cam_description: 'NNN — pro-rata share',
    insuring_party: 'lessor',
  }),
});
const lease = await leaseRes.json();
console.log('   status:', leaseRes.status);
console.log('   body:', JSON.stringify(lease).slice(0,200));

const passed = leaseRes.status === 200 || leaseRes.status === 201;
console.log(`\n${passed ? '✅' : '❌'} P1.1 ${passed ? 'PASSED — external-address LOI converts to lease' : 'FAILED'}`);

// Verify the lease row exists with property_id=null
if (lease.lease?.id || lease.id) {
  const leaseId = lease.lease?.id || lease.id;
  const { data: leaseRow } = await sb.from('leases').select('id,property_id,unit_id,premises_address,status').eq('id', leaseId).single();
  console.log('   lease.property_id:', leaseRow?.property_id, '(expect null)');
  console.log('   lease.unit_id:', leaseRow?.unit_id, '(expect null)');
  console.log('   lease.premises_address:', leaseRow?.premises_address);

  // Cleanup
  await sb.from('leases').delete().eq('id', leaseId);
}
console.log('\n[cleanup]');
await sb.from('loi_sections').delete().eq('loi_id', loi.id);
await sb.from('lois').delete().eq('id', loi.id);
await sb.from('audit_log').delete().eq('action','loi_created').eq('entity_id', loi.id);
await sb.from('contacts').delete().in('id', [tenantC.id, landC.id]);
console.log('  done');
