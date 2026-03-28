import { createClient } from '@/lib/supabase/service';
import type {
  Property,
  Unit,
  ApplicationWithRelations,
} from '@/types/database';
import type { AuthUser } from '@/lib/security/auth-guard';

// ============================================================
// Types
// ============================================================

export interface LandlordProperty extends Property {
  units: Unit[];
  unitCount: number;
  applicationCount: number;
  activeLoiCount: number;
  activeLeaseCount: number;
}

// ============================================================
// Helper
// ============================================================

/**
 * Returns the effective contactId for a landlord user.
 * For landlord_agent roles, returns the principal's contactId (delegation).
 * For all other roles, returns the user's own contactId.
 */
export function getEffectiveContactId(user: AuthUser): string {
  const id = user.principalId ?? user.contactId;
  if (!id) {
    throw new Error('User has no contactId or principalId — cannot determine landlord context');
  }
  return id;
}

// ============================================================
// Queries
// ============================================================

/**
 * Fetch all properties associated with a landlord.
 *
 * Because the properties table has no owner_contact_id column, we derive
 * landlord ownership via the lois and leases tables (which both store a
 * landlord_contact_id). We collect the distinct property IDs from those two
 * tables and return the matching properties with unit and pipeline counts.
 *
 * Uses the service client (bypasses RLS) so that the landlord gets a
 * consistent view even when the authenticated session RLS has no property
 * policy for them.
 */
export async function getLandlordProperties(contactId: string): Promise<{
  data: LandlordProperty[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // Step 1: find all property IDs this landlord is party to via LOIs
    const { data: loiRows, error: loiError } = await supabase
      .from('lois')
      .select('property_id')
      .eq('landlord_contact_id', contactId);

    if (loiError) throw loiError;

    // Step 2: find all property IDs via leases
    const { data: leaseRows, error: leaseError } = await supabase
      .from('leases')
      .select('property_id')
      .eq('landlord_contact_id', contactId);

    if (leaseError) throw leaseError;

    // Step 3: collect distinct property IDs
    const propertyIdSet = new Set<string>();
    for (const row of (loiRows ?? []) as Array<{ property_id: string }>) {
      if (row.property_id) propertyIdSet.add(row.property_id);
    }
    for (const row of (leaseRows ?? []) as Array<{ property_id: string | null }>) {
      if (row.property_id) propertyIdSet.add(row.property_id);
    }

    const propertyIds = Array.from(propertyIdSet);

    if (propertyIds.length === 0) {
      return { data: [], error: null };
    }

    // Step 4: fetch properties with their units
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*, units(*)')
      .in('id', propertyIds)
      .eq('is_active', true)
      .order('name');

    if (propError) throw propError;

    type PropertyWithUnits = Property & { units: Unit[] };

    // Step 5: for each property, count applications, active LOIs, and leases
    const enriched: LandlordProperty[] = await Promise.all(
      ((properties ?? []) as PropertyWithUnits[]).map(async (property) => {
        const units = property.units ?? [];

        // Application count (applications linked to this property)
        const { count: appCount } = await supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', property.id);

        // Active LOI count (sent, in_negotiation, or agreed)
        const { count: loiCount } = await supabase
          .from('lois')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', property.id)
          .eq('landlord_contact_id', contactId)
          .in('status', ['sent', 'in_negotiation', 'agreed']);

        // Active lease count (executed or active)
        const { count: leaseCount } = await supabase
          .from('leases')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', property.id)
          .eq('landlord_contact_id', contactId)
          .in('status', ['executed', 'active']);

        return {
          ...property,
          units,
          unitCount: units.length,
          applicationCount: appCount ?? 0,
          activeLoiCount: loiCount ?? 0,
          activeLeaseCount: leaseCount ?? 0,
        };
      }),
    );

    return { data: enriched, error: null };
  } catch (err) {
    console.error('getLandlordProperties error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Fetch all applications for properties the landlord is party to (via LOIs/leases).
 * Includes contact (tenant info), property, unit, and documents relations.
 * Ordered by creation date, newest first.
 */
export async function getLandlordApplications(contactId: string): Promise<{
  data: ApplicationWithRelations[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // Collect property IDs via lois + leases (same as above)
    const [{ data: loiRows, error: loiError }, { data: leaseRows, error: leaseError }] =
      await Promise.all([
        supabase.from('lois').select('property_id').eq('landlord_contact_id', contactId),
        supabase.from('leases').select('property_id').eq('landlord_contact_id', contactId),
      ]);

    if (loiError) throw loiError;
    if (leaseError) throw leaseError;

    const propertyIdSet = new Set<string>();
    for (const row of (loiRows ?? []) as Array<{ property_id: string }>) {
      if (row.property_id) propertyIdSet.add(row.property_id);
    }
    for (const row of (leaseRows ?? []) as Array<{ property_id: string | null }>) {
      if (row.property_id) propertyIdSet.add(row.property_id);
    }

    const propertyIds = Array.from(propertyIdSet);

    if (propertyIds.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        property:properties(*),
        unit:units(*),
        contact:contacts!applications_contact_id_fkey(*),
        documents:application_documents(*)
      `)
      .in('property_id', propertyIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as ApplicationWithRelations[], error: null };
  } catch (err) {
    console.error('getLandlordApplications error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Fetch a single application by ID, verifying that the application's property
 * belongs to this landlord (via an existing LOI or lease).
 * Returns null if the application is not found or not accessible.
 */
export async function getLandlordApplication(
  applicationId: string,
  contactId: string,
): Promise<{
  data: ApplicationWithRelations | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // Fetch the application with full relations
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        property:properties(*),
        unit:units(*),
        contact:contacts!applications_contact_id_fkey(*),
        documents:application_documents(*)
      `)
      .eq('id', applicationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return { data: null, error: null };
      }
      throw error;
    }

    if (!data) return { data: null, error: null };

    const application = data as ApplicationWithRelations;

    // Authorization check: verify this landlord has a LOI or lease on this property
    if (application.property_id) {
      const [{ count: loiCount }, { count: leaseCount }] = await Promise.all([
        supabase
          .from('lois')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', application.property_id)
          .eq('landlord_contact_id', contactId),
        supabase
          .from('leases')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', application.property_id)
          .eq('landlord_contact_id', contactId),
      ]);

      if ((loiCount ?? 0) === 0 && (leaseCount ?? 0) === 0) {
        // Landlord has no LOI or lease on this property — deny access
        return { data: null, error: null };
      }
    }

    return { data: application, error: null };
  } catch (err) {
    console.error('getLandlordApplication error:', err);
    return { data: null, error: (err as Error).message };
  }
}
