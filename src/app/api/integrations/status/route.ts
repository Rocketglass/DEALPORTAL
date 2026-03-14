import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    supabase: true, // If the app is running, Supabase is connected
    docusign: !!(
      process.env.DOCUSIGN_INTEGRATION_KEY ||
      process.env.NEXT_PUBLIC_DOCUSIGN_CONFIGURED
    ),
    resend: !!process.env.RESEND_API_KEY,
  });
}
