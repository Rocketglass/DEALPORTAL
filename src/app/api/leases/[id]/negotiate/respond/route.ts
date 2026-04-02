/**
 * POST /api/leases/[id]/negotiate/respond
 *
 * Authenticated endpoint — requires an active session.
 * Accessible to broker, admin, landlord, landlord_agent, tenant, tenant_agent.
 * Non-parties receive 403.
 *
 * Accepts a single section response and:
 *   1. Updates the lease_sections record with the response/action and last_updated_by = caller's role.
 *   2. Inserts a lease_negotiations row recording the action with created_by = caller's role.
 *   3. If all sections are accepted -> updates lease negotiation_status to 'agreed'.
 *   4. Sends email notifications to the OTHER TWO parties (not the actor).
 *   5. Inserts in-app notification rows for each non-actor party.
 *
 * Body:
 * {
 *   sectionId: string;
 *   action: 'accept' | 'counter' | 'reject';
 *   value?: string;      // counter-proposal text (required when action='counter')
 *   note?: string;       // rejection reason (required when action='reject')
 *   updatedAt?: string;  // ISO timestamp for optimistic locking
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthForApi } from '@/lib/security/auth-guard';
import { createClient as createServiceClient } from '@/lib/supabase/service';
import type { LoiSectionStatus } from '@/types/database';
import { notifyLeaseTermUpdate } from '@/lib/email/notifications';
import { sanitizeHtml, sanitizeUuid } from '@/lib/security/sanitize';

const ACTION_TO_STATUS: Record<string, LoiSectionStatus> = {
  accept: 'accepted',
  counter: 'countered',
  reject: 'rejected',
};

interface RespondBody {
  sectionId?: string;
  action: 'accept' | 'counter' | 'reject' | 'accept_all' | 'request_changes';
  value?: string;
  note?: string;
  message?: string;
  updatedAt?: string; // ISO timestamp for optimistic locking
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: leaseId } = await params;

    // 1. Authenticate the request — throws if no session
    let user;
    try {
      user = await requireAuthForApi();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: RespondBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Handle accept_all and request_changes (whole-lease responses)
    if (body.action === 'accept_all' || body.action === 'request_changes') {
      const supabase = await createServiceClient();

      // Fetch lease to verify party membership and get contact IDs
      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('id, status, landlord_contact_id, tenant_contact_id, broker_contact_id, property:properties(address, city, state), unit:units!leases_unit_id_fkey(suite_number), tenant:contacts!leases_tenant_contact_id_fkey(email, first_name, last_name, company_name), landlord:contacts!leases_landlord_contact_id_fkey(email, first_name, last_name, company_name), broker:contacts!leases_broker_contact_id_fkey(email, first_name, last_name, company_name)')
        .eq('id', leaseId)
        .single();

      if (leaseError || !lease) {
        return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const leaseData = lease as any;

      // Determine actor role
      const effectiveContactId = user.contactId ?? user.principalId;
      const isLandlord = effectiveContactId === leaseData.landlord_contact_id;
      const isTenant = effectiveContactId === leaseData.tenant_contact_id;
      const isBrokerOrAdmin = user.role === 'broker' || user.role === 'admin';
      const actorLabel = isLandlord ? 'Landlord' : isTenant ? 'Tenant' : 'Broker';

      const now = new Date().toISOString();

      if (body.action === 'accept_all') {
        // Update lease negotiation_status to 'accepted'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('leases')
          .update({ negotiation_status: 'accepted', updated_at: now })
          .eq('id', leaseId);
      }

      // Insert a notification for the broker (and other parties)
      const notificationMessage = body.action === 'accept_all'
        ? `${actorLabel} accepted all lease terms`
        : `${actorLabel} requested changes: ${body.message ?? '(no details)'}`;

      // Notify broker
      const { data: brokerUser } = await supabase
        .from('users')
        .select('id')
        .eq('contact_id', leaseData.broker_contact_id)
        .eq('is_active', true)
        .maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      if (brokerUser) {
        await db.from('notifications').insert({
          user_id: brokerUser.id,
          type: 'lease_response',
          title: body.action === 'accept_all' ? 'Lease Terms Accepted' : 'Lease Changes Requested',
          message: notificationMessage,
          link_url: `/leases/${leaseId}`,
          read: false,
        });
      }

      // Notify the other party (if tenant responded, notify landlord and vice versa)
      const otherContactId = isTenant ? leaseData.landlord_contact_id : leaseData.tenant_contact_id;
      if (otherContactId) {
        const { data: otherUser } = await db
          .from('users')
          .select('id')
          .eq('contact_id', otherContactId)
          .eq('is_active', true)
          .maybeSingle();

        if (otherUser) {
          const otherIsLandlord = otherContactId === leaseData.landlord_contact_id;
          await db.from('notifications').insert({
            user_id: otherUser.id,
            type: 'lease_response',
            title: body.action === 'accept_all' ? 'Lease Terms Accepted' : 'Lease Changes Requested',
            message: notificationMessage,
            link_url: otherIsLandlord ? `/landlord/leases/${leaseId}` : `/tenant/leases/${leaseId}`,
            read: false,
          });
        }
      }

      // Audit log
      await db.from('audit_log').insert({
        user_id: user.id,
        action: body.action === 'accept_all' ? 'lease_terms_accepted' : 'lease_changes_requested',
        entity_type: 'lease',
        entity_id: leaseId,
        new_value: { actor: actorLabel, message: body.message ?? null },
      });

      return NextResponse.json({ success: true, action: body.action });
    }

    const { sectionId, action } = body;
    // Sanitize user-provided text to prevent stored XSS
    const value = body.value ? sanitizeHtml(body.value) : body.value;
    const note = body.note ? sanitizeHtml(body.note) : body.note;

    // Validate required fields for section-level responses
    if (!sectionId || !sanitizeUuid(sectionId)) {
      return NextResponse.json(
        { error: 'sectionId must be a valid UUID' },
        { status: 400 },
      );
    }

    if (!action || !ACTION_TO_STATUS[action]) {
      return NextResponse.json(
        { error: 'action must be one of: accept, counter, reject' },
        { status: 400 },
      );
    }

    // Validate that counter responses include text
    if (action === 'counter' && (!value || !value.trim())) {
      return NextResponse.json(
        { error: 'Counter-proposal text (value) is required when action is "counter"' },
        { status: 400 },
      );
    }

    // Validate that reject responses include a note
    if (action === 'reject' && (!note || !note.trim())) {
      return NextResponse.json(
        { error: 'Rejection reason (note) is required when action is "reject"' },
        { status: 400 },
      );
    }

    // Service client for all DB operations — auth enforced above
    const supabase = await createServiceClient();

    // 2. Fetch the lease to verify existence, state, and party membership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lease, error: leaseError } = await (supabase as any)
      .from('leases')
      .select('id, status, negotiation_status, landlord_contact_id, tenant_contact_id, broker_contact_id')
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leaseRow = lease as any;

    // 3. Authorization: verify the caller is a party to this lease
    const { role, contactId, principalId } = user;
    const effectiveContactId = contactId ?? principalId;

    const isBrokerOrAdmin = role === 'broker' || role === 'admin';
    const isLandlord = role === 'landlord' || role === 'landlord_agent';
    const isTenant = role === 'tenant' || role === 'tenant_agent';

    if (!isBrokerOrAdmin) {
      if (isLandlord) {
        if (!effectiveContactId || effectiveContactId !== leaseRow.landlord_contact_id) {
          return NextResponse.json({ error: 'Forbidden: not a party to this lease' }, { status: 403 });
        }
      } else if (isTenant) {
        if (!effectiveContactId || effectiveContactId !== leaseRow.tenant_contact_id) {
          return NextResponse.json({ error: 'Forbidden: not a party to this lease' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // 4. Verify the lease is in a negotiable state
    if (leaseRow.negotiation_status !== 'in_negotiation') {
      return NextResponse.json(
        { error: `Lease is not currently open for negotiation (status: ${leaseRow.negotiation_status})` },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const newStatus = ACTION_TO_STATUS[action];

    // 5. When accepting, copy the latest counter or proposed_value to agreed_value
    let agreedValue: string | null = null;
    if (action === 'accept') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sectionData } = await (supabase as any)
        .from('lease_sections')
        .select('proposed_value, counterparty_response')
        .eq('id', sectionId)
        .single();
      // If there was a counter-proposal, the agreed value is the latest counter;
      // otherwise it's the original proposed value
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      agreedValue = (sectionData as any)?.counterparty_response ?? (sectionData as any)?.proposed_value ?? null;
    }

    // 6. Update the section status, response, last_updated_by
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('lease_sections')
      .update({
        status: newStatus,
        counterparty_response: action === 'counter' ? (value ?? null) : undefined,
        agreed_value: agreedValue,
        negotiation_notes: note ?? undefined,
        last_updated_by: user.contactId
          ?? (isLandlord ? leaseRow.landlord_contact_id : isTenant ? leaseRow.tenant_contact_id : leaseRow.broker_contact_id),
        updated_at: now,
      })
      .eq('id', sectionId)
      .eq('lease_id', leaseId);

    // Optimistic locking: only update if section hasn't changed since client loaded it
    if (body.updatedAt) {
      query = query.eq('updated_at', body.updatedAt);
    }

    const { data: updatedRows, error: sectionError } = await query.select('id');

    if (sectionError) {
      console.error(`[Lease negotiate respond] Error updating section ${sectionId}:`, sectionError);
      return NextResponse.json(
        { error: `Failed to update section: ${sectionError.message}` },
        { status: 500 },
      );
    }

    // If optimistic locking was used and no rows matched, the section was modified concurrently
    if (body.updatedAt && (!updatedRows || updatedRows.length === 0)) {
      return NextResponse.json(
        { error: `Section "${sectionId}" was modified by another user. Please refresh and try again.` },
        { status: 409 },
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: 'Section not found for this lease' },
        { status: 404 },
      );
    }

    // 7. Insert negotiation history entry with actual role as created_by and party_role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: negError } = await (supabase as any).from('lease_negotiations').insert({
      lease_section_id: sectionId,
      action: action === 'accept' ? 'accept' : action === 'counter' ? 'counter' : 'reject',
      value: action === 'counter' ? (value ?? null) : null,
      note: note ?? null,
      created_by: user.contactId
        ?? (isLandlord ? leaseRow.landlord_contact_id : isTenant ? leaseRow.tenant_contact_id : leaseRow.broker_contact_id),
      party_role: role,
      created_at: now,
    });

    if (negError) {
      console.error(`[Lease negotiate respond] Error inserting negotiation for section ${sectionId}:`, negError);
      // Non-fatal — history is secondary to the status update
    }

    // 8. Re-check all sections to determine if the lease has reached full agreement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allSections } = await (supabase as any)
      .from('lease_sections')
      .select('status')
      .eq('lease_id', leaseId);

    const allAgreed =
      allSections != null &&
      allSections.length > 0 &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (allSections as any[]).every((s: any) => s.status === 'accepted');

    const newNegotiationStatus = allAgreed ? 'agreed' : 'in_negotiation';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('leases')
      .update({ negotiation_status: newNegotiationStatus, updated_at: now })
      .eq('id', leaseId);

    // 9. Insert audit log entry with authenticated user_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: auditError } = await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      action: `lease_section_${action}`,
      entity_type: 'lease_section',
      entity_id: sectionId,
      old_value: null,
      new_value: {
        lease_id: leaseId,
        section_id: sectionId,
        action,
        value: value ?? null,
        note: note ?? null,
        party_role: role,
        resulting_status: newNegotiationStatus,
      },
    });

    if (auditError) {
      console.error('[Lease negotiate respond] Audit log error:', auditError);
      // Non-fatal
    }

    // 10. Notify the OTHER TWO parties about this update (fire-and-forget)
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: leaseFull } = await (supabase as any)
          .from('leases')
          .select(`
            id,
            landlord_contact_id,
            tenant_contact_id,
            broker_contact_id,
            property:properties(address, city, state),
            unit:units!leases_unit_id_fkey(suite_number),
            tenant:contacts!leases_tenant_contact_id_fkey(email, first_name, last_name, company_name),
            landlord:contacts!leases_landlord_contact_id_fkey(email, first_name, last_name, company_name),
            broker:contacts!leases_broker_contact_id_fkey(email, first_name, last_name, company_name)
          `)
          .eq('id', leaseId)
          .single();

        if (!leaseFull) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leaseFullData = leaseFull as any;
        const brokerContact = leaseFullData.broker;
        const landlordContact = leaseFullData.landlord;
        const tenantContact = leaseFullData.tenant;
        const property = leaseFullData.property;
        const unit = leaseFullData.unit;

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
          : 'Unknown property';

        const suiteNumber = unit?.suite_number ?? '';

        // Determine actor's display name
        let actorName: string;
        if (isBrokerOrAdmin) {
          actorName = brokerName;
        } else if (isLandlord) {
          actorName = landlordName;
        } else {
          actorName = tenantBusinessName;
        }

        const leaseNotification = {
          id: leaseId,
          tenantBusinessName,
          propertyAddress,
          suiteNumber,
          brokerName,
          landlordName,
          sectionsUpdated: [sectionId],
        };

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
          await notifyLeaseTermUpdate(leaseNotification, actorName, role, recipients);
        }
      } catch (notifyError) {
        console.error('[Lease negotiate respond] Failed to send email notifications:', notifyError);
      }
    })();

    // 11. Insert in-app notification rows for each non-actor party (fire-and-forget)
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: leaseFull } = await (supabase as any)
          .from('leases')
          .select(`
            landlord_contact_id,
            tenant_contact_id,
            broker_contact_id,
            property:properties(address, city, state),
            unit:units!leases_unit_id_fkey(suite_number),
            sections:lease_sections!inner(id, section_label)
          `)
          .eq('id', leaseId)
          .single();

        if (!leaseFull) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leaseFullData = leaseFull as any;
        const property = leaseFullData.property;

        const propertyAddress = property
          ? `${property.address}, ${property.city}, ${property.state}`
          : 'Unknown property';

        // Find the label for the updated section
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedSection = (leaseFullData.sections as any[])?.find((s: any) => s.id === sectionId);
        const sectionLabel = updatedSection?.section_label ?? 'section';

        const actionLabel =
          action === 'reject' ? 'rejected' : action === 'counter' ? 'countered' : 'accepted';

        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');

        interface NonActorParty {
          contactId: string;
          linkUrl: string;
        }

        const nonActorParties: NonActorParty[] = [];

        if (!isBrokerOrAdmin && leaseFullData.broker_contact_id) {
          nonActorParties.push({
            contactId: leaseFullData.broker_contact_id,
            linkUrl: `/leases/${leaseId}`,
          });
        }
        if (!isLandlord && leaseFullData.landlord_contact_id) {
          nonActorParties.push({
            contactId: leaseFullData.landlord_contact_id,
            linkUrl: `/landlord/leases/${leaseId}`,
          });
        }
        if (!isTenant && leaseFullData.tenant_contact_id) {
          nonActorParties.push({
            contactId: leaseFullData.tenant_contact_id,
            linkUrl: `/tenant/leases/${leaseId}`,
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
              type: 'lease_term_update',
              title: 'Lease Term Updated',
              message: `${roleLabel} ${actionLabel} on ${sectionLabel} for ${propertyAddress}`,
              link_url: party.linkUrl,
              read: false,
              email_sent: true,
              email_sent_at: now,
            });
          } catch (insertError) {
            console.error('[Lease negotiate respond] Failed to insert in-app notification for contact', party.contactId, insertError);
            // Non-fatal — notification failure never blocks the response
          }
        }
      } catch (notifyError) {
        console.error('[Lease negotiate respond] Failed to send in-app notifications:', notifyError);
      }
    })();

    return NextResponse.json({
      success: true,
      negotiationStatus: newNegotiationStatus,
      sectionStatus: newStatus,
    });
  } catch (error) {
    console.error('[Lease negotiate respond] Unexpected error:', error);
    console.error('[Lease negotiate respond] Error details:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
