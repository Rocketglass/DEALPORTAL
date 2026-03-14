/**
 * DocuSign integration scaffolding for Rocket Realty Deal Flow Portal.
 *
 * This module provides typed functions for creating and managing DocuSign
 * envelopes for lease signing. The actual API calls are stubbed with
 * TODO comments — replace with real DocuSign REST API v2.1 calls.
 *
 * DocuSign REST API docs: https://developers.docusign.com/docs/esign-rest-api/
 */

import type { Lease } from '@/types/database';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const _DOCUSIGN_CONFIG = {
  /** DocuSign account ID — set via environment variable */
  accountId: process.env.DOCUSIGN_ACCOUNT_ID ?? '',
  /** Base URL for DocuSign REST API (demo or production) */
  baseUrl:
    process.env.DOCUSIGN_BASE_URL ??
    'https://demo.docusign.net/restapi/v2.1',
  /** OAuth integration key */
  integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY ?? '',
  /** RSA private key for JWT auth (base64-encoded) */
  rsaPrivateKey: process.env.DOCUSIGN_RSA_PRIVATE_KEY ?? '',
  /** Impersonated user ID */
  userId: process.env.DOCUSIGN_USER_ID ?? '',
};

// ---------------------------------------------------------------------------
// Type definitions — DocuSign API response shapes
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

/** Payload shape for creating envelopes via DocuSign REST API */
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
// Internal: get access token
// ---------------------------------------------------------------------------

/**
 * Obtain a DocuSign access token using JWT grant flow.
 *
 * TODO: Implement JWT auth flow:
 * 1. Create JWT assertion with integration key, user ID, and scopes
 * 2. Sign with RSA private key
 * 3. POST to /oauth/token on account server
 * 4. Cache token until expiry
 */
async function getAccessToken(): Promise<string> {
  // TODO: Implement JWT Grant authentication
  // const jwt = createJwtAssertion({
  //   iss: DOCUSIGN_CONFIG.integrationKey,
  //   sub: DOCUSIGN_CONFIG.userId,
  //   aud: 'account-d.docusign.com', // or account.docusign.com for prod
  //   iat: Math.floor(Date.now() / 1000),
  //   exp: Math.floor(Date.now() / 1000) + 3600,
  //   scope: 'signature impersonation',
  // });
  //
  // const response = await fetch('https://account-d.docusign.com/oauth/token', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  //   body: new URLSearchParams({
  //     grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
  //     assertion: jwt,
  //   }),
  // });
  //
  // const data = await response.json();
  // return data.access_token;

  throw new Error(
    'DocuSign authentication not yet implemented. Set DOCUSIGN_* environment variables and implement JWT grant flow.',
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a DocuSign envelope for a lease, setting the signing order:
 *   1. Tenant
 *   2. Landlord
 *   3. Guarantor (if present)
 *
 * The lease PDF is attached as the primary document. Each signer receives
 * an email notification in routing order.
 *
 * @param lease — Full lease record with related contact info
 * @param leasePdfBase64 — Base64-encoded lease PDF
 * @returns The DocuSign envelope response with envelopeId
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
  const accessToken = await getAccessToken();

  const signers: CreateEnvelopePayload['recipients']['signers'] = [
    {
      recipientId: '1',
      routingOrder: '1',
      roleName: 'Tenant',
      name: lease.tenant_name,
      email: lease.tenant_email,
      tabs: {
        signHereTabs: [
          {
            documentId: '1',
            pageNumber: 'last',
            xPosition: '100',
            yPosition: '600',
          },
        ],
        dateSignedTabs: [
          {
            documentId: '1',
            pageNumber: 'last',
            xPosition: '300',
            yPosition: '600',
          },
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
          {
            documentId: '1',
            pageNumber: 'last',
            xPosition: '100',
            yPosition: '500',
          },
        ],
        dateSignedTabs: [
          {
            documentId: '1',
            pageNumber: 'last',
            xPosition: '300',
            yPosition: '500',
          },
        ],
      },
    },
  ];

  // Add guarantor as third signer if present
  if (lease.guarantor_email && lease.guarantor_name) {
    signers.push({
      recipientId: '3',
      routingOrder: '3',
      roleName: 'Guarantor',
      name: lease.guarantor_name,
      email: lease.guarantor_email,
      tabs: {
        signHereTabs: [
          {
            documentId: '1',
            pageNumber: 'last',
            xPosition: '100',
            yPosition: '400',
          },
        ],
        dateSignedTabs: [
          {
            documentId: '1',
            pageNumber: 'last',
            xPosition: '300',
            yPosition: '400',
          },
        ],
      },
    });
  }

  const payload: CreateEnvelopePayload = {
    emailSubject: `Lease Agreement: ${lease.premises_address} — Please Sign`,
    emailBlurb:
      'Please review and sign the attached lease agreement. Contact your broker if you have any questions.',
    status: 'sent', // Send immediately
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

  // TODO: Replace with actual DocuSign API call
  // const response = await fetch(
  //   `${DOCUSIGN_CONFIG.baseUrl}/accounts/${DOCUSIGN_CONFIG.accountId}/envelopes`,
  //   {
  //     method: 'POST',
  //     headers: {
  //       Authorization: `Bearer ${accessToken}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify(payload),
  //   },
  // );
  //
  // if (!response.ok) {
  //   const errorBody = await response.text();
  //   throw new Error(`DocuSign API error ${response.status}: ${errorBody}`);
  // }
  //
  // return response.json() as Promise<DocuSignEnvelopeResponse>;

  // Suppress unused variable warnings in stub
  void accessToken;
  void payload;

  throw new Error(
    'DocuSign createEnvelope not yet implemented. See TODO comments above.',
  );
}

/**
 * Retrieve the current status of a DocuSign envelope, including
 * individual recipient signing statuses.
 *
 * @param envelopeId — The DocuSign envelope ID
 * @returns Envelope status with recipients
 */
export async function getEnvelopeStatus(
  envelopeId: string,
): Promise<DocuSignEnvelopeStatusResponse> {
  const accessToken = await getAccessToken();

  // TODO: Replace with actual DocuSign API call
  // const response = await fetch(
  //   `${DOCUSIGN_CONFIG.baseUrl}/accounts/${DOCUSIGN_CONFIG.accountId}/envelopes/${envelopeId}?include=recipients`,
  //   {
  //     method: 'GET',
  //     headers: {
  //       Authorization: `Bearer ${accessToken}`,
  //       'Content-Type': 'application/json',
  //     },
  //   },
  // );
  //
  // if (!response.ok) {
  //   const errorBody = await response.text();
  //   throw new Error(`DocuSign API error ${response.status}: ${errorBody}`);
  // }
  //
  // return response.json() as Promise<DocuSignEnvelopeStatusResponse>;

  void accessToken;
  void envelopeId;

  throw new Error(
    'DocuSign getEnvelopeStatus not yet implemented. See TODO comments above.',
  );
}
