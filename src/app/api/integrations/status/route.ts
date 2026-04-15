import { NextResponse } from 'next/server';
import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

export async function GET() {
  try {
    await requireBrokerOrAdminForApi();
  } catch (authError) {
    return NextResponse.json(
      { error: (authError as Error).message },
      { status: 401 },
    );
  }

  return NextResponse.json({
    supabase: true, // If the app is running, Supabase is connected
    docusign: !!(
      process.env.DOCUSIGN_INTEGRATION_KEY ||
      process.env.NEXT_PUBLIC_DOCUSIGN_CONFIGURED
    ),
    resend: !!process.env.RESEND_API_KEY,
  });
}
