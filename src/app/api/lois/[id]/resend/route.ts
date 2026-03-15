/**
 * POST /api/lois/[id]/resend
 *
 * Resends the LOI notification email to the landlord.
 * Requires broker/admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyLoiSentToLandlord } from '@/lib/email/notifications';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: loiId } = await params;
    const supabase = await createClient();

    // Verify authenticated user (broker/admin)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the LOI with all related contacts and property data
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

    if (!landlord?.email) {
      return NextResponse.json(
        { error: 'Landlord has no email address on file' },
        { status: 400 },
      );
    }

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

    await notifyLoiSentToLandlord(
      {
        id: loi.id,
        tenantBusinessName,
        propertyAddress,
        suiteNumber: unit?.suite_number ?? '',
        brokerName,
        landlordName,
      },
      landlord.email,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/lois/[id]/resend] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
