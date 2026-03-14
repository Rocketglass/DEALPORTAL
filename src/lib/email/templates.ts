/**
 * Email templates for Resend.
 *
 * Each function returns { subject, html } ready for the Resend API.
 * Templates use table-based HTML for maximum email client compatibility
 * and inline styles for consistent rendering.
 */

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.rocketrealty.com';

// ---------------------------------------------------------------------------
// Shared layout helpers
// ---------------------------------------------------------------------------

const BRAND_COLOR = '#1e40af';
const TEXT_COLOR = '#0f172a';
const MUTED_COLOR = '#64748b';
const BG_COLOR = '#f8fafc';
const BORDER_COLOR = '#e2e8f0';

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rocket Realty</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_COLOR};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER_COLOR};">
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid ${BORDER_COLOR};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:18px;font-weight:700;color:${BRAND_COLOR};letter-spacing:-0.02em;">ROCKET REALTY</span>
                    <br />
                    <span style="font-size:12px;color:${MUTED_COLOR};">Commercial Real Estate Brokerage</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid ${BORDER_COLOR};background-color:${BG_COLOR};">
              <p style="margin:0;font-size:12px;color:${MUTED_COLOR};line-height:1.5;text-align:center;">
                Rocket Realty &middot; San Diego, CA<br />
                This is an automated message from the Rocket Realty Deal Flow Portal.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="border-radius:8px;background-color:${BRAND_COLOR};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${TEXT_COLOR};line-height:1.3;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;color:${TEXT_COLOR};line-height:1.6;">${text}</p>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:6px 0;font-size:13px;color:${MUTED_COLOR};width:140px;vertical-align:top;">${label}</td>
  <td style="padding:6px 0;font-size:13px;color:${TEXT_COLOR};font-weight:500;">${value}</td>
</tr>`;
}

function detailsTable(rows: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border:1px solid ${BORDER_COLOR};border-radius:8px;overflow:hidden;">
  <tr><td style="padding:16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${rows}
    </table>
  </td></tr>
</table>`;
}

// ---------------------------------------------------------------------------
// 1. Application received — sent to broker
// ---------------------------------------------------------------------------

interface ApplicationReceivedData {
  brokerName: string;
  applicantName: string;
  businessName: string;
  propertyAddress: string;
  suiteNumber?: string;
  applicationId: string;
}

export function applicationReceived(data: ApplicationReceivedData): {
  subject: string;
  html: string;
} {
  return {
    subject: `New Application: ${data.businessName} — ${data.propertyAddress}`,
    html: layout(`
      ${heading('New Application Submitted')}
      ${paragraph(`Hi ${data.brokerName},`)}
      ${paragraph(`<strong>${data.applicantName}</strong> has submitted a lease application for review.`)}
      ${detailsTable(`
        ${detailRow('Business', data.businessName)}
        ${detailRow('Property', data.propertyAddress)}
        ${data.suiteNumber ? detailRow('Suite', data.suiteNumber) : ''}
      `)}
      ${paragraph('Review the application and supporting documents in the portal.')}
      ${ctaButton('Review Application', `${PORTAL_URL}/applications/${data.applicationId}`)}
    `),
  };
}

// ---------------------------------------------------------------------------
// 2. Application status update — sent to tenant
// ---------------------------------------------------------------------------

interface ApplicationStatusUpdateData {
  tenantName: string;
  businessName: string;
  propertyAddress: string;
  status: 'approved' | 'rejected' | 'info_requested';
  message?: string;
  applicationId: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: '#16a34a' },
  rejected: { label: 'Not Approved', color: '#dc2626' },
  info_requested: { label: 'Additional Information Requested', color: '#d97706' },
};

export function applicationStatusUpdate(
  data: ApplicationStatusUpdateData,
): { subject: string; html: string } {
  const statusCfg = STATUS_LABELS[data.status];
  return {
    subject: `Application Update: ${statusCfg.label} — ${data.propertyAddress}`,
    html: layout(`
      ${heading('Application Status Update')}
      ${paragraph(`Hi ${data.tenantName},`)}
      ${paragraph(`Your lease application for <strong>${data.propertyAddress}</strong> has been updated.`)}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
        <tr>
          <td style="padding:8px 16px;border-radius:6px;background-color:${statusCfg.color}15;font-size:14px;font-weight:600;color:${statusCfg.color};">
            ${statusCfg.label}
          </td>
        </tr>
      </table>
      ${data.message ? paragraph(data.message) : ''}
      ${ctaButton('View Application', `${PORTAL_URL}/applications/${data.applicationId}`)}
    `),
  };
}

