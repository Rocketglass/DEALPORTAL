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
      .select('id, status')
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

    const now = new Date().toISOString();

    // Process each section response
    for (const resp of responses) {
      const { sectionId, action, value, note } = resp;

      if (!sectionId || !action || !ACTION_TO_STATUS[action]) {
        return NextResponse.json(
          { error: `Invalid response for section ${sectionId}: action must be accept, counter, or reject` },
          { status: 400 },
        );
      }

      const newStatus = ACTION_TO_STATUS[action];

      // Update the section status and landlord response
      const { error: sectionError } = await supabase
        .from('loi_sections')
        .update({
          status: newStatus,
          landlord_response: action === 'counter' ? (value ?? null) : (note ?? null),
          agreed_value: action === 'accept' ? undefined : null,
          updated_at: now,
        })
        .eq('id', sectionId)
        .eq('loi_id', loiId);

      if (sectionError) {
        console.error(`[LOI respond] Error updating section ${sectionId}:`, sectionError);
        return NextResponse.json(
          { error: `Failed to update section: ${sectionError.message}` },
          { status: 500 },
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

    return NextResponse.json({ success: true, loiStatus: newLoiStatus });
  } catch (error) {
    console.error('[LOI respond] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
