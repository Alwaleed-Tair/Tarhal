import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const fieldClasses = 'flex h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive';

export function Input({ className, invalid, ...props }: ComponentProps<'input'> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={cn(fieldClasses, className)} {...props} />;
}

/** Native select with the same look as Input. */
export function Select({ className, invalid, ...props }: ComponentProps<'select'> & { invalid?: boolean }) {
  return <select aria-invalid={invalid || undefined} className={cn(fieldClasses, 'cursor-pointer', className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium text-foreground', className)} {...props} />;
}
