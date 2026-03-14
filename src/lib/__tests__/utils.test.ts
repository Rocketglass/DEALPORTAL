import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatSqft, cn } from '../utils';

// ============================================================
// formatCurrency
// ============================================================

describe('formatCurrency', () => {
  it('formats a whole dollar amount', () => {
    expect(formatCurrency(5000)).toBe('$5,000.00');
  });

  it('formats cents correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats large amounts with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });

  it('formats negative amounts', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('500');
  });

  it('formats small decimal amounts', () => {
    expect(formatCurrency(0.99)).toBe('$0.99');
  });
});

// ============================================================
// formatDate
// ============================================================

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2026-04-15');
    expect(result).toContain('Apr');
    expect(result).toContain('2026');
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date(2026, 0, 1));
    expect(result).toContain('Jan');
    expect(result).toContain('2026');
  });

  it('handles year-end dates', () => {
    const result = formatDate('2026-12-31');
    expect(result).toContain('Dec');
    expect(result).toContain('2026');
  });
});

// ============================================================
// formatSqft
// ============================================================

describe('formatSqft', () => {
  it('formats with comma separators and SF suffix', () => {
    expect(formatSqft(2500)).toBe('2,500 SF');
  });

  it('formats large values', () => {
    expect(formatSqft(50000)).toBe('50,000 SF');
  });

  it('formats zero', () => {
    expect(formatSqft(0)).toBe('0 SF');
  });

  it('formats without commas for small values', () => {
    expect(formatSqft(500)).toBe('500 SF');
  });
});

// ============================================================
// cn
// ============================================================

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('merges conflicting tailwind classes', () => {
    // tailwind-merge should resolve conflicting padding
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('handles undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });
});
