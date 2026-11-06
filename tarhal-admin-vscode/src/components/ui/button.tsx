import type { ComponentProps } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-input bg-card text-foreground hover:bg-muted',
  ghost: 'text-foreground hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  link: 'text-primary underline-offset-4 hover:underline',
} as const;

const sizes = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
  icon: 'size-10',
} as const;

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

/** Class names for the Button look, so a router <Link> can be styled as a button too. */
export function buttonClasses({ variant = 'default', size = 'md', className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-all duration-200',
    'active:scale-[.98] disabled:pointer-events-none disabled:opacity-50',
    variants[variant], sizes[size], className,
  );
}

export type ButtonProps = ComponentProps<'button'> & { variant?: Variant; size?: Size; loading?: boolean };

export function Button({ className, variant, size, loading = false, disabled, type = 'button', children, ...props }: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClasses({ variant, size, className })} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
