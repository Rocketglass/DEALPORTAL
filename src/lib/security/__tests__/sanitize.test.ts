import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeFileName,
  sanitizeSearchQuery,
  sanitizeEmail,
  sanitizeUuid,
} from '../sanitize';

// ============================================================
// sanitizeHtml
// ============================================================

describe('sanitizeHtml', () => {
  it('strips HTML tags', () => {
    expect(sanitizeHtml('<b>hello</b>')).toBe('hello');
  });

  it('strips script tags and content between tags', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('removes javascript: URIs', () => {
    expect(sanitizeHtml('click javascript:alert(1)')).toBe('click alert(1)');
  });

  it('removes javascript: URIs case-insensitively', () => {
    expect(sanitizeHtml('JAVASCRIPT:void(0)')).toBe('void(0)');
  });

  it('removes data: URIs', () => {
    expect(sanitizeHtml('data:text/html,<h1>hi</h1>')).toBe('text/html,hi');
  });

  it('removes vbscript: URIs', () => {
    expect(sanitizeHtml('vbscript:msgbox')).toBe('msgbox');
  });

  it('removes on* event handlers', () => {
    expect(sanitizeHtml('onerror= onclick=')).toBe('');
  });

  it('preserves plain text', () => {
    expect(sanitizeHtml('Hello World 123!')).toBe('Hello World 123!');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('handles nested tags', () => {
    expect(sanitizeHtml('<div><p>text</p></div>')).toBe('text');
  });
});

// ============================================================
// sanitizeFileName
// ============================================================

describe('sanitizeFileName', () => {
  it('preserves normal file names', () => {
    expect(sanitizeFileName('document.pdf')).toBe('document.pdf');
  });

  it('removes path traversal sequences', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('etcpasswd');
  });

  it('removes forward and back slashes', () => {
    expect(sanitizeFileName('path/to\\file.txt')).toBe('pathtofile.txt');
  });

  it('removes null bytes', () => {
    expect(sanitizeFileName('file\0name.pdf')).toBe('filename.pdf');
  });

  it('removes leading dots (hidden files)', () => {
    expect(sanitizeFileName('.hidden-file')).toBe('hidden-file');
  });

  it('replaces special characters with hyphens', () => {
    expect(sanitizeFileName('file name (1).pdf')).toBe('file-name-1-.pdf');
  });

  it('collapses multiple hyphens', () => {
    expect(sanitizeFileName('a---b.pdf')).toBe('a-b.pdf');
  });

  it('returns "unnamed" for empty input', () => {
    expect(sanitizeFileName('')).toBe('unnamed');
  });

  it('returns "unnamed" when everything is stripped', () => {
    expect(sanitizeFileName('...')).toBe('unnamed');
  });

  it('limits length to 255 characters', () => {
    const longName = 'a'.repeat(300) + '.pdf';
    expect(sanitizeFileName(longName).length).toBeLessThanOrEqual(255);
  });
});

// ============================================================
// sanitizeSearchQuery
// ============================================================

describe('sanitizeSearchQuery', () => {
  it('preserves normal search text', () => {
    expect(sanitizeSearchQuery('office space downtown')).toBe('office space downtown');
  });

  it('removes SQL injection characters', () => {
    expect(sanitizeSearchQuery("1'; DROP TABLE leases;--")).toBe('1 DROP TABLE leases--');
  });

  it('removes control characters', () => {
    expect(sanitizeSearchQuery('test\x00\x1fquery')).toBe('testquery');
  });

  it('trims whitespace', () => {
    expect(sanitizeSearchQuery('  hello  ')).toBe('hello');
  });

  it('limits length to 200 characters', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeSearchQuery(long).length).toBe(200);
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeSearchQuery('')).toBe('');
  });
});

// ============================================================
// sanitizeEmail
// ============================================================

describe('sanitizeEmail', () => {
  it('accepts a valid email', () => {
    expect(sanitizeEmail('john@example.com')).toBe('john@example.com');
  });

  it('lowercases the email', () => {
    expect(sanitizeEmail('John.Doe@Example.COM')).toBe('john.doe@example.com');
  });

  it('trims whitespace', () => {
    expect(sanitizeEmail('  user@test.com  ')).toBe('user@test.com');
  });

  it('returns empty string for invalid email', () => {
    expect(sanitizeEmail('not-an-email')).toBe('');
  });

  it('returns empty string for email without domain', () => {
    expect(sanitizeEmail('user@')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeEmail('')).toBe('');
  });

  it('accepts email with plus addressing', () => {
    expect(sanitizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
  });

  it('accepts email with dots in local part', () => {
    expect(sanitizeEmail('first.last@example.com')).toBe('first.last@example.com');
  });
});

// ============================================================
// sanitizeUuid
// ============================================================

describe('sanitizeUuid', () => {
  it('accepts a valid UUID', () => {
    expect(sanitizeUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('lowercases the UUID', () => {
    expect(sanitizeUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('trims whitespace', () => {
    expect(sanitizeUuid('  550e8400-e29b-41d4-a716-446655440000  ')).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('returns null for invalid UUID', () => {
    expect(sanitizeUuid('not-a-uuid')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(sanitizeUuid('')).toBeNull();
  });

  it('returns null for UUID with wrong format', () => {
    expect(sanitizeUuid('550e8400e29b41d4a716446655440000')).toBeNull();
  });
});
