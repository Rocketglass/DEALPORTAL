/**
 * Security module barrel export.
 *
 * Import from '@/lib/security' for convenience:
 *   import { requireAuth, sanitizeHtml, logAuditEvent } from '@/lib/security';
 */

export {
  requireAuth,
  requireRole,
  requireBrokerOrAdmin,
  requireOwnership,
  requireAuthForApi,
  requireBrokerOrAdminForApi,
  type AuthUser,
} from './auth-guard';

export {
  sanitizeHtml,
  sanitizeFileName,
  validateFileUpload,
  sanitizeSearchQuery,
  sanitizeEmail,
  sanitizeUuid,
  type FileValidationResult,
} from './sanitize';

export {
  logAuditEvent,
  logDataAccess,
  logDataMutation,
  logAuthEvent,
  getClientIp,
  type AuditAction,
  type AuditEntityType,
  type AuditEventParams,
} from './audit';

export {
  getSecurityHeaders,
  getSecurityHeadersArray,
} from './headers';
