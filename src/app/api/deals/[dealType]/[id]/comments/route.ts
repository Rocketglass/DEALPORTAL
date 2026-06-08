/**
 * GET  /api/deals/[dealType]/[id]/comments — list comments
 * POST /api/deals/[dealType]/[id]/comments — add a comment
 *
 * Auth: authenticated users (broker/landlord/tenant) via session,
 *       OR lawyers via access_token query param.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { AuthUser } from '@/lib/security/auth-guard';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const VALID_DEAL_TYPES = ['loi', 'lease'] as const;

interface RouteContext {
  params: Promise<{ dealType: string; id: string }>;
}

interface CommentAuthor {
  name: string;
  email: string;
  role: string;
}

/**
 * Resolve the comment author for THIS specific deal.
 *
 * Authorization is per-deal, not just "is authenticated". Without this an
 * attacker could read/write any deal's comments by changing the URL:
 *   - a logged-in tenant/landlord could reach another party's deal, and
 *   - a lawyer with one valid token could pivot to any other deal id.
 * Returns null if the caller is not a party to (dealType, dealId).
 */
async function resolveAuthor(
  request: NextRequest,
  dealType: string,
  dealId: string,
): Promise<CommentAuthor | null> {
  const supabase = getServiceClient();

  // Try session auth first
  try {
    const { requireAuthForApi } = await import('@/lib/security/auth-guard');
    const user: AuthUser = await requireAuthForApi();

    // Broker / admin manage every deal.
    if (user.role === 'broker' || user.role === 'admin') {
      return { name: user.email, email: user.email, role: 'broker' };
    }

    // Landlord / tenant (and their agents) must be a party to THIS deal.
    const table = dealType === 'loi' ? 'lois' : 'leases';
    const { data: deal } = await supabase
      .from(table)
      .select('tenant_contact_id, landlord_contact_id')
      .eq('id', dealId)
      .maybeSingle();
    if (!deal) return null;

    const effectiveContactId = user.principalContactId ?? user.contactId;
    if (!effectiveContactId) return null;

    const isLandlord = user.role === 'landlord' || user.role === 'landlord_agent';
    const isTenant = user.role === 'tenant' || user.role === 'tenant_agent';

    if (isLandlord && effectiveContactId === deal.landlord_contact_id) {
      return { name: user.email, email: user.email, role: 'landlord' };
    }
    if (isTenant && effectiveContactId === deal.tenant_contact_id) {
      return { name: user.email, email: user.email, role: 'tenant' };
    }
    // Authenticated, but not a party to this deal.
    return null;
  } catch {
    // Session auth failed — try token auth
  }

  // Try access_token auth — the token MUST belong to THIS deal.
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return null;

  const { data: collaborator } = await supabase
    .from('deal_collaborators')
    .select('name, email, role')
    .eq('access_token', token)
    .eq('deal_type', dealType)
    .eq('deal_id', dealId)
    .is('revoked_at', null)
    .maybeSingle();

  if (!collaborator) return null;

  // Update last_accessed_at (fire-and-forget)
  void supabase
    .from('deal_collaborators')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('access_token', token)
    .then(() => {});

  return {
    name: collaborator.name,
    email: collaborator.email,
    role: collaborator.role,
  };
}

// ----------------------------------------------------------------
// GET — list comments
// ----------------------------------------------------------------

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { dealType, id: dealId } = await context.params;

  if (!VALID_DEAL_TYPES.includes(dealType as typeof VALID_DEAL_TYPES[number])) {
    return NextResponse.json({ error: 'Invalid deal type' }, { status: 400 });
  }

  const author = await resolveAuthor(request, dealType, dealId);
  if (!author) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('deal_comments')
    .select('*')
    .eq('deal_type', dealType)
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[GET /api/deals/.../comments] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ comments: data });
}

// ----------------------------------------------------------------
// POST — add a comment
// ----------------------------------------------------------------

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { dealType, id: dealId } = await context.params;

  if (!VALID_DEAL_TYPES.includes(dealType as typeof VALID_DEAL_TYPES[number])) {
    return NextResponse.json({ error: 'Invalid deal type' }, { status: 400 });
  }

  const author = await resolveAuthor(request, dealType, dealId);
  if (!author) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { comment, sectionId } = body;

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return NextResponse.json({ error: 'comment is required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('deal_comments')
      .insert({
        deal_type: dealType,
        deal_id: dealId,
        section_id: sectionId || null,
        author_name: author.name,
        author_email: author.email,
        author_role: author.role,
        comment: comment.trim(),
      })
      .select('*')
      .single();

    if (error) {
      console.error('[POST /api/deals/.../comments] Insert error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (error) {
    const message = 'Internal server error';
    console.error('[POST /api/deals/.../comments] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
