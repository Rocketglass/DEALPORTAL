/**
 * DocuSign integration for Rocket Realty Deal Flow Portal.
 *
 * Implements JWT Grant authentication and envelope management
 * using the DocuSign REST API v2.1.
 */

import { SignJWT, importPKCS8 } from 'jose';
import type { Lease } from '@/types/database';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DOCUSIGN_CONFIG = {
  accountId: process.env.DOCUSIGN_ACCOUNT_ID ?? '',
  baseUrl: (process.env.DOCUSIGN_BASE_URL ?? 'https://demo.docusign.net/restapi').replace(/\/+$/, ''),
  integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY ?? '',
  rsaPrivateKey: process.env.DOCUSIGN_RSA_PRIVATE_KEY ?? '',
  userId: process.env.DOCUSIGN_USER_ID ?? '',
  /** Demo vs production auth server */
  authServer: (process.env.DOCUSIGN_BASE_URL ?? '').includes('demo')
    ? 'account-d.docusign.com'
    : 'account.docusign.com',
};

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface DocuSignRecipient {
  recipientId: string;
  recipientIdGuid?: string;
  routingOrder: string;
  roleName: string;
  name: string;
  email: string;
  status: DocuSignRecipientStatus;
  signedDateTime?: string;
  deliveredDateTime?: string;
  sentDateTime?: string;
}

export type DocuSignRecipientStatus =
  | 'created'
  | 'sent'
  | 'delivered'
  | 'signed'
  | 'completed'
  | 'declined'
  | 'voided';

export type DocuSignEnvelopeStatus =
  | 'created'
  | 'sent'
  | 'delivered'
  | 'completed'
  | 'declined'
  | 'voided';

export interface DocuSignEnvelopeResponse {
  envelopeId: string;
  status: DocuSignEnvelopeStatus;
  statusChangedDateTime: string;
  uri: string;
}

export interface DocuSignEnvelopeStatusResponse {
  envelopeId: string;
  status: DocuSignEnvelopeStatus;
  statusChangedDateTime: string;
  sentDateTime?: string;
  completedDateTime?: string;
  voidedDateTime?: string;
  voidedReason?: string;
  recipients: {
    signers: DocuSignRecipient[];
  };
}

export interface CreateEnvelopePayload {
  emailSubject: string;
  emailBlurb: string;
  status: 'created' | 'sent';
  documents: Array<{
    documentBase64: string;
    name: string;
    fileExtension: string;
    documentId: string;
    order: string;
  }>;
  recipients: {
    signers: Array<{
      recipientId: string;
      routingOrder: string;
      roleName: string;
      name: string;
      email: string;
      tabs?: {
        signHereTabs?: Array<{
          documentId: string;
          pageNumber: string;
          xPosition: string;
          yPosition: string;
        }>;
        dateSignedTabs?: Array<{
          documentId: string;
          pageNumber: string;
          xPosition: string;
          yPosition: string;
        }>;
      };
    }>;
  };
}

// ---------------------------------------------------------------------------
// Token cache
// ---------------------------------------------------------------------------

let cachedToken: { token: string; expiresAt: number } | null = null;

// ---------------------------------------------------------------------------
// JWT Grant authentication
// ---------------------------------------------------------------------------

/**
 * Parse the RSA private key from the environment variable.
 * Handles both newline-escaped strings and raw PEM format.
 */
function parsePrivateKey(): string {
  let key = DOCUSIGN_CONFIG.rsaPrivateKey;

  // Handle \\n escaped newlines from env vars
  key = key.replace(/\\n/g, '\n');

  // Ensure PEM headers are present
  if (!key.includes('-----BEGIN')) {
    key = `-----BEGIN RSA PRIVATE KEY-----\n${key}\n-----END RSA PRIVATE KEY-----`;
  }

  return key.trim();
}

/**
 * Obtain a DocuSign access token using JWT Grant flow.
 *
 * 1. Create a JWT assertion signed with the RSA private key
 * 2. POST to DocuSign OAuth token endpoint
 * 3. Cache the token until near expiry
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5-minute buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300_000) {
    return cachedToken.token;
  }

  if (!DOCUSIGN_CONFIG.integrationKey || !DOCUSIGN_CONFIG.userId || !DOCUSIGN_CONFIG.rsaPrivateKey) {
    throw new Error(
      'DocuSign not configured. Set DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, and DOCUSIGN_RSA_PRIVATE_KEY.',
    );
  }

  const pemKey = parsePrivateKey();
  const privateKey = await importPKCS8(pemKey, 'RS256');

  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({
    iss: DOCUSIGN_CONFIG.integrationKey,
    sub: DOCUSIGN_CONFIG.userId,
    aud: DOCUSIGN_CONFIG.authServer,
    scope: 'signature impersonation',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const response = await fetch(
    `https://${DOCUSIGN_CONFIG.authServer}/oauth/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `DocuSign OAuth error ${response.status}: ${errorBody}. ` +
      'If this is first use, the user may need to grant consent. ' +
      `Visit: https://${DOCUSIGN_CONFIG.authServer}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${DOCUSIGN_CONFIG.integrationKey}&redirect_uri=https://localhost`,
    );
  }

  const data = await response.json();
  const accessToken: string = data.access_token;
  const expiresIn: number = data.expires_in ?? 3600;

  cachedToken = {
    token: accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return accessToken;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

function apiUrl(path: string): string {
  return `${DOCUSIGN_CONFIG.baseUrl}/v2.1/accounts/${DOCUSIGN_CONFIG.accountId}${path}`;
}

async function docuSignFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const accessToken = await getAccessToken();

  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DocuSign API error ${response.status}: ${errorBody}`);
  }

  return response;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a DocuSign envelope for a lease with signing order:
 *   1. Tenant
 *   2. Landlord
 *   3. Guarantor (if present)
 */
