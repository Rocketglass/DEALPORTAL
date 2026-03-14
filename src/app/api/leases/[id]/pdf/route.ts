/**
 * GET /api/leases/[id]/pdf
 *
 * Generates a signed download URL for the lease PDF from Supabase Storage
 * and redirects the client to it.
 *
 * Requires an authenticated broker or admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { getLease } from '@/lib/queries/leases';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing lease id' }, { status: 400 });
    }

    const { data: lease, error: fetchError } = await getLease(id);

    if (fetchError || !lease) {
      return NextResponse.json({ error: fetchError || 'Lease not found' }, { status: 404 });
    }

    // Try lease_pdf_url first, then fall back to executed_pdf_url
    const storagePath = lease.lease_pdf_url || lease.executed_pdf_url;

    if (!storagePath) {
      return NextResponse.json({ error: 'No PDF available for this lease' }, { status: 404 });
    }

    // If it's already a full URL (public URL), redirect directly
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      return NextResponse.redirect(storagePath);
    }

    // Otherwise, it's a Supabase Storage path — generate a signed URL
    const supabase = getServiceClient();
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from('lease-documents')
      .createSignedUrl(storagePath, 60 * 5); // 5 minute expiry

    if (signError || !signedUrlData?.signedUrl) {
      console.error(`[GET /api/leases/${id}/pdf] Signed URL error:`, signError);
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    return NextResponse.redirect(signedUrlData.signedUrl);
  } catch (error) {
    console.error('[GET /api/leases/[id]/pdf] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
