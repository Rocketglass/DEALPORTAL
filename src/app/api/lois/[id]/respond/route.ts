/**
 * POST /api/lois/[id]/respond
 *
 * Public endpoint — no authentication required. Used by landlords who
 * click the review link sent to them by email.
 *
 * Accepts the landlord's section-by-section responses and:
 *   1. Updates each loi_section with the landlord's response/action.
 *   2. Inserts a loi_negotiations row recording the action.
 *   3. Updates the LOI status to 'in_negotiation' (or 'agreed' if all accepted).
 *
 * Body:
 * {
 *   responses: Array<{
 *     sectionId: string;
 *     action: 'accept' | 'counter' | 'reject';
 *     value?: string;   // counter-proposal text (required when action='counter')
 *     note?: string;    // rejection reason (optional when action='reject')
 *   }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { LoiSectionStatus } from '@/types/database';
import { notifyLoiCountered, notifyLoiAgreed } from '@/lib/email/notifications';
import { sanitizeHtml, sanitizeUuid } from '@/lib/security/sanitize';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

const ACTION_TO_STATUS: Record<string, LoiSectionStatus> = {
  accept: 'accepted',
  counter: 'countered',
  reject: 'rejected',
};

interface SectionResponse {
  sectionId: string;
  action: 'accept' | 'counter' | 'reject';
  value?: string;
  note?: string;
  updatedAt?: string; // ISO timestamp - for optimistic locking
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: loiId } = await params;

    let body: { responses: SectionResponse[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { responses } = body;
    if (!Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json({ error: 'responses array is required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Verify the LOI exists and is in a reviewable state
    const { data: loi, error: loiError } = await supabase
      .from('lois')
      .select('id, status, expires_at')
      .eq('id', loiId)
      .single();

    if (loiError || !loi) {
      return NextResponse.json({ error: 'LOI not found' }, { status: 404 });
    }

    if (!['sent', 'in_negotiation'].includes(loi.status)) {
      return NextResponse.json(
        { error: `LOI is not currently open for responses (status: ${loi.status})` },
        { status: 400 },
      );
    }

    // Enforce LOI expiration
    if (loi.expires_at && new Date(loi.expires_at) < new Date()) {
      // Mark as expired in the database
      await supabase
        .from('lois')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', loiId);

      return NextResponse.json(
        { error: 'This LOI has expired and can no longer accept responses' },
        { status: 410 },
      );
    }

    const now = new Date().toISOString();

    // Process each section response
    for (const resp of responses) {
      const { sectionId, action } = resp;
      // Sanitize user-provided text to prevent stored XSS
      const value = resp.value ? sanitizeHtml(resp.value) : resp.value;
      const note = resp.note ? sanitizeHtml(resp.note) : resp.note;

      if (!sectionId || !sanitizeUuid(sectionId) || !action || !ACTION_TO_STATUS[action]) {
        return NextResponse.json(
          { error: 'Invalid section response: sectionId must be a valid UUID and action must be accept, counter, or reject' },
          { status: 400 },
        );
      }

      // Validate that counter/reject responses include text
      if (action === 'counter' && (!value || !value.trim())) {
        return NextResponse.json(
          { error: `Counter-proposal text is required for section ${sectionId}` },
          { status: 400 },
        );
      }

      if (action === 'reject' && (!note || !note.trim())) {
        return NextResponse.json(
          { error: `Rejection reason is required for section ${sectionId}` },
          { status: 400 },
        );
      }

      const newStatus = ACTION_TO_STATUS[action];

      // When accepting, copy the proposed_value to agreed_value
      let agreedValue: string | null = null;
      if (action === 'accept') {
        const { data: sectionData } = await supabase
          .from('loi_sections')
          .select('proposed_value')
          .eq('id', sectionId)
          .single();
        agreedValue = sectionData?.proposed_value ?? null;
      }

      // Update the section status and landlord response
      let query = supabase
        .from('loi_sections')
        .update({
          status: newStatus,
          landlord_response: action === 'counter' ? (value ?? null) : (note ?? null),
          agreed_value: agreedValue,
          updated_at: now,
        })
        .eq('id', sectionId)
        .eq('loi_id', loiId);

      // Optimistic locking: only update if section hasn't changed since client loaded it
      if (resp.updatedAt) {
        query = query.eq('updated_at', resp.updatedAt);
      }

      const { data: updatedRows, error: sectionError } = await query.select('id');

      if (sectionError) {
        console.error(`[LOI respond] Error updating section ${sectionId}:`, sectionError);
        return NextResponse.json(
          { error: `Failed to update section: ${sectionError.message}` },
          { status: 500 },
        );
      }

      // If optimistic locking was used and no rows matched, the section was modified concurrently
      if (resp.updatedAt && (!updatedRows || updatedRows.length === 0)) {
        return NextResponse.json(
          { error: `Section "${sectionId}" was modified by another user. Please refresh and try again.` },
          { status: 409 },
        );
      }

      // Insert negotiation history entry
      const { error: negError } = await supabase.from('loi_negotiations').insert({
        loi_section_id: sectionId,
        action: action === 'accept' ? 'accept' : action === 'counter' ? 'counter' : 'reject',
        value: action === 'counter' ? (value ?? null) : null,
        note: note ?? null,
        created_by: 'landlord',
        created_at: now,
      });

      if (negError) {
        console.error(`[LOI respond] Error inserting negotiation for section ${sectionId}:`, negError);
        // Non-fatal — history is secondary to the status update
      }
    }

    // Re-check all sections to see if the LOI has reached full agreement
    const { data: allSections } = await supabase
      .from('loi_sections')
      .select('status')
      .eq('loi_id', loiId);

    const allAgreed =
      allSections != null &&
      allSections.length > 0 &&
      allSections.every((s) => s.status === 'accepted');

    const hasRejected = allSections?.some((s) => s.status === 'rejected');

    const newLoiStatus = allAgreed
      ? 'agreed'
      : hasRejected
        ? 'in_negotiation'
        : 'in_negotiation';

    await supabase
      .from('lois')
      .update({ status: newLoiStatus, updated_at: now })
      .eq('id', loiId);

    // Notify parties about the landlord's response (fire-and-forget)
    void (async () => {
      try {
        const { data: loiFull } = await supabase
          .from('lois')
          .select(`
            id,
            property:properties(address, city, state),
            unit:units(suite_number),
            tenant:contacts!lois_tenant_contact_id_fkey(email, first_name, last_name, company_name),
            landlord:contacts!lois_landlord_contact_id_fkey(email, first_name, last_name, company_name),
            broker:contacts!lois_broker_contact_id_fkey(email, first_name, last_name, company_name)
          `)
          .eq('id', loiId)
          .single();

        if (!loiFull) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const broker = loiFull.broker as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const landlord = loiFull.landlord as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenant = loiFull.tenant as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const property = loiFull.property as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unit = loiFull.unit as any;

        if (!broker?.email) return;

        const brokerName =
          (broker.company_name
          ?? [broker.first_name, broker.last_name].filter(Boolean).join(' '))
          || 'Broker';

        const landlordName =
          (landlord?.company_name
          ?? [landlord?.first_name, landlord?.last_name].filter(Boolean).join(' '))
          || 'Landlord';

        const tenantBusinessName =
          (tenant?.company_name
          ?? [tenant?.first_name, tenant?.last_name].filter(Boolean).join(' '))
          || 'Tenant';

        const propertyAddress = property
          ? `${property.address}, ${property.city}, ${property.state}`
          : 'Unknown property';

        const loiNotification = {
          id: loiFull.id,
          tenantBusinessName,
          propertyAddress,
          suiteNumber: unit?.suite_number ?? '',
          brokerName,
          landlordName,
        };

        if (newLoiStatus === 'agreed') {
          // LOI fully agreed — notify all parties
          const parties = [
            broker?.email && { email: broker.email, name: brokerName },
            landlord?.email && { email: landlord.email, name: landlordName },
            tenant?.email && { email: tenant.email, name: tenantBusinessName },
          ].filter(Boolean) as { email: string; name: string }[];

          await notifyLoiAgreed(loiNotification, parties);
        } else {
          // LOI countered/in-negotiation — notify broker
          const sectionsCountered = responses
            .filter((r) => r.action === 'counter' || r.action === 'reject')
            .map((r) => r.sectionId);

          await notifyLoiCountered(
            { ...loiNotification, sectionsCountered },
            broker.email,
          );
        }
      } catch (notifyError) {
        console.error('[LOI respond] Failed to notify:', notifyError);
      }
    })();

    return NextResponse.json({ success: true, loiStatus: newLoiStatus });
  } catch (error) {
    console.error('[LOI respond] Unexpected error:', error);
    console.error('[LOI respond] Error details:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
