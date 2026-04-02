/**
 * POST /api/lois/[id]/review-token
 *
 * Generates an HMAC-signed review token for a given LOI.
 * Requires broker/admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';
import { generateLoiReviewToken } from '@/lib/security/loi-token';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    try {
      await requireBrokerOrAdminForApi();
    } catch (authError) {
      return NextResponse.json(
        { error: (authError as Error).message },
        { status: 401 },
      );
    }

    const { id: loiId } = await params;
    const token = generateLoiReviewToken(loiId);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('[POST /api/lois/[id]/review-token] Error:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
