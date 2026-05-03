import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// V2.2 — only Blank LOI template
const { data: tmpls } = await sb.from('loi_templates').select('id,name,is_default').order('name');
console.log('LOI templates:', tmpls?.length ?? 0);
tmpls?.forEach(t=>console.log('  •', t.name, t.is_default ? '(default)' : ''));

// V2.3b — bills_in table exists
const { data: bills, error: billsErr } = await sb.from('bills_in').select('id,vendor_name,amount,paid_at').limit(5);
console.log('\nbills_in table:', billsErr ? 'ERROR: '+billsErr.message : `OK (${bills?.length ?? 0} rows)`);
bills?.forEach(b=>console.log('  •', b.vendor_name, '$'+b.amount, b.paid_at?'PAID':'unpaid'));

// V2.1 / V2.4 — external/offline columns on lois + leases
const sample = await sb.from('lois').select('id,external_address,external_suite,external_property_type,signed_pdf_url,status').limit(3);
console.log('\nlois external+signed columns visible:', sample.error ? 'ERROR: '+sample.error.message : 'OK');

const leaseSample = await sb.from('leases').select('id,executed_pdf_url,status').limit(3);
console.log('leases executed_pdf_url visible:', leaseSample.error ? 'ERROR: '+leaseSample.error.message : 'OK');

// Audit log entries for offline flow
const { data: audits } = await sb.from('audit_log').select('action,created_at').in('action',['loi_agreed_offline','lease_executed_offline']).order('created_at',{ascending:false}).limit(5);
console.log('\nOffline audit entries:', audits?.length ?? 0);
audits?.forEach(a=>console.log('  •', a.action, a.created_at));

// Storage buckets
const { data: buckets } = await sb.storage.listBuckets();
console.log('\nStorage buckets:');
buckets?.forEach(b=>console.log('  •', b.name, b.public?'public':'private'));
