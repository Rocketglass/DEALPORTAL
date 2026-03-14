import { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, required, id: externalId, readOnly, disabled, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const describedBy = [
      error ? errorId : undefined,
      hint && !error ? hintId : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-medium text-muted-foreground"
          >
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-150 resize-none',
            'focus-visible:outline-none',
            error
              ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/20'
              : 'border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
            disabled && 'opacity-50 bg-muted cursor-not-allowed',
            readOnly && 'bg-muted/50 focus-visible:ring-0 focus-visible:border-border',
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1 flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1 text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export { Textarea };
