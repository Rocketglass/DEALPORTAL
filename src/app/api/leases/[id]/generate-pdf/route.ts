/**
 * POST /api/leases/[id]/generate-pdf
 *
 * Generates a lease PDF using pdf-lib, uploads it to Supabase Storage,
 * updates the lease's lease_pdf_url, and returns the PDF as a download.
 *
 * Requires an authenticated broker or admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { getLease } from '@/lib/queries/leases';
import { generateLeasePdf } from '@/lib/pdf/generate-lease-pdf';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function POST(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireBrokerOrAdminForApi();

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing lease id' }, { status: 400 });
    }

    // Fetch the lease with all relations (includes escalations)
    const { data: lease, error: fetchError } = await getLease(id);

    if (fetchError || !lease) {
      return NextResponse.json({ error: fetchError || 'Lease not found' }, { status: 404 });
    }

    // Generate the PDF
    const escalations = lease.escalations ?? [];
    const pdfBytes = await generateLeasePdf(lease, escalations);

    // Upload to Supabase Storage
    const supabase = getServiceClient();
    const timestamp = Date.now();
    const storagePath = `${lease.id}/lease-${timestamp}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('lease-documents')
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error(`[POST /api/leases/${id}/generate-pdf] Upload error:`, uploadError);
      // Still return the PDF even if storage fails
    }

    // Update the lease record with the storage path
    if (!uploadError) {
      const { error: updateError } = await supabase
        .from('leases')
        .update({
          lease_pdf_url: storagePath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lease.id);

      if (updateError) {
        console.error(`[POST /api/leases/${id}/generate-pdf] Lease update error:`, updateError);
      }
    }

    // Audit log (non-fatal)
    try {
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'lease_pdf_generated',
        entity_type: 'lease',
        entity_id: lease.id,
        new_value: { storage_path: storagePath },
      });
    } catch {
      // Audit log failure is non-fatal
    }

    // Return the PDF as a download
    const fileName = `Lease-${lease.lessee_name.replace(/[^a-zA-Z0-9]/g, '_')}-${lease.premises_address.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    });
  } catch (error) {
    console.error('[POST /api/leases/[id]/generate-pdf] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
