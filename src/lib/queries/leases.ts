import { createClient } from '@/lib/supabase/server';
import type {
  Database,
  Lease,
  LeaseStatus,
  LeaseWithRelations,
  RentEscalation,
} from '@/types/database';

type LeaseInsert = Database['public']['Tables']['leases']['Insert'];
type LeaseUpdate = Database['public']['Tables']['leases']['Update'];

/**
 * Fetch all leases with their related property, unit, and contact joins.
 * Ordered by creation date, newest first.
 */
export async function getLeases(): Promise<{
  data: LeaseWithRelations[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
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
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as LeaseWithRelations[], error: null };
  } catch (err) {
    console.error('getLeases error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Fetch a single lease by ID with all AIR form fields, related entities,
 * and rent escalation schedule.
 */
export async function getLease(id: string): Promise<{
  data: LeaseWithRelations | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
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
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data: data as LeaseWithRelations, error: null };
  } catch (err) {
    console.error('getLease error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Insert a new lease record.
 * This creates the base lease row; rent escalations should be inserted
 * separately after the lease is created.
 */
export async function createLease(data: LeaseInsert): Promise<{
  data: Lease | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: lease, error } = await supabase
      .from('leases')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return { data: lease as Lease, error: null };
  } catch (err) {
    console.error('createLease error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Update specific fields on an existing lease.
 * Accepts any subset of lease columns. Useful for updating AIR form fields,
 * DocuSign status, or execution details.
 */
export async function updateLease(
  id: string,
  data: LeaseUpdate
): Promise<{
  data: Lease | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: lease, error } = await supabase
      .from('leases')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: lease as Lease, error: null };
  } catch (err) {
    console.error('updateLease error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Fetch the rent escalation schedule for a specific lease,
 * ordered by year number ascending.
 */
export async function getRentEscalations(leaseId: string): Promise<{
  data: RentEscalation[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('rent_escalations')
      .select('*')
      .eq('lease_id', leaseId)
      .order('year_number');

    if (error) throw error;
    return { data: data as RentEscalation[], error: null };
  } catch (err) {
    console.error('getRentEscalations error:', err);
    return { data: null, error: (err as Error).message };
  }
}
