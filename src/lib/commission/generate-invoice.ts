/**
 * Commission invoice generation orchestrator.
 *
 * This module sits between the pure calculation logic in
 * `src/lib/lease/commission.ts` and the database. It:
 *
 *  1. Fetches the lease with all required relations
 *  2. Calls the pure generateCommissionInvoice function to build the insert payload
 *  3. Gets the next sequential invoice number
 *  4. Persists the record and returns the created invoice
 *
 * Uses the Supabase service-role client so it can be called safely from
 * webhook handlers that run outside a user session.
 */

import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { CommissionInvoice, LeaseWithRelations } from '@/types/database';
import { generateCommissionInvoice as buildInvoicePayload } from '@/lib/lease/commission';
import { getDefaultCommissionRate } from '@/lib/commission/calculator';

// ---------------------------------------------------------------------------
// Service-role Supabase client (no user session required)
// ---------------------------------------------------------------------------

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role not configured');
  return createServiceClient(url, key);
}

// ---------------------------------------------------------------------------
// generateCommissionInvoice
// ---------------------------------------------------------------------------

/**
 * Orchestrate generating and persisting a commission invoice for a given lease.
 *
 * Called automatically by the DocuSign webhook when a lease is executed, and
 * also available via the manual `/api/invoices/generate` route for brokers.
 *
 * @param leaseId       UUID of the executed lease
 * @param overrideRate  Optional commission rate override (e.g. 5.0 for 5%).
 *                      If provided, this is used instead of the default
 *                      property-type-based rate.
 * @returns The created CommissionInvoice row
 *
 * @throws Error if the lease cannot be found, or if the DB insert fails
 */
export async function generateCommissionInvoice(
  leaseId: string,
  overrideRate?: number,
): Promise<CommissionInvoice> {
  const supabase = getServiceClient();

  // ------------------------------------------------------------------
  // 1. Fetch lease with all relations needed to compute the invoice
  // ------------------------------------------------------------------
  const { data: leaseData, error: leaseError } = await supabase
    .from('leases')
    .select(`
      *,
      property:properties(*),
      unit:units(*),
      tenant:contacts!leases_tenant_contact_id_fkey(*),
      landlord:contacts!leases_landlord_contact_id_fkey(*),
      broker:contacts!leases_broker_contact_id_fkey(*),
      escalations:rent_escalations(*)
    `)
    .eq('id', leaseId)
    .single();

  if (leaseError || !leaseData) {
    throw new Error(
      `generateCommissionInvoice: lease ${leaseId} not found — ${leaseError?.message ?? 'no data'}`,
    );
  }

  const lease = leaseData as LeaseWithRelations;

  // ------------------------------------------------------------------
  // 2. Determine commission rate
  //    Use the property type to pick a market-convention default rate.
  //    In the future this could come from a deal-specific field.
  // ------------------------------------------------------------------
  const propertyType = lease.property?.property_type ?? 'industrial';
  const commissionRate = overrideRate ?? getDefaultCommissionRate(
    propertyType as Parameters<typeof getDefaultCommissionRate>[0],
  );

  // ------------------------------------------------------------------
  // 3. Get the next invoice number
  // ------------------------------------------------------------------
  const { data: lastInvoice } = await supabase
    .from('commission_invoices')
    .select('invoice_number')
    .order('invoice_number', { ascending: false })
    .limit(1);

  let nextSequence = 1;
  if (lastInvoice && lastInvoice.length > 0) {
    const match = lastInvoice[0].invoice_number.match(/^RR-(\d+)$/);
    if (match) {
      nextSequence = parseInt(match[1], 10) + 1;
    }
  }

  // ------------------------------------------------------------------
  // 4. Build the invoice insert payload using the pure logic function
  // ------------------------------------------------------------------
  const invoicePayload = buildInvoicePayload(
    lease,
    commissionRate,
    nextSequence,
    lease.landlord ?? null,
    lease.escalations ?? [],
  );

  // ------------------------------------------------------------------
  // 5. Persist the invoice
  // ------------------------------------------------------------------
  const { data: created, error: insertError } = await supabase
    .from('commission_invoices')
    .insert(invoicePayload)
    .select()
    .single();

  if (insertError || !created) {
    throw new Error(
      `generateCommissionInvoice: failed to insert invoice for lease ${leaseId} — ${insertError?.message ?? 'no data'}`,
    );
  }

  console.log(
    `[generateCommissionInvoice] Invoice ${created.invoice_number} created for lease ${leaseId}`,
  );

  return created as CommissionInvoice;
}
