/**
 * Tests for the withApiHandler wrapper utility.
 *
 * Regression: Eng Review 2026-03-19 — 280+ duplicate try-catch blocks
 * across API routes. This wrapper centralizes error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler, type HandlerContext } from '../handler';

// ---------------------------------------------------------------------------
// Mock auth guard
// ---------------------------------------------------------------------------

vi.mock('@/lib/security/auth-guard', () => ({
  requireBrokerOrAdminForApi: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}));

import { requireBrokerOrAdminForApi } from '@/lib/security/auth-guard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(method = 'GET', body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest('http://localhost:3000/api/test', init);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('withApiHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  it('calls handler and returns its response for public routes', async () => {
    const handler = vi.fn(async () =>
      NextResponse.json({ ok: true }),
    );

    const wrapped = withApiHandler(handler, { auth: 'public' });
    const response = await wrapped(makeRequest());

    expect(handler).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  it('provides auth user in context for broker routes', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com', role: 'broker', contactId: 'c-1' };
    vi.mocked(requireBrokerOrAdminForApi).mockResolvedValueOnce(mockUser);

    let capturedCtx: HandlerContext | null = null;
    const handler = vi.fn(async (_req: NextRequest, ctx: HandlerContext) => {
      capturedCtx = ctx;
      return NextResponse.json({ userId: ctx.user?.id });
    });

    const wrapped = withApiHandler(handler, { auth: 'broker' });
    await wrapped(makeRequest());

    expect(capturedCtx?.user).toEqual(mockUser);
  });

  it('returns 401 when auth fails for broker routes', async () => {
    vi.mocked(requireBrokerOrAdminForApi).mockRejectedValueOnce(
      new Error('Unauthorized: No session'),
    );

    const handler = vi.fn();
    const wrapped = withApiHandler(handler, { auth: 'broker' });
    const response = await wrapped(makeRequest());

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('catches unhandled errors and returns 500', async () => {
    const handler = vi.fn(async () => {
      throw new Error('Database connection failed');
    });

    const wrapped = withApiHandler(handler, { auth: 'public' });
    const response = await wrapped(makeRequest());

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Database connection failed');
  });

  it('provides serviceClient factory in context', async () => {
    let capturedCtx: HandlerContext | null = null;
    const handler = vi.fn(async (_req: NextRequest, ctx: HandlerContext) => {
      capturedCtx = ctx;
      return NextResponse.json({ ok: true });
    });

    const wrapped = withApiHandler(handler, { auth: 'public' });
    await wrapped(makeRequest());

    expect(capturedCtx?.serviceClient).toBeTypeOf('function');
    // Calling it should return a Supabase client
    const client = capturedCtx!.serviceClient();
    expect(client).toBeDefined();
  });
});
