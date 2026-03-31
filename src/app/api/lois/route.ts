/**
 * POST /api/lois
 *
 * Creates a new LOI record with all its sections.
 * Requires an authenticated broker or admin user.
 *
 * Body:
 *   property_id         string  — required
 *   unit_id             string  — required
 *   tenant_contact_id   string  — required
 *   landlord_contact_id string  — required
 *   broker_contact_id   string  — required
 *   status              'draft' | 'sent'
 *   notes               string | null
 *   sections            array of section objects (see LoiSectionInsert)
 *
 * Returns: { id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import type { Database, LoiSectionKey, LoiSectionStatus } from '@/types/database';
import { notifyLoiSentToLandlord } from '@/lib/email/notifications';

type LoiInsert = Database['public']['Tables']['lois']['Insert'];
type LoiSectionInsert = Database['public']['Tables']['loi_sections']['Insert'];

interface LoiSectionPayload extends Omit<LoiSectionInsert, 'loi_id'> {
  section_key: LoiSectionKey;
  section_label: string;
  display_order: number;
  proposed_value: string;
  status: LoiSectionStatus;
}

interface CreateLoiBody {
  property_id: string;
  unit_id: string;
  tenant_contact_id: string;
  landlord_contact_id: string;
  broker_contact_id: string;
  status?: 'draft' | 'sent';
  notes?: string | null;
  sections: LoiSectionPayload[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Require broker or admin role
    let user;
    try {
      user = await requireBrokerOrAdminForApi();
    } catch (authError) {
      return NextResponse.json(
        { error: (authError as Error).message },
        { status: 401 },
      );
    }

    const supabase = await createClient();

    const body: CreateLoiBody = await request.json();

    // Basic required field validation
    const required: (keyof CreateLoiBody)[] = [
      'property_id',
      'unit_id',
      'tenant_contact_id',
      'landlord_contact_id',
      'broker_contact_id',
    ];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    const loiData: LoiInsert = {
      property_id: body.property_id,
      unit_id: body.unit_id,
      tenant_contact_id: body.tenant_contact_id,
      landlord_contact_id: body.landlord_contact_id,
      broker_contact_id: body.broker_contact_id,
      status: body.status ?? 'draft',
      version: 1,
      created_by: user.contactId!,
      notes: body.notes ?? null,
      sent_at: body.status === 'sent' ? new Date().toISOString() : null,
      application_id: null,
      parent_loi_id: null,
      expires_at: null,
      agreed_at: null,
    };

    // Insert the LOI row
    const { data: loi, error: loiError } = await supabase
      .from('lois')
      .insert(loiData)
      .select()
      .single();

    if (loiError) {
      console.error('[POST /api/lois] LOI insert error:', loiError);
      return NextResponse.json({ error: loiError.message }, { status: 500 });
    }

    // Insert all sections (if any)
    const sections = body.sections ?? [];
    if (sections.length > 0) {
      const sectionsWithLoiId = sections.map((s) => ({
        ...s,
        loi_id: loi.id,
      }));

      const { error: sectionsError } = await supabase
        .from('loi_sections')
        .insert(sectionsWithLoiId);

      if (sectionsError) {
        console.error('[POST /api/lois] Sections insert error:', sectionsError);
        // Roll back the LOI row so we don't have orphaned records
        await supabase.from('lois').delete().eq('id', loi.id);
        return NextResponse.json({ error: sectionsError.message }, { status: 500 });
      }
    }

    // Audit log
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'loi_created',
      entity_type: 'loi',
      entity_id: loi.id,
      new_value: { status: loiData.status },
    });

    // Notify the landlord when the LOI is sent (status='sent')
    if (loiData.status === 'sent') {
      // Fetch landlord, tenant, broker, and property contacts for the notification
      const [
        { data: landlord },
        { data: tenant },
        { data: broker },
        { data: property },
        { data: unit },
      ] = await Promise.all([
        supabase
          .from('contacts')
          .select('email, first_name, last_name, company_name')
          .eq('id', body.landlord_contact_id)
          .maybeSingle(),
        supabase
          .from('contacts')
          .select('company_name, first_name, last_name')
          .eq('id', body.tenant_contact_id)
          .maybeSingle(),
        supabase
          .from('contacts')
          .select('first_name, last_name, company_name')
          .eq('id', body.broker_contact_id)
          .maybeSingle(),
        supabase
          .from('properties')
          .select('address, city, state')
          .eq('id', body.property_id)
          .maybeSingle(),
        supabase
          .from('units')
          .select('suite_number')
          .eq('id', body.unit_id)
          .maybeSingle(),
      ]);

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
          : body.property_id;

        void notifyLoiSentToLandlord(
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
      }
    }

    return NextResponse.json({ id: loi.id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/lois] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
