/**
 * PATCH /api/invoices/bulk-status
 *
 * Bulk update invoice statuses.
 * Body: { ids: string[], status: 'sent' | 'cancelled' }
 *
 * Requires authenticated broker or admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import type { InvoiceStatus } from '@/types/database';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

const ALLOWED_STATUSES: InvoiceStatus[] = ['sent', 'cancelled'];

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  // Auth check
  let currentUser;
  try {
    currentUser = await requireBrokerOrAdminForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ids, status } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: 'ids must be a non-empty array' },
      { status: 400 },
    );
  }

  if (!status || !ALLOWED_STATUSES.includes(status as InvoiceStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  try {
    const supabase = getServiceClient();

    let updated = 0;
    let errors = 0;

    for (const id of ids) {
      const updatePayload: Record<string, unknown> = {
        status: status as InvoiceStatus,
        updated_at: now,
      };

      if (status === 'sent') {
        updatePayload.sent_date = now;
      }

      const { error: updateError } = await supabase
        .from('commission_invoices')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) {
        console.error(
          `[PATCH /api/invoices/bulk-status] Failed to update ${id}:`,
          updateError.message,
        );
        errors++;
      } else {
        updated++;
      }
    }

    console.log(
      `[PATCH /api/invoices/bulk-status] ${updated} updated, ${errors} errors → ${status}` +
        ` by ${currentUser.email}`,
    );

    return NextResponse.json({ updated, errors });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to bulk update invoice statuses';
    console.error('[PATCH /api/invoices/bulk-status] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
