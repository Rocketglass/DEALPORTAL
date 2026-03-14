/**
 * GET /api/properties/[id]/analytics
 *
 * Returns view counts and daily breakdown for the last 30 days.
 * Requires an authenticated broker or admin.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Missing property id' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch all views for this property
    const { data: allViews, error: allError } = await supabase
      .from('property_views')
      .select('id, source, viewed_at')
      .eq('property_id', id);

    if (allError) {
      console.error(`[GET /api/properties/${id}/analytics] Query error:`, allError);
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    const views = allViews ?? [];
    const totalViews = views.length;

    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentViews = views.filter((v) => new Date(v.viewed_at) >= thirtyDaysAgo);
    const viewsLast30 = recentViews.length;

    // Source breakdown (all time)
    const qrScans = views.filter((v) => v.source === 'qr_scan').length;
    const browseViews = views.filter((v) => v.source === 'browse').length;
    const otherViews = totalViews - qrScans - browseViews;

    // Daily breakdown for last 30 days
    const dailyMap: Record<string, number> = {};
    // Pre-fill all 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      dailyMap[key] = 0;
    }
    for (const view of recentViews) {
      const key = new Date(view.viewed_at).toISOString().split('T')[0];
      if (dailyMap[key] !== undefined) {
        dailyMap[key]++;
      }
    }
    const dailyBreakdown = Object.entries(dailyMap).map(([date, count]) => ({
      date,
      count,
    }));

    return NextResponse.json({
      totalViews,
      viewsLast30,
      qrScans,
      browseViews,
      otherViews,
      dailyBreakdown,
    });
  } catch (error) {
    console.error('[GET /api/properties/[id]/analytics] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
