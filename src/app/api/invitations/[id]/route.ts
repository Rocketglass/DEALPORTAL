import { NextResponse } from 'next/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/invitations/:id — Get a single invitation
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireBrokerOrAdminForApi();
    const { id } = await params;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 });
    }

    const supabase = createClient(url, key);
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    return NextResponse.json({ invitation });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/**
 * DELETE /api/invitations/:id — Revoke an invitation
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireBrokerOrAdminForApi();
    const { id } = await params;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 500 });
    }

    const supabase = createClient(url, key);
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Invitation revoked' });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
