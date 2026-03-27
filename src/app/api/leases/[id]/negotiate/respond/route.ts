/**
 * POST /api/leases/[id]/negotiate/respond
 *
 * Public endpoint — no authentication required. Used by any party
 * (tenant, landlord, broker) who accesses the lease negotiation link.
 *
 * Accepts a single section response and:
 *   1. Updates the lease_sections record with the response/action.
 *   2. Inserts a lease_negotiations row recording the action.
 *   3. If all sections are accepted -> updates lease negotiation_status to 'agreed'.
 *
 * Body:
 * {
 *   sectionId: string;
 *   action: 'accept' | 'counter' | 'reject';
 *   value?: string;      // counter-proposal text (required when action='counter')
 *   note?: string;       // optional note/reason
 *   partyRole: 'broker' | 'tenant' | 'landlord' | 'tenant_agent' | 'landlord_agent';
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { LoiSectionStatus, PartyRole } from '@/types/database';
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

const VALID_PARTY_ROLES: PartyRole[] = ['broker', 'tenant', 'landlord', 'tenant_agent', 'landlord_agent'];

interface RespondBody {
  sectionId: string;
  action: 'accept' | 'counter' | 'reject';
  value?: string;
  note?: string;
  partyRole: PartyRole;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: leaseId } = await params;

    let body: RespondBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { sectionId, action, partyRole } = body;
    // Sanitize user-provided text to prevent stored XSS
    const value = body.value ? sanitizeHtml(body.value) : body.value;
    const note = body.note ? sanitizeHtml(body.note) : body.note;

    // Validate required fields
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

    if (!partyRole || !VALID_PARTY_ROLES.includes(partyRole)) {
      return NextResponse.json(
        { error: 'partyRole must be one of: broker, tenant, landlord, tenant_agent, landlord_agent' },
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

    const supabase = getServiceClient();

    // Verify the lease exists and is in a negotiable state
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id, status, negotiation_status')
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }

    const negotiationStatus = (lease as Record<string, unknown>).negotiation_status as string;
    if (negotiationStatus !== 'in_negotiation') {
      return NextResponse.json(
        { error: `Lease is not currently open for negotiation (status: ${negotiationStatus})` },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const newStatus = ACTION_TO_STATUS[action];

    // When accepting, copy the proposed_value to agreed_value
    let agreedValue: string | null = null;
    if (action === 'accept') {
      const { data: sectionData } = await supabase
        .from('lease_sections')
        .select('proposed_value, counterparty_response')
        .eq('id', sectionId)
        .single();
      // If there was a counter-proposal, the agreed value is the latest counter;
      // otherwise it's the original proposed value
      agreedValue = sectionData?.counterparty_response ?? sectionData?.proposed_value ?? null;
    }

    // Update the section status
    const { data: updatedRows, error: sectionError } = await supabase
      .from('lease_sections')
      .update({
        status: newStatus,
        counterparty_response: action === 'counter' ? (value ?? null) : undefined,
        agreed_value: agreedValue,
        negotiation_notes: note ?? undefined,
        last_updated_by: partyRole,
        updated_at: now,
      })
      .eq('id', sectionId)
      .eq('lease_id', leaseId)
      .select('id');

    if (sectionError) {
      console.error(`[Lease negotiate respond] Error updating section ${sectionId}:`, sectionError);
      return NextResponse.json(
        { error: `Failed to update section: ${sectionError.message}` },
        { status: 500 },
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: 'Section not found for this lease' },
        { status: 404 },
      );
    }

    // Insert negotiation history (audit trail)
    const { error: negError } = await supabase.from('lease_negotiations').insert({
      lease_section_id: sectionId,
      action: action === 'accept' ? 'accept' : action === 'counter' ? 'counter' : 'reject',
      value: action === 'counter' ? (value ?? null) : null,
      note: note ?? null,
      created_by: partyRole,
      party_role: partyRole,
      created_at: now,
    });

    if (negError) {
      console.error(`[Lease negotiate respond] Error inserting negotiation for section ${sectionId}:`, negError);
      // Non-fatal — history is secondary to the status update
    }

    // Re-check all sections to determine if the lease has reached full agreement
    const { data: allSections } = await supabase
      .from('lease_sections')
      .select('status')
      .eq('lease_id', leaseId);

    const allAgreed =
      allSections != null &&
      allSections.length > 0 &&
      allSections.every((s) => s.status === 'accepted');

    const newNegotiationStatus = allAgreed ? 'agreed' : 'in_negotiation';

    await supabase
      .from('leases')
      .update({ negotiation_status: newNegotiationStatus, updated_at: now })
      .eq('id', leaseId);

    // Insert audit log entry
    const { error: auditError } = await supabase.from('audit_log').insert({
      user_id: null, // public endpoint, no authenticated user
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
        party_role: partyRole,
        resulting_status: newNegotiationStatus,
      },
    });

    if (auditError) {
      console.error('[Lease negotiate respond] Audit log error:', auditError);
      // Non-fatal
    }

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
