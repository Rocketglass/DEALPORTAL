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
 * @param leaseId        UUID of the executed lease
 * @param overrideRate   Optional commission rate override (e.g. 5.0 for 5%).
 *                       If provided, this is used instead of the default
 *                       property-type-based rate.
 * @param splitPercent   Our share of the total commission (default 100 = full).
 *                       E.g. 50 means we get half of the total commission.
 * @param splitWithAgent Name of the cooperating agent/brokerage (nullable).
 * @returns The created CommissionInvoice row
 *
 * @throws Error if the lease cannot be found, or if the DB insert fails
 */
export async function generateCommissionInvoice(
  leaseId: string,
  overrideRate?: number,
  splitPercent?: number,
  splitWithAgent?: string,
): Promise<CommissionInvoice> {
  const supabase = getServiceClient();

  // ------------------------------------------------------------------
  // 0. Idempotency guard: never generate a second invoice for a lease.
  //    The webhook (redeliverable), mark-executed-offline, and the manual
  //    /api/invoices/generate route can each reach this function for the
  //    same lease. lease_id has no NOT NULL / UNIQUE guarantee (nullable
  //    since migration 016 for manual invoices), so check explicitly.
  //    A partial unique index (migration 028) backs this up against races;
  //    the insert below also catches the 23505 unique violation.
  // ------------------------------------------------------------------
  const { data: existingInvoice } = await supabase
    .from('commission_invoices')
    .select('*')
    .eq('lease_id', leaseId)
    .limit(1)
    .maybeSingle();

  if (existingInvoice) {
    console.log(
      `[generateCommissionInvoice] Invoice ${(existingInvoice as CommissionInvoice).invoice_number}` +
        ` already exists for lease ${leaseId} — returning existing, not creating a duplicate`,
    );
    return existingInvoice as CommissionInvoice;
  }

  // ------------------------------------------------------------------
  // 1. Fetch lease with all relations needed to compute the invoice
  // ------------------------------------------------------------------
  const { data: leaseData, error: leaseError } = await supabase
    .from('leases')
    .select(`
      *,
      property:properties(*),
      unit:units!leases_unit_id_fkey(*),
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
  const propertyType = (lease.property as { property_type?: string } | null)?.property_type ?? 'industrial';
  const commissionRate = overrideRate ?? getDefaultCommissionRate(
    propertyType as Parameters<typeof getDefaultCommissionRate>[0],
  );

  // ------------------------------------------------------------------
  // 3. Get the next invoice number
  // ------------------------------------------------------------------
  // Compute the highest RR-N sequence numerically. A lexicographic sort ranks
  // "RR-9" above "RR-10", so past RR-99 a string order would reuse numbers.
  const { data: invoiceNumbers } = await supabase
    .from('commission_invoices')
    .select('invoice_number');

  let maxSequence = 0;
  for (const row of invoiceNumbers ?? []) {
    const match = row.invoice_number?.match(/^RR-(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxSequence) maxSequence = n;
    }
  }
  const nextSequence = maxSequence + 1;

  // ------------------------------------------------------------------
  // 4. Build the invoice insert payload using the pure logic function
  // ------------------------------------------------------------------
  const invoicePayload = buildInvoicePayload(
    lease,
    commissionRate,
    nextSequence,
    lease.landlord ?? null,
    lease.escalations ?? [],
    splitPercent ?? 100,
    splitWithAgent ?? null,
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
    // A concurrent caller may have inserted the invoice between our existence
    // check above and this insert. The partial unique index on lease_id
    // (migration 028) rejects the duplicate with Postgres 23505 — recover by
    // returning the invoice the other caller created rather than erroring.
    if (insertError?.code === '23505') {
      const { data: raced } = await supabase
        .from('commission_invoices')
        .select('*')
        .eq('lease_id', leaseId)
        .limit(1)
        .maybeSingle();
      if (raced) {
        console.log(
          `[generateCommissionInvoice] Lost insert race for lease ${leaseId} —` +
            ` returning invoice ${(raced as CommissionInvoice).invoice_number} created concurrently`,
        );
        return raced as CommissionInvoice;
      }
    }
    throw new Error(
      `generateCommissionInvoice: failed to insert invoice for lease ${leaseId} — ${insertError?.message ?? 'no data'}`,
    );
  }

  console.log(
    `[generateCommissionInvoice] Invoice ${created.invoice_number} created for lease ${leaseId}`,
  );

  return created as CommissionInvoice;
}
