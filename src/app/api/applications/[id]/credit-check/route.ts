/**
 * PATCH /api/applications/[id]/credit-check
 *
 * Update the credit check information on an application.
 * Used for manual credit report upload or manual score entry.
 *
 * Body:
 * {
 *   credit_score: number;          // required, 300-850
 *   credit_check_date: string;     // ISO date string
 *   credit_report_url?: string;    // optional URL to uploaded credit report
 * }
 *
 * Requires authenticated broker or admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // Auth check
  let currentUser;
  try {
    currentUser = await requireBrokerOrAdminForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  const { id } = await params;

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { credit_score, credit_check_date, credit_report_url } = body;

  // Validate credit score
  if (typeof credit_score !== 'number' || credit_score < 300 || credit_score > 850) {
    return NextResponse.json(
      { error: 'credit_score must be a number between 300 and 850' },
      { status: 400 },
    );
  }

  // Validate date
  if (typeof credit_check_date !== 'string' || !credit_check_date) {
    return NextResponse.json(
      { error: 'credit_check_date is required (ISO date string)' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  type CreditCheckUpdate = {
    credit_check_status: 'completed';
    credit_score: number;
    credit_check_date: string;
    credit_report_url?: string;
    updated_at: string;
  };

  const update: CreditCheckUpdate = {
    credit_check_status: 'completed',
    credit_score: credit_score,
    credit_check_date: credit_check_date,
    updated_at: now,
  };

  if (typeof credit_report_url === 'string' && credit_report_url) {
    update.credit_report_url = credit_report_url;
  }

  try {
    const supabase = getServiceClient();

    // Verify the application exists
    const { data: existing, error: findError } = await supabase
      .from('applications')
      .select('id, business_name')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('applications')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? 'Update returned no data');
    }

    console.log(
      `[PATCH /api/applications/${id}/credit-check] ${existing.business_name} → score ${credit_score}` +
        ` by ${currentUser.email}`,
    );

    return NextResponse.json({ application: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update credit check';
    console.error(`[PATCH /api/applications/${id}/credit-check] Error:`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
