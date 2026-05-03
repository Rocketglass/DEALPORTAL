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

// Send a malicious commission_amount that should be ignored
const payload = {
  payee_name: 'TEST_INV Payee',
  payee_email: 'test@test.com',
  property_address: '123 Test St',
  description: 'TEST_INV derivation test',
  total_consideration: 100000,
  commission_rate_percent: 5,
  commission_amount: 999999,  // <-- malicious; should be ignored, server derives 5000
  due_date: '2026-06-01',
};
const r = await fetch('http://localhost:3000/api/invoices', { method:'POST', headers:{cookie,'Content-Type':'application/json'}, body: JSON.stringify(payload) });
const j = await r.json().catch(()=>({}));
console.log('POST /api/invoices status:', r.status);
console.log('  body:', JSON.stringify(j).slice(0,200));
const id = j.invoice?.id || j.id;
if (id) {
  const { data: row } = await sb.from('commission_invoices').select('id,total_consideration,commission_rate_percent,commission_amount').eq('id', id).maybeSingle();
  console.log('\nDB row:');
  console.log('  total_consideration:', row?.total_consideration);
  console.log('  commission_rate_percent:', row?.commission_rate_percent);
  console.log('  commission_amount:', row?.commission_amount);
  console.log(`  expected: ${100000 * 0.05} = 5000`);
  console.log(`  PASS:`, Number(row?.commission_amount) === 5000);
  await sb.from('commission_invoices').delete().eq('id', id);
  console.log('  cleanup: ok');
}
