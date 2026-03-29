import { createClient } from '@/lib/supabase/server';
import type {
  Database,
  CommissionInvoice,
  InvoiceStatus,
} from '@/types/database';

type InvoiceInsert = Database['public']['Tables']['commission_invoices']['Insert'];

export interface InvoiceWithLease extends CommissionInvoice {
  lease: {
    id: string;
    lessee_name: string;
    lessor_name: string;
    premises_address: string;
    premises_city: string;
    premises_state: string;
  } | null;
}

export interface InvoiceWithDetail extends CommissionInvoice {
  lease: {
    id: string;
    lessee_name: string;
    lessor_name: string;
    premises_address: string;
    premises_city: string;
    premises_state: string;
    unit: {
      suite_number: string;
    } | null;
    property: {
      address: string;
      city: string;
      state: string;
    } | null;
    broker: {
      first_name: string | null;
      last_name: string | null;
      company_name: string | null;
    } | null;
  } | null;
}

/**
 * Fetch all commission invoices with key lease details joined.
 * Ordered by creation date, newest first.
 */
export async function getInvoices(): Promise<{
  data: InvoiceWithLease[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('commission_invoices')
      .select(`
        *,
        lease:leases(
          id,
          lessee_name,
          lessor_name,
          premises_address,
          premises_city,
          premises_state
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as InvoiceWithLease[], error: null };
  } catch (err) {
    console.error('getInvoices error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Fetch a single commission invoice by ID with full details.
 */
export async function getInvoice(id: string): Promise<{
  data: InvoiceWithLease | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('commission_invoices')
      .select(`
        *,
        lease:leases(
          id,
          lessee_name,
          lessor_name,
          premises_address,
          premises_city,
          premises_state
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data: data as InvoiceWithLease, error: null };
  } catch (err) {
    console.error('getInvoice error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Fetch a single commission invoice by ID with full details including
 * nested property, unit, and broker information via the lease relation.
 */
export async function getInvoiceWithDetail(id: string): Promise<{
  data: InvoiceWithDetail | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('commission_invoices')
      .select(`
        *,
        lease:leases(
          id,
          lessee_name,
          lessor_name,
          premises_address,
          premises_city,
          premises_state,
          unit:units(suite_number),
          property:properties(address, city, state),
          broker:contacts!leases_broker_contact_id_fkey(
            first_name,
            last_name,
            company_name
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data: data as InvoiceWithDetail, error: null };
  } catch (err) {
    console.error('getInvoiceWithDetail error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Insert a new commission invoice record.
 * The invoice number should be generated via `getNextInvoiceNumber()` before calling this.
 */
export async function createInvoice(data: InvoiceInsert): Promise<{
  data: CommissionInvoice | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: invoice, error } = await supabase
      .from('commission_invoices')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return { data: invoice as CommissionInvoice, error: null };
  } catch (err) {
    console.error('createInvoice error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Update the status of a commission invoice (e.g. draft -> sent -> paid).
 * Returns the updated invoice row.
 */
export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<{
  data: CommissionInvoice | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('commission_invoices')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as CommissionInvoice, error: null };
  } catch (err) {
    console.error('updateInvoiceStatus error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Determine the next invoice number in the RR-XX sequence.
 * Queries the highest existing invoice number and increments by one.
 * Returns "RR-01" if no invoices exist yet.
 */
export async function getNextInvoiceNumber(): Promise<{
  data: string | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('commission_invoices')
      .select('invoice_number')
      .order('invoice_number', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return { data: 'RR-01', error: null };
    }

    // Parse "RR-XX" format and increment
    const lastNumber = data[0].invoice_number;
    const match = lastNumber.match(/^RR-(\d+)$/);
    if (!match) {
      return { data: 'RR-01', error: null };
    }

    const next = parseInt(match[1], 10) + 1;
    const nextStr = `RR-${next.toString().padStart(2, '0')}`;
    return { data: nextStr, error: null };
  } catch (err) {
    console.error('getNextInvoiceNumber error:', err);
    return { data: null, error: (err as Error).message };
  }
}
