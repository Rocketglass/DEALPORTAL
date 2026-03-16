/**
 * GET /api/admin/email-logs
 *
 * Returns the most recent email log entries (last 50).
 * Restricted to broker / admin users.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

export async function GET(): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();

    const supabase = await createClient();

    const { data: logs, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[admin/email-logs] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 });
    }

    return NextResponse.json({ logs: logs ?? [] });
  } catch (err: unknown) {
    // requireBrokerOrAdminForApi throws on auth failure
    const message = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
