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

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Cleanup orphan from earlier
const { data: existing } = await sb.from('bills_in').select('id,pdf_url').eq('vendor_name','Acme Vendor LLC');
console.log('Cleaning up', existing?.length ?? 0, 'leftover rows...');
for (const b of existing ?? []) {
  await sb.storage.from('bills-in').remove([b.pdf_url]);
  await sb.from('bills_in').delete().eq('id', b.id);
}

// RLS: landlord + tenant should be denied
for (const email of ['rocketglass@gmail.com','neilbajaj72@hotmail.com']) {
  const cookie = await cookieFor(email);
  const r = await fetch('http://localhost:3000/api/bills-in', { headers: { cookie } });
  console.log(`GET /api/bills-in as ${email}:`, r.status);
}
