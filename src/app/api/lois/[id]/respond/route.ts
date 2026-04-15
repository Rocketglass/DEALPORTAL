/**
 * POST /api/lois/[id]/respond
 *
 * Authenticated endpoint — requires an active session.
 * Accessible to broker, admin, landlord, landlord_agent, tenant, tenant_agent.
 * Non-parties receive 403.
 *
 * Accepts section-by-section responses and:
 *   1. Updates each loi_section with the response/action and last_updated_by = caller's role.
 *   2. Inserts a loi_negotiations row recording the action with created_by = caller's role.
 *   3. Updates the LOI status to 'in_negotiation' (or 'agreed' if all accepted).
 *   4. Sends email notifications to the OTHER TWO parties (not the actor).
 *   5. Inserts in-app notification rows for each non-actor party.
 *
 * Body:
 * {
 *   responses: Array<{
 *     sectionId: string;
 *     action: 'accept' | 'counter' | 'reject';
 *     value?: string;   // counter-proposal text (required when action='counter')
 *     note?: string;    // rejection reason (optional when action='reject')
 *     updatedAt?: string; // ISO timestamp for optimistic locking
 *   }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthForApi } from '@/lib/security/auth-guard';
import { createClient as createServiceClient } from '@/lib/supabase/service';
import type { LoiSectionStatus } from '@/types/database';
import { notifyLoiSectionUpdate, notifyLoiAgreed } from '@/lib/email/notifications';
import { sanitizeHtml, sanitizeUuid } from '@/lib/security/sanitize';
import { verifyLoiReviewToken } from '@/lib/security/loi-token';

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
  updatedAt: string; // ISO timestamp - required for optimistic locking
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: loiId } = await params;

    // 1. Try to authenticate — allow unauthenticated for public landlord review
    let user: { role: string; contactId: string | null; principalId: string | null } | null = null;
    try {
      user = await requireAuthForApi();
    } catch {
      // Unauthenticated — allowed for public LOI review
    }

    let body: { responses: SectionResponse[]; token?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { responses } = body;
    if (!Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json({ error: 'responses array is required' }, { status: 400 });
    }

    // Service client for all DB operations — auth enforced above
    const supabase = await createServiceClient();

    // 2. Fetch the LOI to verify existence, state, and party membership
    const { data: loi, error: loiError } = await supabase
      .from('lois')
      .select('id, status, expires_at, landlord_contact_id, tenant_contact_id, broker_contact_id')
      .eq('id', loiId)
      .single();

    if (loiError || !loi) {
      return NextResponse.json({ error: 'LOI not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loiRow = loi as any;

    // 3. Authorization: authenticated users must be a party; public access requires valid token
    let role = 'landlord'; // Default to landlord for public review
    let isBrokerOrAdmin = false;
    let isLandlord = true;
    let isTenant = false;

    if (!user) {
      // Public access — require a valid HMAC-signed token
      if (!body.token || !verifyLoiReviewToken(loiId, body.token)) {
        return NextResponse.json(
          { error: 'Invalid or expired review link. Please request a new link from your broker.' },
          { status: 401 },
        );
      }
    }

    if (user) {
      role = user.role;
      const effectiveContactId = user.contactId ?? user.principalId;
      isBrokerOrAdmin = role === 'broker' || role === 'admin';
      isLandlord = role === 'landlord' || role === 'landlord_agent';
      isTenant = role === 'tenant' || role === 'tenant_agent';

      if (!isBrokerOrAdmin) {
        if (isLandlord) {
          if (!effectiveContactId || effectiveContactId !== loiRow.landlord_contact_id) {
            return NextResponse.json({ error: 'Forbidden: not a party to this LOI' }, { status: 403 });
          }
        } else if (isTenant) {
          if (!effectiveContactId || effectiveContactId !== loiRow.tenant_contact_id) {
            return NextResponse.json({ error: 'Forbidden: not a party to this LOI' }, { status: 403 });
          }
        } else {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    // 4. Verify the LOI is in a respondable state
    if (!['sent', 'in_negotiation'].includes(loiRow.status)) {
      return NextResponse.json(
        { error: `LOI is not currently open for responses (status: ${loiRow.status})` },
        { status: 400 },
      );
    }

    // 5. Enforce LOI expiration
    if (loiRow.expires_at && new Date(loiRow.expires_at) < new Date()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('lois')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', loiId);

      return NextResponse.json(
        { error: 'This LOI has expired and can no longer accept responses' },
        { status: 410 },
      );
    }

    const now = new Date().toISOString();

    // 6. Process each section response
    for (const resp of responses) {
      const { sectionId, action, updatedAt } = resp;
      // Sanitize user-provided text to prevent stored XSS
      const value = resp.value ? sanitizeHtml(resp.value) : resp.value;
      const note = resp.note ? sanitizeHtml(resp.note) : resp.note;

      if (!sectionId || !sanitizeUuid(sectionId) || !action || !ACTION_TO_STATUS[action]) {
        return NextResponse.json(
          { error: 'Invalid section response: sectionId must be a valid UUID and action must be accept, counter, or reject' },
          { status: 400 },
        );
      }

      // updatedAt is required for concurrency control
      if (!updatedAt) {
        return NextResponse.json(
          { error: 'updatedAt is required for concurrency control' },
          { status: 400 },
        );
      }

      // Validate that the section belongs to this LOI (prevents cross-LOI history contamination)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sectionCheck } = await (supabase as any)
        .from('loi_sections')
        .select('id, loi_id')
        .eq('id', sectionId)
        .single();

      if (!sectionCheck || sectionCheck.loi_id !== loiId) {
        return NextResponse.json(
          { error: 'Section does not belong to this LOI' },
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

      // Rejection reason is optional — landlord may not want to explain

      const newStatus = ACTION_TO_STATUS[action];

      // When accepting, copy the proposed_value to agreed_value
      let agreedValue: string | null = null;
      if (action === 'accept') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sectionData } = await (supabase as any)
          .from('loi_sections')
          .select('proposed_value')
          .eq('id', sectionId)
          .single();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        agreedValue = (sectionData as any)?.proposed_value ?? null;
      }

      // Update the section status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated, error: sectionError } = await (supabase as any)
        .from('loi_sections')
        .update({
          status: newStatus,
          landlord_response: action === 'counter' ? (value ?? null) : (note ?? null),
          agreed_value: agreedValue,
          last_updated_by: user?.contactId
            ?? (isLandlord ? loiRow.landlord_contact_id : isTenant ? loiRow.tenant_contact_id : loiRow.broker_contact_id),
          updated_at: now,
        })
        .eq('id', sectionId)
        .eq('loi_id', loiId)
        .select()
        .single();

      if (sectionError || !updated) {
        console.error(`[LOI respond] Failed to update section ${sectionId}:`, sectionError);
        return NextResponse.json(
          { error: 'Failed to update section. Please try again.' },
          { status: 500 },
        );
      }

      // Insert negotiation history entry
      // created_by references contacts(id) — resolve to the appropriate contact
      const negotiationCreatedBy = user?.contactId
        ?? (isLandlord ? loiRow.landlord_contact_id : isTenant ? loiRow.tenant_contact_id : loiRow.broker_contact_id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: negError } = await (supabase as any).from('loi_negotiations').insert({
        loi_section_id: sectionId,
        action: action === 'accept' ? 'accept' : action === 'counter' ? 'counter' : 'reject',
        value: action === 'counter' ? (value ?? null) : null,
        note: note ?? null,
        created_by: negotiationCreatedBy,
        created_at: now,
      });

      if (negError) {
        console.error(`[LOI respond] Error inserting negotiation for section ${sectionId}:`, negError);
        // Non-fatal — history is secondary to the status update
      }
    }

    // 7. Re-check all sections to determine new LOI status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allSections } = await (supabase as any)
      .from('loi_sections')
      .select('status')
      .eq('loi_id', loiId);

    const allAgreed =
      allSections != null &&
      allSections.length > 0 &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (allSections as any[]).every((s: any) => s.status === 'accepted');

    const newLoiStatus = allAgreed ? 'agreed' : 'in_negotiation';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('lois')
      .update({ status: newLoiStatus, updated_at: now })
      .eq('id', loiId);

    // 8. Notify the OTHER TWO parties about this update (fire-and-forget)
    void (async () => {
      try {
        const { data: loiFull } = await supabase
          .from('lois')
          .select(`
            id,
            landlord_contact_id,
            tenant_contact_id,
            broker_contact_id,
            external_address,
            external_city,
            external_state,
            external_zip,
            external_suite,
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
        const loiFullData = loiFull as any;
        const brokerContact = loiFullData.broker;
        const landlordContact = loiFullData.landlord;
        const tenantContact = loiFullData.tenant;
        const property = loiFullData.property;
        const unit = loiFullData.unit;

        const brokerName =
          (brokerContact?.company_name ??
          [brokerContact?.first_name, brokerContact?.last_name].filter(Boolean).join(' '))
          || 'Broker';

        const landlordName =
          (landlordContact?.company_name ??
          [landlordContact?.first_name, landlordContact?.last_name].filter(Boolean).join(' '))
          || 'Landlord';

        const tenantBusinessName =
          (tenantContact?.company_name ??
          [tenantContact?.first_name, tenantContact?.last_name].filter(Boolean).join(' '))
          || 'Tenant';

        const propertyAddress = property
          ? `${property.address}, ${property.city}, ${property.state}`
          : loiFullData.external_address
            ? [loiFullData.external_address, loiFullData.external_city, loiFullData.external_state, loiFullData.external_zip].filter(Boolean).join(', ')
            : 'External Property';

        const suiteNumber = unit?.suite_number ?? loiFullData.external_suite ?? '';

        // Determine actor's display name
        let actorName: string;
        if (isBrokerOrAdmin) {
          actorName = brokerName;
        } else if (isLandlord) {
          actorName = landlordName;
        } else {
          actorName = tenantBusinessName;
        }

        const loiNotification = {
          id: loiId,
          tenantBusinessName,
          propertyAddress,
          suiteNumber,
          brokerName,
          landlordName,
          sectionsCountered: responses
            .filter((r) => r.action === 'counter' || r.action === 'reject')
            .map((r) => r.sectionId),
        };

        if (newLoiStatus === 'agreed') {
          // LOI fully agreed — notify all 3 parties
          const parties = [
            brokerContact?.email && { email: brokerContact.email, name: brokerName },
            landlordContact?.email && { email: landlordContact.email, name: landlordName },
            tenantContact?.email && { email: tenantContact.email, name: tenantBusinessName },
          ].filter(Boolean) as { email: string; name: string }[];

          await notifyLoiAgreed(loiNotification, parties);
        } else {
          // Determine the two non-actor recipients
          const recipients: { email: string; name: string }[] = [];

          if (!isBrokerOrAdmin && brokerContact?.email) {
            recipients.push({ email: brokerContact.email, name: brokerName });
          }
          if (!isLandlord && landlordContact?.email) {
            recipients.push({ email: landlordContact.email, name: landlordName });
          }
          if (!isTenant && tenantContact?.email) {
            recipients.push({ email: tenantContact.email, name: tenantBusinessName });
          }

          if (recipients.length > 0) {
            await notifyLoiSectionUpdate(loiNotification, actorName, role, recipients);
          }
        }
      } catch (notifyError) {
        console.error('[LOI respond] Failed to send email notifications:', notifyError);
      }
    })();

    // 9. Insert in-app notification rows for each non-actor party (fire-and-forget)
    void (async () => {
      try {
        const { data: loiFull } = await supabase
          .from('lois')
          .select(`
            landlord_contact_id,
            tenant_contact_id,
            broker_contact_id,
            external_address,
            external_city,
            external_state,
            external_zip,
            external_suite,
            property:properties(address, city, state),
            unit:units(suite_number),
            tenant:contacts!lois_tenant_contact_id_fkey(company_name, first_name, last_name),
            landlord:contacts!lois_landlord_contact_id_fkey(company_name, first_name, last_name),
            broker:contacts!lois_broker_contact_id_fkey(company_name, first_name, last_name)
          `)
          .eq('id', loiId)
          .single();

        if (!loiFull) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loiFullData = loiFull as any;
        const property = loiFullData.property;
        const unit = loiFullData.unit;
        const brokerContact = loiFullData.broker;
        const landlordContact = loiFullData.landlord;
        const tenantContact = loiFullData.tenant;

        const propertyAddress = property
          ? `${property.address}, ${property.city}, ${property.state}`
          : loiFullData.external_address
            ? [loiFullData.external_address, loiFullData.external_city, loiFullData.external_state, loiFullData.external_zip].filter(Boolean).join(', ')
            : 'External Property';

        const actionLabel = responses.some((r) => r.action === 'reject')
          ? 'rejected terms'
          : responses.some((r) => r.action === 'counter')
            ? 'countered'
            : 'accepted terms';

        const sectionLabel = responses.length === 1 ? '1 section' : `${responses.length} sections`;
        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');

        // Determine which contact IDs belong to non-actor parties
        interface NonActorParty {
          contactId: string;
          linkUrl: string;
        }

        const nonActorParties: NonActorParty[] = [];

        if (!isBrokerOrAdmin && loiFullData.broker_contact_id) {
          nonActorParties.push({
            contactId: loiFullData.broker_contact_id,
            linkUrl: `/lois/${loiId}`,
          });
        }
        if (!isLandlord && loiFullData.landlord_contact_id) {
          nonActorParties.push({
            contactId: loiFullData.landlord_contact_id,
            linkUrl: `/landlord/lois/${loiId}`,
          });
        }
        if (!isTenant && loiFullData.tenant_contact_id) {
          nonActorParties.push({
            contactId: loiFullData.tenant_contact_id,
            linkUrl: `/tenant/lois/${loiId}`,
          });
        }

        // Look up user_id for each non-actor contact and insert notification row
        for (const party of nonActorParties) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: targetUser } = await (supabase as any)
              .from('users')
              .select('id')
              .eq('contact_id', party.contactId)
              .eq('is_active', true)
              .single();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!(targetUser as any)?.id) continue; // user not in system yet — skip

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from('notifications').insert({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              user_id: (targetUser as any).id,
              type: 'loi_section_update',
              title: 'LOI Section Updated',
              message: `${roleLabel} ${actionLabel} on ${sectionLabel} for ${propertyAddress}`,
              link_url: party.linkUrl,
              read: false,
              email_sent: true,
              email_sent_at: now,
            });
          } catch (insertError) {
            console.error('[LOI respond] Failed to insert in-app notification for contact', party.contactId, insertError);
            // Non-fatal — notification failure never blocks the response
          }
        }

        // Suppress unused variable warnings
        void brokerContact;
        void landlordContact;
        void tenantContact;
        void unit;
      } catch (notifyError) {
        console.error('[LOI respond] Failed to send in-app notifications:', notifyError);
      }
    })();

    return NextResponse.json({ success: true, loiStatus: newLoiStatus });
  } catch (error) {
    console.error('[LOI respond] Unexpected error:', error);
    console.error('[LOI respond] Error details:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
