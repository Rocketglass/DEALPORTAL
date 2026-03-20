/**
 * Integration tests for the DocuSign webhook handler.
 *
 * Regression: CEO Review 2026-03-19 — webhook returned 200 on errors,
 * preventing DocuSign retries. Now returns 500 on real failures.
 *
 * Report: .gstack/projects/rocket-realty-portal/ceo-plans/2026-03-19-deal-flow-portal-review.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock setup — must happen before importing the route
// ---------------------------------------------------------------------------

// Track what queries are made so tests can control responses
let leaseQueryResult: { data: unknown; error: unknown } = { data: null, error: null };
let updateResult: { error: unknown } = { error: null };

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'leases') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(leaseQueryResult)),
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(leaseQueryResult)),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve(updateResult)),
        })),
      };
    }
    // audit_log, units, contacts — return success by default
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    };
  }),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/docusign/client', () => ({
  getEnvelopeDocument: vi.fn(() => Promise.resolve(Buffer.from('fake-pdf'))),
}));

vi.mock('@/lib/commission/generate-invoice', () => ({
  generateCommissionInvoice: vi.fn(() =>
    Promise.resolve({ invoice_number: 'RR-99' }),
  ),
}));

vi.mock('@/lib/email/notifications', () => ({
  notifyLeaseExecuted: vi.fn(),
}));

// Import AFTER mocks
import { POST } from '../webhooks/docusign/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePayload(event = 'envelope-completed', envelopeId = 'env-123') {
  return {
    event,
    apiVersion: 'v2.1',
    uri: '/test',
    retryCount: 0,
    configurationId: 1,
    generatedDateTime: new Date().toISOString(),
    data: {
      accountId: 'acc-1',
      userId: 'usr-1',
      envelopeId,
      envelopeSummary: {
        status: 'completed',
        emailSubject: 'Test Lease',
        completedDateTime: new Date().toISOString(),
        recipients: {
          signers: [
            {
              recipientId: '1',
              recipientIdGuid: 'guid-1',
              name: 'Test Tenant',
              email: 'tenant@test.com',
              status: 'completed',
              routingOrder: '1',
              signedDateTime: new Date().toISOString(),
            },
          ],
        },
      },
    },
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/webhooks/docusign', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const VALID_LEASE = {
  id: 'lease-1',
  status: 'pending_signature',
  property_id: 'prop-1',
  unit_id: 'unit-1',
  tenant_contact_id: 'contact-1',
  landlord_contact_id: 'contact-2',
  broker_contact_id: 'contact-3',
  premises_address: '2810 Via Orange Way',
  lessee_name: 'Test LLC',
  commencement_date: '2026-04-01',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DocuSign Webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    delete process.env.DOCUSIGN_CONNECT_HMAC_SECRET;
    leaseQueryResult = { data: null, error: null };
    updateResult = { error: null };
  });

  // -----------------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------------

  it('returns 200 on successful envelope-completed processing', async () => {
    leaseQueryResult = { data: { ...VALID_LEASE }, error: null };
    updateResult = { error: null };

    const response = await POST(makeRequest(makePayload()));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Idempotency
  // -----------------------------------------------------------------------

  it('returns 200 and skips for already-executed lease (idempotent)', async () => {
    leaseQueryResult = {
      data: { ...VALID_LEASE, status: 'executed' },
      error: null,
    };

    const response = await POST(makeRequest(makePayload()));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Error handling — must return 500 so DocuSign retries
  // -----------------------------------------------------------------------

  it('returns 500 when lease not found (triggers DocuSign retry)', async () => {
    leaseQueryResult = { data: null, error: { message: 'Not found' } };

    const response = await POST(makeRequest(makePayload()));
    expect(response.status).toBe(500);
  });

  // -----------------------------------------------------------------------
  // Signature verification
  // -----------------------------------------------------------------------

  it('returns 401 for invalid HMAC signature in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DOCUSIGN_CONNECT_HMAC_SECRET = 'test-secret';

    const req = new NextRequest('http://localhost:3000/api/webhooks/docusign', {
      method: 'POST',
      body: JSON.stringify(makePayload()),
      headers: {
        'Content-Type': 'application/json',
        'X-DocuSign-Signature-1': 'invalid-signature',
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  // -----------------------------------------------------------------------
  // Unhandled events
  // -----------------------------------------------------------------------

  it('returns 200 for unrecognized event types', async () => {
    const response = await POST(makeRequest(makePayload('envelope-voided')));
    expect(response.status).toBe(200);
  });
});
