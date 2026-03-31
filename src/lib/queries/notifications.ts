import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link_url: string | null;
  read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch unread notifications for a specific user, ordered by newest first.
 * Used by landlord and tenant dashboards for "Pending Actions".
 */
export async function getUnreadNotifications(
  userId: string,
  limit = 10
): Promise<{ data: Notification[] | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, message, link_url, read, created_at')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getUnreadNotifications] Supabase error:', error.message);
      return { data: null, error: error.message };
    }

    return { data: data ?? [], error: null };
  } catch (err) {
    console.error('[getUnreadNotifications] Error:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load notifications',
    };
  }
}

/**
 * Fetch recent notifications for a user (read and unread), ordered by newest first.
 * Used by the broker dashboard for "Activity Timeline".
 */
export async function getRecentNotifications(
  userId: string,
  limit = 20
): Promise<{ data: Notification[] | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, message, link_url, read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getRecentNotifications] Supabase error:', error.message);
      return { data: null, error: error.message };
    }

    return { data: data ?? [], error: null };
  } catch (err) {
    console.error('[getRecentNotifications] Error:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to load notifications',
    };
  }
}
