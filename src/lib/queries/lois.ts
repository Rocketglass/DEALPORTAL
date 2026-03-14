import { createClient } from '@/lib/supabase/server';
import type {
  Database,
  Loi,
  LoiNegotiation,
  LoiStatus,
  LoiWithRelations,
} from '@/types/database';

type LoiInsert = Database['public']['Tables']['lois']['Insert'];
type LoiSectionInsert = Database['public']['Tables']['loi_sections']['Insert'];
type LoiNegotiationInsert = Database['public']['Tables']['loi_negotiations']['Insert'];

/**
 * Fetch all LOIs with their related property, unit, and contact joins.
 * Ordered by creation date, newest first.
 */
export async function getLois(): Promise<{
  data: LoiWithRelations[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('lois')
      .select(`
        *,
        property:properties(*),
        unit:units(*),
        tenant:contacts!lois_tenant_contact_id_fkey(*),
        landlord:contacts!lois_landlord_contact_id_fkey(*),
        broker:contacts!lois_broker_contact_id_fkey(*),
        sections:loi_sections(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as LoiWithRelations[], error: null };
  } catch (err) {
    console.error('getLois error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Fetch a single LOI by ID with all sections and negotiation history.
 * Sections are ordered by `display_order`, and each section includes
 * its negotiation entries ordered chronologically.
 */
export async function getLoi(id: string): Promise<{
  data: LoiWithRelations | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('lois')
      .select(`
        *,
        property:properties(*),
        unit:units(*),
        tenant:contacts!lois_tenant_contact_id_fkey(*),
        landlord:contacts!lois_landlord_contact_id_fkey(*),
        broker:contacts!lois_broker_contact_id_fkey(*),
        sections:loi_sections(
          *,
          negotiations:loi_negotiations(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data: data as LoiWithRelations, error: null };
  } catch (err) {
    console.error('getLoi error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Insert a new LOI along with its sections in a single operation.
 * The LOI row is created first, then all sections are inserted referencing
 * the new LOI ID. Returns the created LOI row (without sections).
 */
export async function createLoi(
  data: LoiInsert & { sections: Omit<LoiSectionInsert, 'loi_id'>[] }
): Promise<{
  data: Loi | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { sections, ...loiData } = data;

    // Insert the LOI row
    const { data: loi, error: loiError } = await supabase
      .from('lois')
      .insert(loiData)
      .select()
      .single();

    if (loiError) throw loiError;
    const createdLoi = loi as Loi;

    // Insert all sections referencing the new LOI
    if (sections.length > 0) {
      const sectionsWithLoiId = sections.map((section) => ({
        ...section,
        loi_id: createdLoi.id,
      }));

      const { error: sectionsError } = await supabase
        .from('loi_sections')
        .insert(sectionsWithLoiId);

      if (sectionsError) throw sectionsError;
    }

    return { data: createdLoi, error: null };
  } catch (err) {
    console.error('createLoi error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Update the status of an LOI (e.g. draft -> sent -> in_negotiation -> agreed).
 * Returns the updated LOI row.
 */
export async function updateLoiStatus(
  id: string,
  status: LoiStatus
): Promise<{
  data: Loi | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('lois')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as Loi, error: null };
  } catch (err) {
    console.error('updateLoiStatus error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Add a negotiation entry to a specific LOI section.
 * Used to record proposals, counter-offers, acceptances, and rejections
 * during the back-and-forth negotiation flow.
 */
export async function addNegotiation(
  loiSectionId: string,
  data: Omit<LoiNegotiationInsert, 'loi_section_id'>
): Promise<{
  data: LoiNegotiation | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: negotiation, error } = await supabase
      .from('loi_negotiations')
      .insert({ ...data, loi_section_id: loiSectionId })
      .select()
      .single();

    if (error) throw error;
    return { data: negotiation as LoiNegotiation, error: null };
  } catch (err) {
    console.error('addNegotiation error:', err);
    return { data: null, error: (err as Error).message };
  }
}
