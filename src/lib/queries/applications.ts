import { createClient } from '@/lib/supabase/server';
import type {
  Database,
  Application,
  ApplicationDocument,
  ApplicationStatus,
  ApplicationWithRelations,
} from '@/types/database';

type ApplicationInsert = Database['public']['Tables']['applications']['Insert'];

/**
 * Fetch all applications with their related property, unit, and contact data.
 * Ordered by creation date, newest first.
 */
export async function getApplications(): Promise<{
  data: ApplicationWithRelations[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        property:properties(*),
        unit:units(*),
        contact:contacts(*),
        documents:application_documents(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as ApplicationWithRelations[], error: null };
  } catch (err) {
    console.error('getApplications error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Fetch a single application by ID with all related entities
 * (property, unit, contact, and uploaded documents).
 */
export async function getApplication(id: string): Promise<{
  data: ApplicationWithRelations | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        property:properties(*),
        unit:units(*),
        contact:contacts(*),
        documents:application_documents(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data: data as ApplicationWithRelations, error: null };
  } catch (err) {
    console.error('getApplication error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Insert a new application record.
 * The caller is responsible for creating the contact record first and
 * passing the `contact_id` in the data payload.
 */
export async function createApplication(data: ApplicationInsert): Promise<{
  data: Application | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: application, error } = await supabase
      .from('applications')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return { data: application as Application, error: null };
  } catch (err) {
    console.error('createApplication error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Update the status of an application (e.g. submitted -> under_review -> approved).
 * Returns the updated application row.
 */
export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<{
  data: Application | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as Application, error: null };
  } catch (err) {
    console.error('updateApplicationStatus error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Fetch all documents uploaded for a specific application,
 * ordered by upload date (newest first).
 */
export async function getApplicationDocuments(
  applicationId: string
): Promise<{
  data: ApplicationDocument[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('application_documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return { data: data as ApplicationDocument[], error: null };
  } catch (err) {
    console.error('getApplicationDocuments error:', err);
    return { data: null, error: (err as Error).message };
  }
}
