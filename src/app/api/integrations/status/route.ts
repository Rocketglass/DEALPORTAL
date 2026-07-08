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

  // Surface the integrations that fail SILENTLY when misconfigured so a broker
  // can spot a broken setup before it bites. Each of these degrades quietly:
  //  - resend unset          → outbound email is dropped with only a warning
  //  - rateLimiting unset     → rate limiting is disabled (fails open)
  //  - docusignWebhook unset  → the DocuSign Connect webhook rejects everything
  //  - gemini unset           → AI parse/draft routes return a soft failure
  return NextResponse.json({
    supabase: true, // If the app is running, Supabase is connected
    docusign: !!(
      process.env.DOCUSIGN_INTEGRATION_KEY ||
      process.env.NEXT_PUBLIC_DOCUSIGN_CONFIGURED
    ),
    docusignWebhook: !!process.env.DOCUSIGN_CONNECT_HMAC_SECRET,
    resend: !!process.env.RESEND_API_KEY,
    rateLimiting: !!(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ),
    gemini: !!process.env.GEMINI_API_KEY,
  });
}
