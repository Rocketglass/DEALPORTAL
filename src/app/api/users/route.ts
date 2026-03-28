/**
 * GET /api/users
 *
 * List all users with their contact info and principal (for agents).
 * Requires broker or admin role.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();

    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id, email, role, is_active, last_login, created_at, principal_id,
        contact:contacts!users_contact_id_fkey(first_name, last_name, company_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // For agents, fetch their principal's info
    const agentUsers = (users ?? []).filter((u) => u.principal_id);
    const principalIds = [...new Set(agentUsers.map((u) => u.principal_id))];

    let principalMap = new Map<string, { email: string; contact: { first_name: string | null; last_name: string | null } | null }>();

    if (principalIds.length > 0) {
      const { data: principals } = await supabase
        .from('users')
        .select('id, email, contact:contacts!users_contact_id_fkey(first_name, last_name)')
        .in('id', principalIds);

      for (const p of (principals ?? [])) {
        principalMap.set(p.id, {
          email: p.email,
          contact: p.contact as unknown as { first_name: string | null; last_name: string | null } | null,
        });
      }
    }

    const enriched = (users ?? []).map((u) => ({
      ...u,
      contact: u.contact as unknown as { first_name: string | null; last_name: string | null; company_name: string | null } | null,
      principal: u.principal_id ? principalMap.get(u.principal_id) ?? null : null,
    }));

    return NextResponse.json({ users: enriched });
  } catch (err) {
    console.error('[GET /api/users] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
