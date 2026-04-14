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
 * Resolve the comment author from either session auth or access_token.
 * Returns null if neither auth method succeeds.
 */
async function resolveAuthor(request: NextRequest): Promise<CommentAuthor | null> {
  // Try session auth first
  try {
    const { requireAuthForApi } = await import('@/lib/security/auth-guard');
    const user: AuthUser = await requireAuthForApi();

    const roleLabel =
      user.role === 'broker' || user.role === 'admin'
        ? 'broker'
        : user.role === 'landlord' || user.role === 'landlord_agent'
          ? 'landlord'
          : 'tenant';

    return { name: user.email, email: user.email, role: roleLabel };
  } catch {
    // Session auth failed — try token auth
  }

  // Try access_token auth
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return null;

  const supabase = getServiceClient();
  const { data: collaborator } = await supabase
    .from('deal_collaborators')
    .select('name, email, role')
    .eq('access_token', token)
    .is('revoked_at', null)
    .single();

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
  const author = await resolveAuthor(request);
  if (!author) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { dealType, id: dealId } = await context.params;

  if (!VALID_DEAL_TYPES.includes(dealType as typeof VALID_DEAL_TYPES[number])) {
    return NextResponse.json({ error: 'Invalid deal type' }, { status: 400 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const author = await resolveAuthor(request);
  if (!author) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { dealType, id: dealId } = await context.params;

  if (!VALID_DEAL_TYPES.includes(dealType as typeof VALID_DEAL_TYPES[number])) {
    return NextResponse.json({ error: 'Invalid deal type' }, { status: 400 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[POST /api/deals/.../comments] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
