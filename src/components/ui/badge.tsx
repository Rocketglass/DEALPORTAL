import { cn } from '@/lib/utils';

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot?: string }> = {
  // Application statuses
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  under_review: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  withdrawn: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  info_requested: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },

  // LOI statuses
  sent: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  in_negotiation: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  agreed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },

  // Lease statuses
  review: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  sent_for_signature: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  partially_signed: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  executed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  terminated: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },

  // Invoice statuses
  paid: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  void: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },

  // LOI Section statuses
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  proposed: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  accepted: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  countered: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },

  // Inspection booking statuses
  confirmed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  no_show: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },

  // General / unit statuses
  active: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  vacant: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  occupied: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  leased: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  maintenance: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },

  // Comp transaction types
  lease: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  sale: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },

  // Property types (reuse for type badges)
  industrial: { bg: 'bg-blue-100', text: 'text-blue-700' },
  commercial: { bg: 'bg-purple-100', text: 'text-purple-700' },
  retail: { bg: 'bg-amber-100', text: 'text-amber-700' },
  office: { bg: 'bg-green-100', text: 'text-green-700' },
  mixed: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

const DEFAULT_COLORS = { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-0.5 text-xs',
} as const;

export interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export function Badge({ status, size = 'md', dot = false, className }: BadgeProps) {
  const colors = STATUS_COLORS[status] || DEFAULT_COLORS;
  const label = status.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium capitalize',
        sizeStyles[size],
        colors.bg,
        colors.text,
        className,
      )}
      aria-label={`Status: ${label}`}
    >
      {dot && colors.dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
