import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '--';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDocumentDate(date: string | Date | null | undefined): string {
  if (!date) return '--';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatSqft(sf: number | null | undefined): string {
  if (sf == null) return '--';
  return new Intl.NumberFormat('en-US').format(sf) + ' SF';
}

export function formatPerSqft(rate: number | null | undefined): string {
  if (rate == null) return '--';
  return `$${rate.toFixed(2)}/SF/mo`;
}
