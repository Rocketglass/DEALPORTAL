/**
 * Audit logging helper for the Rocket Realty Portal.
 *
 * Creates a paper trail of all significant data access and modifications.
 * All entries are immutable — no update or delete is permitted by RLS.
 */

import type { Json } from '@/types/database';

/**
 * Actions that can be logged in the audit trail.
 */
export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'download'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'send'
  | 'sign';

/**
 * Entity types that correspond to tables in the database.
 */
export type AuditEntityType =
  | 'property'
  | 'unit'
  | 'contact'
  | 'user'
  | 'application'
  | 'application_document'
  | 'loi'
  | 'loi_section'
  | 'loi_negotiation'
  | 'lease'
  | 'rent_escalation'
  | 'commission_invoice'
  | 'qr_code'
  | 'notification';

/**
 * Parameters for logging an audit event.
 */
export interface AuditEventParams {
  userId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  oldValue?: Json;
  newValue?: Json;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event to the audit_log table.
 *
 * This function attempts to insert into the audit_log table via Supabase.
 * If Supabase is not configured, it logs to the console instead.
 * It never throws — audit logging should not break application flow.
 *
 * @param params - The audit event parameters
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  const {
    userId,
    action,
    entityType,
    entityId,
    oldValue = null,
    newValue = null,
    ipAddress,
    userAgent,
  } = params;

  // Always log to console for server-side monitoring
  console.log(
    `[Audit] ${action.toUpperCase()} ${entityType}:${entityId}` +
    (userId ? ` by user:${userId}` : ' (system)'),
  );

  // Attempt to persist to database
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Supabase not configured — console log is the fallback
    console.warn('[Audit] Supabase not configured — event logged to console only');
    return;
  }

  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const { error } = await supabase.from('audit_log').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    });

    if (error) {
      // Log the error but do not throw — audit failures should not break the app
      console.error('[Audit] Failed to persist audit event:', error.message);
    }
  } catch (error) {
    console.error(
      '[Audit] Unexpected error persisting audit event:',
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Convenience: log a data access event (read/download/export).
 * Use this when a user views sensitive data.
 */
export async function logDataAccess(
  userId: string,
  entityType: AuditEntityType,
  entityId: string,
  action: 'read' | 'download' | 'export' = 'read',
): Promise<void> {
  return logAuditEvent({
    userId,
    action,
    entityType,
    entityId,
  });
}

/**
 * Convenience: log a data mutation event (create/update/delete).
 * Captures old and new values for the change.
 */
export async function logDataMutation(
  userId: string,
  action: 'create' | 'update' | 'delete',
  entityType: AuditEntityType,
  entityId: string,
  oldValue?: Json,
  newValue?: Json,
): Promise<void> {
  return logAuditEvent({
    userId,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
  });
}

/**
 * Convenience: log an auth event (login/logout).
 */
export async function logAuthEvent(
  userId: string,
  action: 'login' | 'logout',
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  return logAuditEvent({
    userId,
    action,
    entityType: 'user',
    entityId: userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Extract the client IP address from request headers.
 * Works with common proxy/CDN setups (Vercel, Cloudflare, etc.).
 */
export function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    undefined
  );
}