export async function createEnvelope(
  lease: Lease & {
    tenant_email: string;
    tenant_name: string;
    landlord_email: string;
    landlord_name: string;
    guarantor_email?: string;
    guarantor_name?: string;
  },
  leasePdfBase64: string,
): Promise<DocuSignEnvelopeResponse> {
  const signers: CreateEnvelopePayload['recipients']['signers'] = [
    {
      recipientId: '1',
      routingOrder: '1',
      roleName: 'Tenant',
      name: lease.tenant_name,
      email: lease.tenant_email,
      tabs: {
        signHereTabs: [
          { documentId: '1', pageNumber: 'last', xPosition: '100', yPosition: '600' },
        ],
        dateSignedTabs: [
          { documentId: '1', pageNumber: 'last', xPosition: '300', yPosition: '600' },
        ],
      },
    },
    {
      recipientId: '2',
      routingOrder: '2',
      roleName: 'Landlord',
      name: lease.landlord_name,
      email: lease.landlord_email,
      tabs: {
        signHereTabs: [
          { documentId: '1', pageNumber: 'last', xPosition: '100', yPosition: '500' },
        ],
        dateSignedTabs: [
          { documentId: '1', pageNumber: 'last', xPosition: '300', yPosition: '500' },
        ],
      },
    },
  ];

  if (lease.guarantor_email && lease.guarantor_name) {
    signers.push({
      recipientId: '3',
      routingOrder: '3',
      roleName: 'Guarantor',
      name: lease.guarantor_name,
      email: lease.guarantor_email,
      tabs: {
        signHereTabs: [
          { documentId: '1', pageNumber: 'last', xPosition: '100', yPosition: '400' },
        ],
        dateSignedTabs: [
          { documentId: '1', pageNumber: 'last', xPosition: '300', yPosition: '400' },
        ],
      },
    });
  }

  const payload: CreateEnvelopePayload = {
    emailSubject: `Lease Agreement: ${lease.premises_address} — Please Sign`,
    emailBlurb:
      'Please review and sign the attached lease agreement. Contact your broker if you have any questions.',
    status: 'sent',
    documents: [
      {
        documentBase64: leasePdfBase64,
        name: `Lease-${lease.premises_address}.pdf`,
        fileExtension: 'pdf',
        documentId: '1',
        order: '1',
      },
    ],
    recipients: { signers },
  };

  const response = await docuSignFetch('/envelopes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.json() as Promise<DocuSignEnvelopeResponse>;
}

/**
 * Retrieve the current status of a DocuSign envelope including recipient signing statuses.
 */
export async function getEnvelopeStatus(
  envelopeId: string,
): Promise<DocuSignEnvelopeStatusResponse> {
  const response = await docuSignFetch(
    `/envelopes/${envelopeId}?include=recipients`,
  );

  return response.json() as Promise<DocuSignEnvelopeStatusResponse>;
}

/**
 * Download the completed/signed document from an envelope.
 * Returns the PDF as a Buffer.
 */
export async function getEnvelopeDocument(
  envelopeId: string,
  documentId: string = 'combined',
): Promise<ArrayBuffer> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    apiUrl(`/envelopes/${envelopeId}/documents/${documentId}`),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/pdf',
      },
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DocuSign document download error ${response.status}: ${errorBody}`);
  }

  return response.arrayBuffer();
}

/**
 * Void an existing envelope (cancel signing).
 */
export async function voidEnvelope(
  envelopeId: string,
  reason: string,
): Promise<void> {
  await docuSignFetch(`/envelopes/${envelopeId}`, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'voided',
      voidedReason: reason,
    }),
  });
}

/**
 * Check if DocuSign is configured with all required credentials.
 */
export function isDocuSignConfigured(): boolean {
  return !!(
    DOCUSIGN_CONFIG.accountId &&
    DOCUSIGN_CONFIG.integrationKey &&
    DOCUSIGN_CONFIG.userId &&
    DOCUSIGN_CONFIG.rsaPrivateKey
  );
}
