import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';

function generateShortCode(length = 8): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify admin/broker role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { property_id, unit_id } = body;

  if (!property_id) {
    return NextResponse.json({ error: 'property_id is required' }, { status: 400 });
  }

  const shortCode = generateShortCode();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const portalUrl = unit_id
    ? `${appUrl}/properties/${property_id}?unit=${unit_id}`
    : `${appUrl}/properties/${property_id}`;
  const qrTargetUrl = `${appUrl}/p/${shortCode}`;

  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(qrTargetUrl, {
    width: 512,
    margin: 2,
    color: { dark: '#1e40af', light: '#ffffff' },
  });

  // Save QR code record
  const { data: qrCode, error } = await supabase
    .from('qr_codes')
    .insert({
      property_id,
      unit_id: unit_id || null,
      short_code: shortCode,
      portal_url: portalUrl,
      qr_image_url: qrDataUrl,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(qrCode);
}