// ---------------------------------------------------------------------------
// 3. LOI sent to landlord
// ---------------------------------------------------------------------------

interface LoiSentToLandlordData {
  landlordName: string;
  tenantBusinessName: string;
  propertyAddress: string;
  suiteNumber: string;
  brokerName: string;
  loiId: string;
}

export function loiSentToLandlord(data: LoiSentToLandlordData): {
  subject: string;
  html: string;
} {
  return {
    subject: `Letter of Intent: ${data.tenantBusinessName} — ${data.propertyAddress}`,
    html: layout(`
      ${heading('Letter of Intent for Your Review')}
      ${paragraph(`Dear ${data.landlordName},`)}
      ${paragraph(`${data.brokerName} has submitted a Letter of Intent on behalf of <strong>${data.tenantBusinessName}</strong> for your property.`)}
      ${detailsTable(`
        ${detailRow('Property', data.propertyAddress)}
        ${detailRow('Suite', data.suiteNumber)}
        ${detailRow('Prospective Tenant', data.tenantBusinessName)}
        ${detailRow('Broker', data.brokerName)}
      `)}
      ${paragraph('Please review the proposed terms. You can accept, counter, or reject each section individually.')}
      ${ctaButton('Review LOI', `${PORTAL_URL}/lois/${data.loiId}`)}
    `),
  };
}

// ---------------------------------------------------------------------------
// 4. LOI countered — sent to broker
// ---------------------------------------------------------------------------

interface LoiCounteredData {
  brokerName: string;
  landlordName: string;
  propertyAddress: string;
  suiteNumber: string;
  sectionsCountered: string[];
  loiId: string;
}

export function loiCountered(data: LoiCounteredData): {
  subject: string;
  html: string;
} {
  const sectionsList = data.sectionsCountered
    .map((s) => `<li style="margin:4px 0;font-size:14px;color:${TEXT_COLOR};">${s}</li>`)
    .join('');

  return {
    subject: `LOI Counter: ${data.landlordName} — ${data.propertyAddress}`,
    html: layout(`
      ${heading('Landlord Has Countered')}
      ${paragraph(`Hi ${data.brokerName},`)}
      ${paragraph(`<strong>${data.landlordName}</strong> has countered the following sections of the LOI for ${data.propertyAddress}, ${data.suiteNumber}:`)}
      <ul style="margin:0 0 16px;padding-left:20px;">
        ${sectionsList}
      </ul>
      ${paragraph('Review the counter-proposals and respond in the portal.')}
      ${ctaButton('View LOI Negotiations', `${PORTAL_URL}/lois/${data.loiId}`)}
    `),
  };
}

// ---------------------------------------------------------------------------
// 5. LOI agreed — sent to all parties
// ---------------------------------------------------------------------------

interface LoiAgreedData {
  recipientName: string;
  propertyAddress: string;
  suiteNumber: string;
  tenantBusinessName: string;
  loiId: string;
}

export function loiAgreed(data: LoiAgreedData): {
  subject: string;
  html: string;
} {
  return {
    subject: `LOI Fully Agreed: ${data.propertyAddress}, ${data.suiteNumber}`,
    html: layout(`
      ${heading('Letter of Intent — Fully Agreed')}
      ${paragraph(`Dear ${data.recipientName},`)}
      ${paragraph(`All terms of the Letter of Intent for <strong>${data.propertyAddress}, ${data.suiteNumber}</strong> have been agreed upon by all parties.`)}
      ${detailsTable(`
        ${detailRow('Property', `${data.propertyAddress}, ${data.suiteNumber}`)}
        ${detailRow('Tenant', data.tenantBusinessName)}
        ${detailRow('Status', '<span style="color:#16a34a;font-weight:600;">Fully Agreed</span>')}
      `)}
      ${paragraph('The next step is lease preparation. You will be notified when the lease is ready for review and signature.')}
      ${ctaButton('View Agreed LOI', `${PORTAL_URL}/lois/${data.loiId}`)}
    `),
  };
}

