import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireBrokerOrAdminForApi, type AuthUser } from '@/lib/security/auth-guard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceClient = ReturnType<typeof createClient<any>>;

export interface HandlerContext {
  user: AuthUser | null;
  serviceClient: () => ServiceClient;
}

interface HandlerOptions {
  auth?: 'broker' | 'public';
}

function getServiceClient(): ServiceClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export function withApiHandler(
  handler: (req: NextRequest, ctx: HandlerContext) => Promise<NextResponse>,
  options: HandlerOptions = {},
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      let user: AuthUser | null = null;

      if (options.auth === 'broker') {
        try {
          user = await requireBrokerOrAdminForApi();
        } catch (authError) {
          return NextResponse.json(
            { error: (authError as Error).message },
            { status: 401 },
          );
        }
      }

      const ctx: HandlerContext = {
        user,
        serviceClient: getServiceClient,
      };

      return await handler(req, ctx);
    } catch (error) {
      const route = new URL(req.url).pathname;
      console.error(`[${req.method} ${route}] Unexpected error:`, error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      const status = message.startsWith('Unauthorized') || message.startsWith('Forbidden') ? 401 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  };
}
