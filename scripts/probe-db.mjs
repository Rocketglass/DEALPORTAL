import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
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

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Users with principal_id set (the agent-delegation code path)
const { data: agents } = await sb
  .from('users')
  .select('id, email, role, contact_id, principal_id')
  .not('principal_id', 'is', null);

console.log('--- users with principal_id set ---');
console.log(JSON.stringify(agents, null, 2));

// Total user counts by role
const { data: allUsers } = await sb.from('users').select('role, is_active');
const byRole = {};
for (const u of allUsers ?? []) {
  const key = `${u.role}${u.is_active ? '' : ' (inactive)'}`;
  byRole[key] = (byRole[key] ?? 0) + 1;
}
console.log('--- user counts by role ---');
console.log(byRole);

// Existing invitations
const { data: invs } = await sb
  .from('invitations')
  .select('email, role, status, principal_id, created_at')
  .order('created_at', { ascending: false })
  .limit(20);
console.log('--- recent invitations ---');
console.log(JSON.stringify(invs, null, 2));

// Draft leases (for testing upload-pdf)
const { data: draftLeases } = await sb
  .from('leases')
  .select('id, lessor_name, lessee_name, status, lease_pdf_url')
  .in('status', ['draft', 'review']);
console.log('--- draft/review leases ---');
console.log(JSON.stringify(draftLeases, null, 2));
