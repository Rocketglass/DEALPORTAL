import { forwardRef } from 'react';
import { type LucideIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const variantStyles = {
  primary:
    'bg-primary text-white hover:bg-primary-light shadow-sm shadow-primary/15 hover:shadow-md hover:shadow-primary/20 focus-visible:outline-primary',
  secondary:
    'border border-border bg-[var(--background-raised)] text-foreground hover:bg-muted focus-visible:outline-primary',
  ghost:
    'text-foreground hover:bg-muted focus-visible:outline-primary',
  destructive:
    'bg-destructive text-white hover:bg-red-700 shadow-sm shadow-destructive/15 focus-visible:outline-destructive',
} as const;

const sizeStyles = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
} as const;

const iconOnlySizes = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
} as const;

export type ButtonVariant = keyof typeof variantStyles;
export type ButtonSize = keyof typeof sizeStyles;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon: Icon,
      iconPosition = 'left',
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const isIconOnly = Icon && !children;
    const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'focus-visible:outline-2 focus-visible:outline-offset-2',
          variantStyles[variant],
          isIconOnly ? iconOnlySizes[size] : sizeStyles[size],
          isDisabled && 'opacity-50 cursor-not-allowed',
          !isIconOnly && 'rounded-lg',
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className={cn(iconSize, 'animate-spin')} />}
        {!loading && Icon && iconPosition === 'left' && (
          <Icon className={iconSize} />
        )}
        {children}
        {!loading && Icon && iconPosition === 'right' && (
          <Icon className={iconSize} />
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
