import { createClient } from '@/lib/supabase/server';
import type { Contact } from '@/types/database';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  contact_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
}

/**
 * Fetch the portal user row plus their linked contact record.
 * Looks up the users table by auth provider ID (Supabase auth user id).
 */
export async function getUserProfile(authUserId: string): Promise<{
  data: UserProfile | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id, email, role, contact_id')
      .eq('auth_provider_id', authUserId)
      .eq('is_active', true)
      .single();

    if (userError) throw userError;
    if (!dbUser) return { data: null, error: 'User not found' };

    let contact: Contact | null = null;
    if (dbUser.contact_id) {
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', dbUser.contact_id)
        .single();
      contact = contactData as Contact | null;
    }

    return {
      data: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        contact_id: dbUser.contact_id,
        first_name: contact?.first_name ?? null,
        last_name: contact?.last_name ?? null,
        phone: contact?.phone ?? null,
        company_name: contact?.company_name ?? null,
      },
      error: null,
    };
  } catch (err) {
    console.error('getUserProfile error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Update contact information for a user.
 * If the user has a linked contact, updates that contact record.
 */
export async function updateUserContact(
  contactId: string,
  data: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    company_name?: string | null;
  }
): Promise<{
  data: Contact | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data: contact, error } = await supabase
      .from('contacts')
      .update(data)
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw error;
    return { data: contact as Contact, error: null };
  } catch (err) {
    console.error('updateUserContact error:', err);
    return { data: null, error: (err as Error).message };
  }
}
