/**
 * GET /api/invoices/[id]/pdf
 *
 * Generates a branded commission invoice PDF on the server and returns it
 * as a downloadable attachment. Uses pdf-lib via the shared invoice PDF
 * generator.
 *
 * Requires an authenticated broker or admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { getInvoiceWithDetail } from '@/lib/queries/invoices';
import { enrichInvoice } from '@/lib/invoice/enrich';
import { generateInvoicePdf } from '@/lib/pdf/invoice';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  // ------------------------------------------------------------------
  // Auth check
  // ------------------------------------------------------------------
  try {
    await requireBrokerOrAdminForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
  }

  // ------------------------------------------------------------------
  // Fetch invoice with full detail
  // ------------------------------------------------------------------
  const { data, error: fetchError } = await getInvoiceWithDetail(id);

  if (fetchError || !data) {
    return NextResponse.json(
      { error: fetchError || 'Invoice not found' },
      { status: 404 },
    );
  }

  // ------------------------------------------------------------------
  // Generate PDF (with full lease enrichment)
  // ------------------------------------------------------------------
  try {
    const pdfBytes = await generateInvoicePdf(enrichInvoice(data));

    const fileName = `Invoice-${data.invoice_number}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(pdfBytes.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (pdfError) {
    console.error(`[GET /api/invoices/${id}/pdf] PDF generation error:`, pdfError);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 },
    );
  }
}
