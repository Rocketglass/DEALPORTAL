/**
 * Server-side auth guards for the Rocket Realty Portal.
 *
 * These helpers are designed for use in Server Components, Server Actions,
 * and API Route Handlers. They check authentication and authorization
 * via Supabase, and redirect/throw when access is denied.
 *
 * When Supabase is not configured (no credentials), the guards throw
 * an error rather than silently allowing access — fail closed.
 */

import { redirect } from 'next/navigation';
import type { UserRole } from '@/types/database';

/**
 * Result of a successful auth check.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  contactId: string | null;
  principalId: string | null;
}

/**
 * Check if Supabase is configured. If not, we cannot authenticate.
 */
function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Require the current request to be authenticated.
 * Redirects to /login if the user is not authenticated.
 *
 * Usage in Server Components:
 *   const user = await requireAuth();
 *
 * Usage in API Route Handlers:
 *   const user = await requireAuth();
 *   // If this line executes, user is authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  if (!isSupabaseConfigured()) {
    // Supabase not configured — always fail closed (no dev fallback)
    console.error('[Auth Guard] Supabase not configured. Redirecting to login.');
    redirect('/login');
  }

  // Dynamic import to avoid issues when Supabase isn't configured
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error(
      '[Auth Guard] Authentication failed:',
      authError?.message || 'No user session',
    );
    redirect('/login');
  }

  // Look up the user's role in the users table
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('id, email, role, contact_id, principal_id')
    .eq('auth_provider_id', user.id)
    .eq('is_active', true)
    .single();

  if (dbError || !dbUser) {
    console.error(
      '[Auth Guard] User not found in users table or inactive:',
      dbError?.message || 'No matching user row',
    );
    redirect('/login');
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role as UserRole,
    contactId: dbUser.contact_id,
    principalId: dbUser.principal_id,
  };
}

/**
 * Require the current user to have a specific role.
 * Redirects to /login if not authenticated, or to /unauthorized if wrong role.
 *
 * Usage:
 *   const user = await requireRole('broker');
 *   const admin = await requireRole('admin');
 */
export async function requireRole(
  ...allowedRoles: UserRole[]
): Promise<AuthUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    console.error(
      `[Auth Guard] Role check failed. User ${user.email} has role '${user.role}', ` +
      `required one of: [${allowedRoles.join(', ')}]`,
    );
    redirect('/unauthorized');
  }

  return user;
}

/**
 * Convenience: require broker or admin role.
 * This is the most common check for portal routes.
 */
export async function requireBrokerOrAdmin(): Promise<AuthUser> {
  return requireRole('broker', 'admin');
}

/**
 * Require landlord or landlord_agent role.
 * Used for landlord portal routes.
 */
export async function requireLandlordOrAgent(): Promise<AuthUser> {
  return requireRole('landlord', 'landlord_agent');
}

/**
 * Require tenant or tenant_agent role.
 * Used for tenant portal routes.
 */
export async function requireTenantOrAgent(): Promise<AuthUser> {
  return requireRole('tenant', 'tenant_agent');
}

/**
 * Require the current user to match a specific user ID.
 * Used for ownership checks — e.g., ensuring a user can only access their own data.
 *
 * Usage:
 *   await requireOwnership(someRecord.userId);
 */
export async function requireOwnership(userId: string): Promise<AuthUser> {
  const user = await requireAuth();

  // Broker and admin can access any user's data
  if (user.role === 'broker' || user.role === 'admin') {
    return user;
  }

  // Agents can access their principal's data
  if (user.principalId === userId) {
    return user;
  }

  if (user.id !== userId) {
    console.error(
      `[Auth Guard] Ownership check failed. User ${user.id} attempted to access data for user ${userId}`,
    );
    redirect('/unauthorized');
  }

  return user;
}

/**
 * Require auth for API routes — returns the user or throws an error
 * (does not redirect, since API routes return JSON).
 *
 * Usage in Route Handlers:
 *   try {
 *     const user = await requireAuthForApi();
 *   } catch (error) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 */
export async function requireAuthForApi(): Promise<AuthUser> {
  if (!isSupabaseConfigured()) {
    // Always fail closed — no dev fallback
    throw new Error('Unauthorized: Authentication service not configured');
  }

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(`Unauthorized: ${authError?.message || 'No session'}`);
  }

  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('id, email, role, contact_id, principal_id')
    .eq('auth_provider_id', user.id)
    .eq('is_active', true)
    .single();

  if (dbError || !dbUser) {
    throw new Error(
      `Unauthorized: ${dbError?.message || 'User not found or inactive'}`,
    );
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role as UserRole,
    contactId: dbUser.contact_id,
    principalId: dbUser.principal_id,
  };
}

/**
 * Require broker/admin role for API routes.
 */
export async function requireBrokerOrAdminForApi(): Promise<AuthUser> {
  const user = await requireAuthForApi();

  if (user.role !== 'broker' && user.role !== 'admin') {
    throw new Error(
      `Forbidden: User ${user.email} has role '${user.role}', requires broker or admin`,
    );
  }

  return user;
}

/**
 * Require landlord or landlord_agent role for API routes.
 */
export async function requireLandlordOrAgentForApi(): Promise<AuthUser> {
  const user = await requireAuthForApi();
  if (user.role !== 'landlord' && user.role !== 'landlord_agent') {
    throw new Error(
      `Forbidden: User ${user.email} has role '${user.role}', requires landlord or landlord_agent`,
    );
  }
  return user;
}

/**
 * Require tenant or tenant_agent role for API routes.
 */
export async function requireTenantOrAgentForApi(): Promise<AuthUser> {
  const user = await requireAuthForApi();
  if (user.role !== 'tenant' && user.role !== 'tenant_agent') {
    throw new Error(
      `Forbidden: User ${user.email} has role '${user.role}', requires tenant or tenant_agent`,
    );
  }
  return user;
}
