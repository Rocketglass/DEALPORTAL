import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { logAuditEvent, getClientIp } from '@/lib/security/audit';
import { sanitizeUuid } from '@/lib/security/sanitize';

function generateShortCode(length = 8): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  // Require broker or admin authentication
  let authUser;
  try {
    authUser = await requireBrokerOrAdminForApi();
  } catch {
    console.error(
      `[QR Generate] Unauthorized access attempt from IP ${getClientIp(request.headers)}`,
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  const body = await request.json();
  const { property_id, unit_id } = body;

  // Validate and sanitize input
  const sanitizedPropertyId = sanitizeUuid(property_id);
  if (!sanitizedPropertyId) {
    return NextResponse.json(
      { error: 'property_id is required and must be a valid UUID' },
      { status: 400 },
    );
  }

  const sanitizedUnitId = unit_id ? sanitizeUuid(unit_id) : null;

  const shortCode = generateShortCode();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  // QR codes land on the public browse detail page, not the authenticated portal
  const portalUrl = sanitizedUnitId
    ? `${appUrl}/browse/${sanitizedPropertyId}?unit=${sanitizedUnitId}`
    : `${appUrl}/browse/${sanitizedPropertyId}`;
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
      property_id: sanitizedPropertyId,
      unit_id: sanitizedUnitId,
      short_code: shortCode,
      portal_url: portalUrl,
      qr_image_url: qrDataUrl,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log: QR code created
  await logAuditEvent({
    userId: authUser.id,
    action: 'create',
    entityType: 'qr_code',
    entityId: qrCode.id,
    newValue: {
      property_id: sanitizedPropertyId,
      unit_id: sanitizedUnitId,
      short_code: shortCode,
    },
    ipAddress: getClientIp(request.headers),
    userAgent: request.headers.get('user-agent') || undefined,
  });

  return NextResponse.json(qrCode);
}
