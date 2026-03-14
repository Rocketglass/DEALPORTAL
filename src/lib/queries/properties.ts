import { createClient } from '@/lib/supabase/server';
import type {
  Database,
  Property,
  Unit,
} from '@/types/database';

export interface PropertyWithUnitCounts extends Property {
  units: Unit[];
  totalUnits: number;
  vacantUnits: number;
  occupiedUnits: number;
  pendingUnits: number;
}

type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
type PropertyUpdate = Database['public']['Tables']['properties']['Update'];
type UnitUpdate = Database['public']['Tables']['units']['Update'];

interface PropertyWithUnits extends Property {
  units: Unit[];
}

/**
 * Fetch all active properties with their associated units.
 * Returns properties ordered by name, each with a nested `units` array.
 */
export async function getProperties(): Promise<{
  data: PropertyWithUnits[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('properties')
      .select('*, units(*)')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return { data: data as PropertyWithUnits[], error: null };
  } catch (err) {
    console.error('getProperties error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Fetch all active properties with their units and pre-computed unit counts.
 * Each returned property includes totalUnits, vacantUnits, occupiedUnits, and pendingUnits.
 */
export async function getPropertiesWithUnitCounts(): Promise<{
  data: PropertyWithUnitCounts[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('properties')
      .select('*, units(*)')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    const properties = (data as PropertyWithUnitCounts[]).map((property) => {
      const units: Unit[] = property.units ?? [];
      return {
        ...property,
        totalUnits: units.length,
        vacantUnits: units.filter((u) => u.status === 'vacant').length,
        occupiedUnits: units.filter((u) => u.status === 'occupied').length,
        pendingUnits: units.filter((u) => u.status === 'pending').length,
      };
    });

    return { data: properties, error: null };
  } catch (err) {
    console.error('getPropertiesWithUnitCounts error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Fetch a single property by ID with all its units.
 */
export async function getProperty(id: string): Promise<{
  data: PropertyWithUnits | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('properties')
      .select('*, units(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data: data as PropertyWithUnits, error: null };
  } catch (err) {
    console.error('getProperty error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Insert a new property record.
 * The `id`, `created_at`, and `updated_at` fields are generated server-side.
 */
export async function createProperty(data: PropertyInsert): Promise<{
  data: Property | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: property, error } = await supabase
      .from('properties')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return { data: property as Property, error: null };
  } catch (err) {
    console.error('createProperty error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Update an existing property by ID.
 * Only the provided fields are overwritten; omitted fields remain unchanged.
 */
export async function updateProperty(
  id: string,
  data: PropertyUpdate
): Promise<{
  data: Property | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: property, error } = await supabase
      .from('properties')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: property as Property, error: null };
  } catch (err) {
    console.error('updateProperty error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Fetch all units belonging to a specific property, ordered by suite number.
 */
export async function getUnits(propertyId: string): Promise<{
  data: Unit[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('property_id', propertyId)
      .order('suite_number');

    if (error) throw error;
    return { data: data as Unit[], error: null };
  } catch (err) {
    console.error('getUnits error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Update an existing unit by ID.
 * Only the provided fields are overwritten; omitted fields remain unchanged.
 */
export async function updateUnit(
  id: string,
  data: UnitUpdate
): Promise<{
  data: Unit | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: unit, error } = await supabase
      .from('units')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: unit as Unit, error: null };
  } catch (err) {
    console.error('updateUnit error:', err);
    return { data: null, error: (err as Error).message };
  }
}
