/**
 * GET /api/loi-templates
 *
 * Fetches all LOI templates, optionally filtered by property_type.
 *
 * Query params:
 *   property_type — (optional) filter by property type: industrial, retail, office, flex
 *
 * Requires an authenticated broker or admin user.
 *
 * Returns: { templates: LoiTemplate[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { createClient } from '@/lib/supabase/server';

export interface LoiTemplateSection {
  section_key: string;
  section_label: string;
  display_order: number;
  default_value: string;
}

export interface LoiTemplate {
  id: string;
  name: string;
  property_type: string;
  description: string | null;
  sections: LoiTemplateSection[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireBrokerOrAdminForApi();

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const propertyType = searchParams.get('property_type');

    let query = supabase
      .from('loi_templates')
      .select('*')
      .order('property_type')
      .order('name');

    if (propertyType) {
      query = query.eq('property_type', propertyType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/loi-templates] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: data ?? [] });
  } catch (error) {
    console.error('[GET /api/loi-templates] Unexpected error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
