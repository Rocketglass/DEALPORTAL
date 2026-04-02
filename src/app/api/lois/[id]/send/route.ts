/**
 * POST /api/lois/[id]/send
 *
 * Updates LOI status from 'draft' to 'sent' and emails the landlord.
 * Email failure is non-fatal — the status still updates.
 * Requires broker/admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyLoiSentToLandlord } from '@/lib/email/notifications';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { generateLoiReviewToken } from '@/lib/security/loi-token';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    try {
      await requireBrokerOrAdminForApi();
    } catch (authError) {
      return NextResponse.json(
        { error: (authError as Error).message },
        { status: 401 },
      );
    }

    const { id: loiId } = await params;
    const supabase = getServiceClient();

    // Fetch the LOI
    const { data: loi, error: loiError } = await supabase
      .from('lois')
      .select(`
        id, status,
        property:properties(address, city, state),
        unit:units(suite_number),
        tenant:contacts!lois_tenant_contact_id_fkey(first_name, last_name, company_name),
        landlord:contacts!lois_landlord_contact_id_fkey(email, first_name, last_name, company_name),
        broker:contacts!lois_broker_contact_id_fkey(first_name, last_name, company_name)
      `)
      .eq('id', loiId)
      .single();

    if (loiError || !loi) {
      return NextResponse.json({ error: 'LOI not found' }, { status: 404 });
    }

    if (loi.status !== 'draft') {
      return NextResponse.json(
        { error: `LOI is already in '${loi.status}' status` },
        { status: 400 },
      );
    }

    // Update status to 'sent'
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('lois')
      .update({ status: 'sent', sent_at: now, updated_at: now })
      .eq('id', loiId);

    if (updateError) {
      console.error('[POST /api/lois/[id]/send] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Attempt email notification (non-fatal)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const landlord = loi.landlord as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tenant = loi.tenant as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const broker = loi.broker as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const property = loi.property as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unit = loi.unit as any;

      if (landlord?.email) {
        const landlordName =
          (landlord.company_name
          ?? [landlord.first_name, landlord.last_name].filter(Boolean).join(' '))
          || 'Landlord';

        const tenantBusinessName =
          (tenant?.company_name
          ?? [tenant?.first_name, tenant?.last_name].filter(Boolean).join(' '))
          || 'Tenant';

        const brokerName =
          (broker?.company_name
          ?? [broker?.first_name, broker?.last_name].filter(Boolean).join(' '))
          || 'Broker';

        const propertyAddress = property
          ? `${property.address}, ${property.city}, ${property.state}`
          : 'Unknown property';

        const reviewToken = generateLoiReviewToken(loi.id);

        await notifyLoiSentToLandlord(
          {
            id: loi.id,
            tenantBusinessName,
            propertyAddress,
            suiteNumber: unit?.suite_number ?? '',
            brokerName,
            landlordName,
            reviewToken,
          },
          landlord.email,
        );
      }
    } catch (emailErr) {
      console.error('[POST /api/lois/[id]/send] Email failed (non-fatal):', emailErr);
    }

    return NextResponse.json({ success: true, status: 'sent' });
  } catch (error) {
    console.error('[POST /api/lois/[id]/send] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to send LOI' }, { status: 500 });
  }
}
