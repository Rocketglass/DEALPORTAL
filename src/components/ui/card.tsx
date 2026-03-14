import { forwardRef } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  border?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, border = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl bg-white shadow-sm',
        border && 'border border-border',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

/* -------------------------------------------------------------------------- */
/* CardHeader                                                                  */
/* -------------------------------------------------------------------------- */

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  borderBottom?: boolean;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, icon: Icon, borderBottom = true, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-2 px-5 py-4',
        borderBottom && 'border-b border-border',
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="h-4.5 w-4.5 text-muted-foreground" />}
      {children}
    </div>
  ),
);
CardHeader.displayName = 'CardHeader';

/* -------------------------------------------------------------------------- */
/* CardTitle                                                                   */
/* -------------------------------------------------------------------------- */

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-sm font-semibold', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

/* -------------------------------------------------------------------------- */
/* CardDescription                                                             */
/* -------------------------------------------------------------------------- */

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  ),
);
CardDescription.displayName = 'CardDescription';

/* -------------------------------------------------------------------------- */
/* CardContent                                                                 */
/* -------------------------------------------------------------------------- */

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

/* -------------------------------------------------------------------------- */
/* CardFooter                                                                  */
/* -------------------------------------------------------------------------- */

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-5 py-3 border-t border-border bg-muted/30',
        className,
      )}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
