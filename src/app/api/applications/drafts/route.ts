/**
 * GET /api/applications/drafts
 * PUT /api/applications/drafts
 *
 * Auth required — any authenticated user can save/load a draft.
 * (A user filling out the form may not yet have role=tenant.)
 *
 * GET: Returns the user's current draft, or null if none exists.
 * PUT: Upserts the user's draft (one draft per user via UNIQUE(user_id)).
 *
 * Uses service client for DB operations to avoid any RLS race window
 * during initial draft creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAuthForApi } from '@/lib/security/auth-guard';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/applications/drafts
 * Returns { draft: { form_data, selected_property_ids, current_step } | null }
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireAuthForApi();

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('application_drafts')
      .select('form_data, selected_property_ids, current_step, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[GET /api/applications/drafts] query error:', error);
      return NextResponse.json({ error: 'Failed to load draft' }, { status: 500 });
    }

    return NextResponse.json({ draft: data ?? null });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/**
 * PUT /api/applications/drafts
 * Body: { form_data: object, selected_property_ids: string[], current_step: number }
 * Returns { success: true, updated_at: string }
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuthForApi();

    const body = await request.json();
    const { form_data, selected_property_ids, current_step } = body as {
      form_data?: Record<string, unknown>;
      selected_property_ids?: string[];
      current_step?: number;
    };

    // Validate current_step
    if (current_step !== undefined) {
      const step = Number(current_step);
      if (!Number.isInteger(step) || step < 1 || step > 5) {
        return NextResponse.json(
          { error: 'current_step must be an integer between 1 and 5' },
          { status: 400 },
        );
      }
    }

    const supabase = getServiceClient();

    const upsertData = {
      user_id: user.id,
      form_data: form_data ?? {},
      selected_property_ids: selected_property_ids ?? [],
      current_step: current_step ?? 1,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('application_drafts')
      .upsert(upsertData, { onConflict: 'user_id' })
      .select('updated_at')
      .single();

    if (error) {
      console.error('[PUT /api/applications/drafts] upsert error:', error);
      return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated_at: data.updated_at });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
