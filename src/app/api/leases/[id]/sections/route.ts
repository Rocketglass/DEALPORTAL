/**
 * POST /api/leases/[id]/sections
 *
 * Broker/admin only — requires authentication.
 * Creates lease sections from an agreed LOI (or manually) and sets
 * the lease negotiation_status to 'in_negotiation'.
 *
 * Body:
 * {
 *   sections: Array<{
 *     section_key: string;
 *     section_label: string;
 *     proposed_value: string;
 *     display_order: number;
 *   }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { sanitizeHtml } from '@/lib/security/sanitize';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

interface SectionInput {
  section_key: string;
  section_label: string;
  proposed_value: string;
  display_order: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    // Require broker or admin authentication
    let authUser;
    try {
      authUser = await requireBrokerOrAdminForApi();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leaseId } = await params;

    let body: { sections: SectionInput[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { sections } = body;
    if (!Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json(
        { error: 'sections array is required and must not be empty' },
        { status: 400 },
      );
    }

    // Validate each section
    for (const section of sections) {
      if (!section.section_key || typeof section.section_key !== 'string') {
        return NextResponse.json(
          { error: 'Each section must have a section_key string' },
          { status: 400 },
        );
      }
      if (!section.section_label || typeof section.section_label !== 'string') {
        return NextResponse.json(
          { error: 'Each section must have a section_label string' },
          { status: 400 },
        );
      }
      if (!section.proposed_value || typeof section.proposed_value !== 'string') {
        return NextResponse.json(
          { error: 'Each section must have a proposed_value string' },
          { status: 400 },
        );
      }
      if (typeof section.display_order !== 'number') {
        return NextResponse.json(
          { error: 'Each section must have a display_order number' },
          { status: 400 },
        );
      }
    }

    const supabase = getServiceClient();

    // Verify the lease exists
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id, status, negotiation_status')
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }

    // Only allow creating sections if negotiation hasn't already started
    const negotiationStatus = (lease as Record<string, unknown>).negotiation_status as string;
    if (negotiationStatus === 'agreed') {
      return NextResponse.json(
        { error: 'Cannot add sections — lease negotiation is already agreed' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // Build the insert rows with sanitized values
    const insertRows = sections.map((s) => ({
      lease_id: leaseId,
      section_key: sanitizeHtml(s.section_key),
      section_label: sanitizeHtml(s.section_label),
      proposed_value: sanitizeHtml(s.proposed_value),
      display_order: s.display_order,
      status: 'proposed' as const,
      counterparty_response: null,
      agreed_value: null,
      negotiation_notes: null,
      last_updated_by: null,
      updated_at: now,
    }));

    // Insert all sections
    const { data: createdSections, error: insertError } = await supabase
      .from('lease_sections')
      .insert(insertRows)
      .select('id, section_key, section_label, display_order, status');

    if (insertError) {
      console.error('[POST /api/leases/[id]/sections] Insert error:', insertError);
      return NextResponse.json(
        { error: `Failed to create sections: ${insertError.message}` },
        { status: 500 },
      );
    }

    // Update lease negotiation_status to 'in_negotiation'
    const { error: updateError } = await supabase
      .from('leases')
      .update({ negotiation_status: 'in_negotiation', updated_at: now })
      .eq('id', leaseId);

    if (updateError) {
      console.error('[POST /api/leases/[id]/sections] Lease update error:', updateError);
      // Non-fatal — sections were created successfully
    }

    // Insert audit log entry
    const { error: auditError } = await supabase.from('audit_log').insert({
      user_id: authUser.id,
      action: 'lease_sections_created',
      entity_type: 'lease',
      entity_id: leaseId,
      old_value: null,
      new_value: {
        sections_count: sections.length,
        section_keys: sections.map((s) => s.section_key),
      },
    });

    if (auditError) {
      console.error('[POST /api/leases/[id]/sections] Audit log error:', auditError);
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      sections: createdSections,
      negotiationStatus: 'in_negotiation',
    });
  } catch (error) {
    console.error('[POST /api/leases/[id]/sections] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
