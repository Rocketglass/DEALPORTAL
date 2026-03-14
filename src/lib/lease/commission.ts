import type { Lease, CommissionInvoice, Contact, RentEscalation } from '@/types/database';
import { calculateTotalConsideration } from './generate';

type CommissionInvoiceInsert = Omit<CommissionInvoice, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};
type EscalationInsert = Omit<RentEscalation, 'id'> & { id?: string };

// ============================================================
// formatInvoiceNumber
// ============================================================

/**
 * Format a sequence number into the Rocket Realty invoice number format.
 * e.g. 1 -> "RR-01", 7 -> "RR-07", 42 -> "RR-42"
 */
export function formatInvoiceNumber(sequence: number): string {
  return `RR-${sequence.toString().padStart(2, '0')}`;
}

// ============================================================
// generateCommissionInvoice
// ============================================================

/**
 * Generate a commission invoice from a lease.
 *
 * Pure logic function — no database calls. Takes a lease and relevant
 * contacts and returns a CommissionInvoice insert object.
 *
 * @param lease             The lease to generate the invoice for
 * @param commissionRate    Commission rate as a percentage (e.g. 5 for 5%)
 * @param nextInvoiceNumber The next sequence number for invoice numbering
 * @param payee             The landlord/payee contact for billing
 * @param escalations       Optional escalation schedule for accurate total consideration
 */
export function generateCommissionInvoice(
  lease: Lease,
  commissionRate: number,
  nextInvoiceNumber: number,
  payee?: Contact | null,
  escalations?: EscalationInsert[],
): CommissionInvoiceInsert {
  // Calculate total term in months
  const termMonths = (lease.term_years ?? 0) * 12 + (lease.term_months ?? 0);

  // Calculate total consideration accounting for escalations
  const totalConsideration = calculateTotalConsideration(
    lease.base_rent_monthly,
    termMonths,
    escalations,
  );

  // Commission amount
  const commissionAmount = Math.round(totalConsideration * (commissionRate / 100) * 100) / 100;

  // Build payee address fields
  const payeeAddress = payee?.address || null;
  const payeeCityStateZip = payee
    ? [payee.city, payee.state, payee.zip].filter(Boolean).join(', ')
    : null;

  // Due date: 30 days from now
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice: CommissionInvoiceInsert = {
    lease_id: lease.id,
    invoice_number: formatInvoiceNumber(nextInvoiceNumber),
    broker_contact_id: lease.broker_contact_id,
    payee_contact_id: lease.landlord_contact_id,
    lease_term_months: termMonths,
    monthly_rent: lease.base_rent_monthly,
    total_consideration: totalConsideration,
    commission_rate_percent: commissionRate,
    commission_amount: commissionAmount,
    payee_name: payee ? (payee.company_name || [payee.first_name, payee.last_name].filter(Boolean).join(' ')) : lease.lessor_name,
    payee_address: payeeAddress,
    payee_city_state_zip: payeeCityStateZip || null,
    payment_instructions:
      'Please make check payable to:\nRocket Glass, Inc.\n1234 Commercial Blvd, Suite 200\nSan Diego, CA 92101\n\nOr wire to:\nBank: First Republic Bank\nRouting: XXXXXXXXX\nAccount: XXXXXXXXX\nRef: ' +
      formatInvoiceNumber(nextInvoiceNumber),
    status: 'draft',
    sent_date: null,
    due_date: dueDate.toISOString().slice(0, 10),
    paid_date: null,
    paid_amount: null,
    payment_method: null,
    payment_reference: null,
    pdf_url: null,
    notes: null,
  };

  return invoice;
}
