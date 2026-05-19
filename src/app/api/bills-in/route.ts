/**
 * Bills In — inbound vendor invoices that Rocket receives.
 *
 *   GET  /api/bills-in           — list all bills, newest first
 *   POST /api/bills-in           — create a new bill (multipart: file + vendor_name + amount)
 *
 * Broker / admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

const MAX_BYTES = 25 * 1024 * 1024;
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('bills_in')
      .select('id, vendor_name, amount, pdf_url, payment_url, paid, paid_at, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/bills-in] query error:', error);
      return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
    }
    return NextResponse.json({ bills: data ?? [] });
  } catch (error) {
    console.error('[GET /api/bills-in] unexpected:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let user;
  try {
    user = await requireBrokerOrAdminForApi();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const vendorName = formData.get('vendor_name');
  const amountRaw = formData.get('amount');
  const paymentUrlRaw = formData.get('payment_url');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (typeof vendorName !== 'string' || !vendorName.trim()) {
    return NextResponse.json({ error: 'vendor_name is required' }, { status: 400 });
  }
  const amount = typeof amountRaw === 'string' ? parseFloat(amountRaw) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
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
    return NextResponse.json({ error: 'File does not appear to be a valid PDF' }, { status: 400 });
  }

  // Optional payment URL — must be http(s) if provided.
  let paymentUrl: string | null = null;
  if (typeof paymentUrlRaw === 'string' && paymentUrlRaw.trim()) {
    const trimmed = paymentUrlRaw.trim();
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return NextResponse.json(
          { error: 'payment_url must be an http(s) URL' },
          { status: 400 },
        );
      }
      paymentUrl = trimmed;
    } catch {
      return NextResponse.json(
        { error: 'payment_url must be a valid URL' },
        { status: 400 },
      );
    }
  }

  try {
    const supabase = getServiceClient();
    const storagePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

    const { error: uploadErr } = await supabase.storage
      .from('bills-in')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });
    if (uploadErr) {
      console.error('[POST /api/bills-in] upload error:', uploadErr);
      return NextResponse.json({ error: 'Failed to store file' }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bill, error: insertErr } = await (supabase as any)
      .from('bills_in')
      .insert({
        vendor_name: vendorName.trim(),
        amount,
        pdf_url: storagePath,
        payment_url: paymentUrl,
        uploaded_by: user.id,
      })
      .select('id, vendor_name, amount, pdf_url, payment_url, paid, paid_at, created_at')
      .single();

    if (insertErr || !bill) {
      console.error('[POST /api/bills-in] insert error:', insertErr);
      // Best-effort cleanup: orphaned storage object isn't great but not a leak.
      await supabase.storage.from('bills-in').remove([storagePath]).catch(() => {});
      return NextResponse.json({ error: 'Failed to create bill record' }, { status: 500 });
    }

    return NextResponse.json({ bill }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/bills-in] unexpected:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
