import { cn } from '@/lib/utils';

/**
 * Status color palette — uses tinted backgrounds that harmonize with the
 * design system's blue-tinted neutral palette. Each semantic group maps to
 * a consistent hue: blue for info/active, amber for pending/warning,
 * green for success, red for error/destructive, neutral for inactive.
 */
export const STATUS_COLORS: Record<string, { bg: string; text: string; dot?: string }> = {
  // --- Semantic groups -------------------------------------------------------
  // Info / in-progress (primary blue tint)
  submitted: { bg: 'bg-primary-subtle', text: 'text-primary', dot: 'bg-primary' },
  sent: { bg: 'bg-primary-subtle', text: 'text-primary', dot: 'bg-primary' },
  review: { bg: 'bg-primary-subtle', text: 'text-primary', dot: 'bg-primary' },
  occupied: { bg: 'bg-primary-subtle', text: 'text-primary', dot: 'bg-primary' },
  leased: { bg: 'bg-primary-subtle', text: 'text-primary', dot: 'bg-primary' },
  completed: { bg: 'bg-primary-subtle', text: 'text-primary', dot: 'bg-primary' },
  proposed: { bg: 'bg-primary-subtle', text: 'text-primary', dot: 'bg-primary' },
  lease: { bg: 'bg-primary-subtle', text: 'text-primary' },
  industrial: { bg: 'bg-primary-subtle', text: 'text-primary' },

  // Pending / warning (amber)
  under_review: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  in_negotiation: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  sent_for_signature: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  partially_signed: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  countered: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  info_requested: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  retail: { bg: 'bg-amber-50', text: 'text-amber-700' },

  // Success (green)
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  agreed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  executed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  vacant: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  accepted: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  sale: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  office: { bg: 'bg-emerald-50', text: 'text-emerald-700' },

  // Destructive (red)
  rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-600' },
  overdue: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-600' },
  terminated: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-600' },
  no_show: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-600' },

  // Neutral (muted)
  draft: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  withdrawn: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  expired: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  cancelled: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  void: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  inactive: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  maintenance: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  mixed: { bg: 'bg-muted', text: 'text-muted-foreground' },

  // Accent (purple — rare, attention-getting)
  commercial: { bg: 'bg-violet-50', text: 'text-violet-700' },
};

const DEFAULT_COLORS = { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' };

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-0.5 text-[11px]',
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
