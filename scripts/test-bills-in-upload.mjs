import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { readFileSync } from 'fs';

const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()];}));

async function brokerCookieHeader() {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: 'rocketglass4@hotmail.com' });
  const otp = link.properties.email_otp;
  const store = new Map();
  const jar = {
    getAll: () => [...store.entries()].map(([n,v]) => ({ name: n, value: v })),
    setAll: (list) => { for (const { name, value, options } of list) { if (options?.maxAge === 0 || value === '') store.delete(name); else store.set(name, value); } },
  };
  const c = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: jar });
  await c.auth.verifyOtp({ email: 'rocketglass4@hotmail.com', token: otp, type: 'email' });
  return [...store.entries()].map(([n,v]) => `${n}=${encodeURIComponent(v)}`).join('; ');
}

const cookie = await brokerCookieHeader();

// Build multipart form
const fd = new FormData();
fd.append('vendor_name', 'Acme Vendor LLC');
fd.append('amount', '1234.56');
const pdfBytes = readFileSync('/tmp/test-bill.pdf');
fd.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'test-bill.pdf');

console.log('POST /api/bills-in...');
const res = await fetch('http://localhost:3000/api/bills-in', { method: 'POST', headers: { cookie }, body: fd });
const json = await res.json().catch(()=>({}));
console.log(`  status: ${res.status}`);
console.log(`  body:`, JSON.stringify(json).slice(0,300));

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: list, error: listErr } = await sb.from('bills_in').select('id,vendor_name,amount,paid,paid_at,pdf_url').order('created_at',{ascending:false}).limit(3);
console.log('\nbills_in rows:', listErr ? 'ERR '+listErr.message : `(${list?.length ?? 0})`);
list?.forEach(b=>console.log(' •', b.vendor_name, '$'+b.amount, b.paid?'PAID':'unpaid', b.pdf_url));

if (list?.[0]?.id) {
  const billId = list[0].id;
  console.log('\nPATCH /api/bills-in/'+billId.slice(0,8)+' (mark paid)...');
  const pr = await fetch(`http://localhost:3000/api/bills-in/${billId}`, { method:'PATCH', headers:{cookie,'Content-Type':'application/json'}, body: JSON.stringify({ paid: true }) });
  console.log(`  status: ${pr.status}`);

  console.log('\nGET /api/bills-in/'+billId.slice(0,8)+'/preview...');
  const previewR = await fetch(`http://localhost:3000/api/bills-in/${billId}/preview`, { headers: { cookie }, redirect: 'manual' });
  console.log(`  status: ${previewR.status}`);

  // Verify paid_at is now set
  const { data: after } = await sb.from('bills_in').select('paid_at').eq('id', billId).maybeSingle();
  console.log(`  paid_at after PATCH: ${after?.paid_at}`);

  // Cleanup
  console.log('\nDELETE cleanup...');
  const dr = await fetch(`http://localhost:3000/api/bills-in/${billId}`, { method:'DELETE', headers:{cookie} });
  console.log(`  status: ${dr.status}`);
}
