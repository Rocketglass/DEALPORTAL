/**
 * Input sanitization utilities for the Rocket Realty Portal.
 *
 * Prevents XSS, path traversal, and malicious file uploads.
 */

/**
 * Strip all HTML tags from a string. Prevents XSS when displaying user input.
 * Also removes event handlers and javascript: URIs.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';

  return input
    // Remove all HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol URIs
    .replace(/javascript\s*:/gi, '')
    // Remove data: protocol URIs (potential XSS vector)
    .replace(/data\s*:/gi, '')
    // Remove vbscript: protocol URIs
    .replace(/vbscript\s*:/gi, '')
    // Remove on* event handlers that might survive tag stripping
    .replace(/\bon\w+\s*=/gi, '')
    // Trim whitespace
    .trim();
}

/**
 * Sanitize a file name for safe storage.
 * Prevents path traversal and ensures OS-safe names.
 */
export function sanitizeFileName(name: string): string {
  if (!name) return 'unnamed';

  return name
    // Remove path traversal characters
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Replace spaces and special characters with hyphens
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Remove leading dots (hidden files on Unix)
    .replace(/^\.+/, '')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length (255 chars is typical filesystem limit)
    .slice(0, 255)
    // Fallback if everything was stripped
    || 'unnamed';
}

/**
 * Allowed MIME types for file uploads.
 */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
]);

/**
 * Maximum file size in bytes (10MB).
 */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * File signature (magic bytes) validation.
 * Checks the first few bytes of a file to verify its actual type,
 * regardless of what the MIME type header claims.
 */
const FILE_SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  // PDF: %PDF
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  // PNG: 0x89 P N G
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  // JPEG: 0xFF 0xD8 0xFF
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
];

/**
 * Validation result for file uploads.
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

/**
 * Validate a file upload for security.
 * Checks MIME type, file size, file extension, and magic bytes.
 *
 * @param file - The File object from a form upload
 * @returns Validation result with sanitized file name if valid
 */
export async function validateFileUpload(
  file: File,
): Promise<FileValidationResult> {
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds the 10MB limit`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Only PDF, PNG, and JPEG files are accepted`,
    };
  }

  // Check file extension matches MIME type
  const extension = file.name.split('.').pop()?.toLowerCase();
  const validExtensions: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'image/png': ['png'],
    'image/jpeg': ['jpg', 'jpeg'],
  };

  const allowedExtensions = validExtensions[file.type] || [];
  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ".${extension}" does not match declared type "${file.type}"`,
    };
  }

  // Validate magic bytes to prevent disguised executables
  try {
    const headerBytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const matchesSignature = FILE_SIGNATURES.some(
      (sig) =>
        sig.mime === file.type &&
        sig.bytes.every((byte, i) => headerBytes[i] === byte),
    );

    if (!matchesSignature) {
      return {
        valid: false,
        error: 'File content does not match its declared type. The file may be corrupted or disguised',
      };
    }
  } catch {
    return {
      valid: false,
      error: 'Could not read file content for validation',
    };
  }

  return {
    valid: true,
    sanitizedName: sanitizeFileName(file.name),
  };
}

/**
 * Sanitize a search query string to prevent injection.
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';

  return query
    // Remove potential SQL injection characters
    .replace(/[;'"\\]/g, '')
    // Remove control characters
    .replace(/[\x00-\x1f\x7f]/g, '')
    // Trim and limit length
    .trim()
    .slice(0, 200);
}

/**
 * Sanitize an email address for safe use in queries.
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  // Basic email format validation
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

  if (!emailRegex.test(sanitized)) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize a UUID string.
 */
export function sanitizeUuid(uuid: string): string | null {
  if (!uuid) return null;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const trimmed = uuid.trim().toLowerCase();

  if (!uuidRegex.test(trimmed)) {
    return null;
  }

  return trimmed;
}