// ---------------------------------------------------------------------------
// 6. Lease ready for signature
// ---------------------------------------------------------------------------

interface LeaseReadyForSignatureData {
  recipientName: string;
  propertyAddress: string;
  suiteNumber: string;
  signingRole: 'tenant' | 'landlord' | 'guarantor';
  leaseId: string;
}

export function leaseReadyForSignature(
  data: LeaseReadyForSignatureData,
): { subject: string; html: string } {
  return {
    subject: `Lease Ready for Signature: ${data.propertyAddress}, ${data.suiteNumber}`,
    html: layout(`
      ${heading('Lease Ready for Your Signature')}
      ${paragraph(`Dear ${data.recipientName},`)}
      ${paragraph(`The lease agreement for <strong>${data.propertyAddress}, ${data.suiteNumber}</strong> is ready for your signature.`)}
      ${detailsTable(`
        ${detailRow('Property', `${data.propertyAddress}, ${data.suiteNumber}`)}
        ${detailRow('Your Role', data.signingRole.charAt(0).toUpperCase() + data.signingRole.slice(1))}
      `)}
      ${paragraph('You will receive a separate DocuSign email with the signing link. You can also access the lease details in the portal below.')}
      ${ctaButton('View Lease Details', `${PORTAL_URL}/leases/${data.leaseId}`)}
    `),
  };
}

// ---------------------------------------------------------------------------
// 7. Lease executed — sent to all parties
// ---------------------------------------------------------------------------

interface LeaseExecutedData {
  recipientName: string;
  propertyAddress: string;
  suiteNumber: string;
  tenantBusinessName: string;
  commencementDate: string;
  leaseId: string;
}

export function leaseExecuted(data: LeaseExecutedData): {
  subject: string;
  html: string;
} {
  return {
    subject: `Lease Executed: ${data.propertyAddress}, ${data.suiteNumber}`,
    html: layout(`
      ${heading('Lease Fully Executed')}
      ${paragraph(`Dear ${data.recipientName},`)}
      ${paragraph(`The lease agreement for <strong>${data.propertyAddress}, ${data.suiteNumber}</strong> has been fully signed by all parties.`)}
      ${detailsTable(`
        ${detailRow('Property', `${data.propertyAddress}, ${data.suiteNumber}`)}
        ${detailRow('Tenant', data.tenantBusinessName)}
        ${detailRow('Commencement', data.commencementDate)}
        ${detailRow('Status', '<span style="color:#16a34a;font-weight:600;">Executed</span>')}
      `)}
      ${paragraph('A copy of the executed lease is available for download in the portal.')}
      ${ctaButton('View Executed Lease', `${PORTAL_URL}/leases/${data.leaseId}`)}
    `),
  };
}

// ---------------------------------------------------------------------------
// 8. Invoice sent — sent to landlord
// ---------------------------------------------------------------------------

interface InvoiceSentData {
  landlordName: string;
  invoiceNumber: string;
  propertyAddress: string;
  suiteNumber: string;
  commissionAmount: string;
  dueDate: string;
  invoiceId: string;
}

export function invoiceSent(data: InvoiceSentData): {
  subject: string;
  html: string;
} {
  return {
    subject: `Commission Invoice ${data.invoiceNumber}: ${data.propertyAddress}`,
    html: layout(`
      ${heading('Commission Invoice')}
      ${paragraph(`Dear ${data.landlordName},`)}
      ${paragraph(`Please find attached the commission invoice for the recently executed lease at <strong>${data.propertyAddress}, ${data.suiteNumber}</strong>.`)}
      ${detailsTable(`
        ${detailRow('Invoice #', data.invoiceNumber)}
        ${detailRow('Property', `${data.propertyAddress}, ${data.suiteNumber}`)}
        ${detailRow('Commission Due', `<strong>${data.commissionAmount}</strong>`)}
        ${detailRow('Due Date', data.dueDate)}
      `)}
      ${paragraph('You can view the full invoice and payment instructions in the portal.')}
      ${ctaButton('View Invoice', `${PORTAL_URL}/invoices/${data.invoiceId}`)}
    `),
  };
}
