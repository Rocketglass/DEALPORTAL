/**
 * POST /api/leases/parse
 *
 * Upload a lease PDF and get back the structured fields needed to pre-fill
 * a commission invoice. Backed by Gemini 2.0 Flash multimodal extraction.
 *
 * Response is best-effort — any field can be null when the lease doesn't
 * surface it. The broker is expected to review + correct before saving.
 *
 * Broker / admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { geminiJsonFromFile, isGeminiConfigured } from '@/lib/ai/gemini';

const MAX_BYTES = 25 * 1024 * 1024;
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

export interface ParsedLeaseFields {
  lessor_name: string | null;
  lessor_email: string | null;
  lessor_address: string | null;
  lessee_name: string | null;
  lessee_email: string | null;
  property_address: string | null;
  suite_number: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  suite_sf: number | null;
  lease_term_months: number | null;
  monthly_rent: number | null;
  total_consideration: number | null;
  annual_escalation_percent: number | null;
  free_rent_months: number | null;
  commission_rate_percent: number | null;
  commencement_date: string | null; // YYYY-MM-DD
}

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    lessor_name: { type: 'string', nullable: true },
    lessor_email: { type: 'string', nullable: true },
    lessor_address: { type: 'string', nullable: true },
    lessee_name: { type: 'string', nullable: true },
    lessee_email: { type: 'string', nullable: true },
    property_address: { type: 'string', nullable: true },
    suite_number: { type: 'string', nullable: true },
    city: { type: 'string', nullable: true },
    state: { type: 'string', nullable: true },
    zip: { type: 'string', nullable: true },
    suite_sf: { type: 'integer', nullable: true },
    lease_term_months: { type: 'integer', nullable: true },
    monthly_rent: { type: 'number', nullable: true },
    total_consideration: { type: 'number', nullable: true },
    annual_escalation_percent: { type: 'number', nullable: true },
    free_rent_months: { type: 'integer', nullable: true },
    commission_rate_percent: { type: 'number', nullable: true },
    commencement_date: { type: 'string', nullable: true },
  },
  required: [
    'lessor_name',
    'lessor_email',
    'lessor_address',
    'lessee_name',
    'lessee_email',
    'property_address',
    'suite_number',
    'city',
    'state',
    'zip',
    'suite_sf',
    'lease_term_months',
    'monthly_rent',
    'total_consideration',
    'annual_escalation_percent',
    'free_rent_months',
    'commission_rate_percent',
    'commencement_date',
  ],
};

const EXTRACTION_PROMPT = `You are extracting structured data from a commercial real estate lease PDF.
Return ONE JSON object matching the provided schema. For any field you cannot
find or are not confident about, return null — never guess.

Field guidance:
- lessor_name / lessor_email / lessor_address: the landlord party (the one
  RECEIVING rent). The lessor entity name (e.g. "ABC Holdings LLC"), not a
  signatory's personal name unless the lessor is an individual.
- lessee_name / lessee_email: the tenant party (the one PAYING rent).
- property_address: street address of the leased premises (e.g.
  "2810 Via Orange Way"). Just street + number, no city/state/zip.
- suite_number: the suite/unit identifier (e.g. "A", "100", "Suite 200").
  Just the identifier without the word "Suite".
- city / state / zip: from the premises address.
- suite_sf: the leased square footage as an integer (e.g. 2500).
- lease_term_months: total lease term in months. If the lease shows "5 years"
  use 60. Compute from commencement → expiration if needed.
- monthly_rent: the INITIAL monthly base rent (first escalation period).
  Numeric dollar amount, no currency symbol.
- total_consideration: total rent over the full term, summing all escalation
  steps (e.g. months 1–12 at $5k + months 13–24 at $5,250 = $123,000).
  If the lease quotes a "total rent" or "total consideration" use that.
- annual_escalation_percent: the annual rent bump as a percent (e.g. 3.0
  for "3% annual increase"). If escalations are fixed dollar amounts and
  not a percent, leave null.
- free_rent_months: number of months of abated/free rent at term start.
- commission_rate_percent: brokerage commission rate from the broker
  compensation clause (e.g. 6.0). If the lease doesn't state one, null.
- commencement_date: the rent commencement date as YYYY-MM-DD.

If the document is not a lease, return all nulls.`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: 'Lease parser is not configured (GEMINI_API_KEY missing)' },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'File is empty' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 25 MB limit' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    return NextResponse.json(
      { error: 'File does not appear to be a valid PDF' },
      { status: 400 },
    );
  }

  const parsed = await geminiJsonFromFile<ParsedLeaseFields>(
    EXTRACTION_PROMPT,
    buffer,
    'application/pdf',
    {
      responseSchema: EXTRACTION_SCHEMA,
      maxOutputTokens: 2048,
      timeoutMs: 60_000,
    },
  );

  if (!parsed) {
    return NextResponse.json(
      {
        error:
          'Could not parse the lease — try a different PDF or fill the invoice manually',
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ fields: parsed });
}
