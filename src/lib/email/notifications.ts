/**
 * High-level notification functions for the Rocket Realty portal.
 *
 * Each function composes a template with the sendEmail utility.
 * All functions are fire-and-forget — errors are logged, never thrown.
 */

import { sendEmail } from './send';
import {
  applicationReceived,
  applicationStatusUpdate,
  loiSentToLandlord,
  loiCountered,
  loiAgreed,
  leaseReadyForSignature,
  leaseExecuted,
  invoiceSent,
} from './templates';

// ---------------------------------------------------------------------------
// Type aliases — mirrors the shape of portal DB records passed in from callers.
// Only the fields each template actually needs are required here; callers
// can pass richer objects and the extras are simply ignored.
// ---------------------------------------------------------------------------

interface ApplicationForNotification {
  id: string;
  applicantName: string;
  businessName: string;
  propertyAddress: string;
  suiteNumber?: string;
}

interface LoiForNotification {
  id: string;
  tenantBusinessName: string;
  propertyAddress: string;
  suiteNumber: string;
  brokerName: string;
  landlordName: string;
  sectionsCountered?: string[];
}

interface LeaseForNotification {
  id: string;
  propertyAddress: string;
  suiteNumber: string;
  tenantBusinessName: string;
  commencementDate: string;
}

interface SignerForNotification {
  email: string;
  name: string;
  role: 'tenant' | 'landlord' | 'guarantor';
}

interface PartyForNotification {
  email: string;
  name: string;
}

interface InvoiceForNotification {
  id: string;
  invoiceNumber: string;
  propertyAddress: string;
  suiteNumber: string;
  commissionAmount: string;
  dueDate: string;
}

// ---------------------------------------------------------------------------
// 1. Application received — sent to broker when tenant submits
// ---------------------------------------------------------------------------

export async function notifyApplicationReceived(
  application: ApplicationForNotification,
  brokerEmail: string,
  brokerName: string,
): Promise<void> {
  const { subject, html } = applicationReceived({
    brokerName,
    applicantName: application.applicantName,
    businessName: application.businessName,
    propertyAddress: application.propertyAddress,
    suiteNumber: application.suiteNumber,
    applicationId: application.id,
  });

  await sendEmail({ to: brokerEmail, subject, html });
}

// ---------------------------------------------------------------------------
// 2. Application status update — sent to tenant
// ---------------------------------------------------------------------------

export async function notifyApplicationStatusUpdate(
  application: ApplicationForNotification,
  tenantEmail: string,
  status: 'approved' | 'rejected' | 'info_requested',
  notes?: string,
): Promise<void> {
  const { subject, html } = applicationStatusUpdate({
    tenantName: application.applicantName,
    businessName: application.businessName,
    propertyAddress: application.propertyAddress,
    status,
    message: notes,
    applicationId: application.id,
  });

  await sendEmail({ to: tenantEmail, subject, html });
}

// ---------------------------------------------------------------------------
// 3. LOI sent to landlord
// ---------------------------------------------------------------------------

export async function notifyLoiSentToLandlord(
  loi: LoiForNotification,
  landlordEmail: string,
): Promise<void> {
  const { subject, html } = loiSentToLandlord({
    landlordName: loi.landlordName,
    tenantBusinessName: loi.tenantBusinessName,
    propertyAddress: loi.propertyAddress,
    suiteNumber: loi.suiteNumber,
    brokerName: loi.brokerName,
    loiId: loi.id,
  });

  await sendEmail({ to: landlordEmail, subject, html });
}

// ---------------------------------------------------------------------------
// 4. LOI countered — sent to broker
// ---------------------------------------------------------------------------

export async function notifyLoiCountered(
  loi: LoiForNotification,
  brokerEmail: string,
): Promise<void> {
  const { subject, html } = loiCountered({
    brokerName: loi.brokerName,
    landlordName: loi.landlordName,
    propertyAddress: loi.propertyAddress,
    suiteNumber: loi.suiteNumber,
    sectionsCountered: loi.sectionsCountered ?? [],
    loiId: loi.id,
  });

  await sendEmail({ to: brokerEmail, subject, html });
}

// ---------------------------------------------------------------------------
// 5. LOI agreed — sent to all parties
// ---------------------------------------------------------------------------

export async function notifyLoiAgreed(
  loi: LoiForNotification,
  parties: PartyForNotification[],
): Promise<void> {
  await Promise.all(
    parties.map(({ email, name }) => {
      const { subject, html } = loiAgreed({
        recipientName: name,
        propertyAddress: loi.propertyAddress,
        suiteNumber: loi.suiteNumber,
        tenantBusinessName: loi.tenantBusinessName,
        loiId: loi.id,
      });
      return sendEmail({ to: email, subject, html });
    }),
  );
}

// ---------------------------------------------------------------------------
// 6. Lease ready for signature — sent to each signer individually
// ---------------------------------------------------------------------------

export async function notifyLeaseReadyForSignature(
  lease: LeaseForNotification,
  signers: SignerForNotification[],
): Promise<void> {
  await Promise.all(
    signers.map(({ email, name, role }) => {
      const { subject, html } = leaseReadyForSignature({
        recipientName: name,
        propertyAddress: lease.propertyAddress,
        suiteNumber: lease.suiteNumber,
        signingRole: role,
        leaseId: lease.id,
      });
      return sendEmail({ to: email, subject, html });
    }),
  );
}

// ---------------------------------------------------------------------------
// 7. Lease executed — sent to all parties
// ---------------------------------------------------------------------------

export async function notifyLeaseExecuted(
  lease: LeaseForNotification,
  parties: PartyForNotification[],
): Promise<void> {
  await Promise.all(
    parties.map(({ email, name }) => {
      const { subject, html } = leaseExecuted({
        recipientName: name,
        propertyAddress: lease.propertyAddress,
        suiteNumber: lease.suiteNumber,
        tenantBusinessName: lease.tenantBusinessName,
        commencementDate: lease.commencementDate,
        leaseId: lease.id,
      });
      return sendEmail({ to: email, subject, html });
    }),
  );
}

// ---------------------------------------------------------------------------
// 8. Invoice sent — sent to payee (landlord)
// ---------------------------------------------------------------------------

export async function notifyInvoiceSent(
  invoice: InvoiceForNotification,
  payeeEmail: string,
  payeeName: string,
): Promise<void> {
  const { subject, html } = invoiceSent({
    landlordName: payeeName,
    invoiceNumber: invoice.invoiceNumber,
    propertyAddress: invoice.propertyAddress,
    suiteNumber: invoice.suiteNumber,
    commissionAmount: invoice.commissionAmount,
    dueDate: invoice.dueDate,
    invoiceId: invoice.id,
  });

  await sendEmail({ to: payeeEmail, subject, html });
}
