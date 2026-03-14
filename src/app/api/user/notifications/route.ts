/**
 * GET  /api/user/notifications — Returns recent notifications for the authenticated user.
 * PATCH /api/user/notifications — Marks all notifications as read.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthForApi } from '@/lib/security/auth-guard';

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireAuthForApi();
    const supabase = await createClient();

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, type, title, message, link_url, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[GET /api/user/notifications] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notifications: notifications ?? [] }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/user/notifications] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(): Promise<NextResponse> {
  try {
    const user = await requireAuthForApi();
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('[PATCH /api/user/notifications] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/user/notifications] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
