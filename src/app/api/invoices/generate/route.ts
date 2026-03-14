/**
 * POST /api/invoices/generate
 *
 * Manually trigger commission invoice generation for a given lease.
 * Useful when the DocuSign webhook fails or is unavailable.
 *
 * Requires authenticated broker or admin.
 *
 * Body: { leaseId: string }
 *
 * Returns: { invoice: CommissionInvoice }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { generateCommissionInvoice } from '@/lib/commission/generate-invoice';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ------------------------------------------------------------------
  // Auth check — broker or admin only
  // ------------------------------------------------------------------
  let currentUser;
  try {
    currentUser = await requireBrokerOrAdminForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  // ------------------------------------------------------------------
  // Parse and validate body
  // ------------------------------------------------------------------
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { leaseId } = body as Record<string, unknown>;

  if (!leaseId || typeof leaseId !== 'string') {
    return NextResponse.json(
      { error: 'leaseId is required and must be a string' },
      { status: 400 },
    );
  }

  // ------------------------------------------------------------------
  // Generate invoice
  // ------------------------------------------------------------------
  try {
    const invoice = await generateCommissionInvoice(leaseId);

    console.log(
      `[POST /api/invoices/generate] Invoice ${invoice.invoice_number} created` +
        ` for lease ${leaseId} by user ${currentUser.email}`,
    );

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate invoice';
    console.error('[POST /api/invoices/generate] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
