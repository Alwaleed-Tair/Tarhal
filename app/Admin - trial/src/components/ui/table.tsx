import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// shadcn-style table parts. They reuse the project's `.data-table` styles (RTL corners, dark mode,
// high contrast, large text), so every table looks the same. <Table> adds the scroll wrapper.

export function Table({ className, label, ...props }: ComponentProps<'table'> & { label?: string }) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={label}>
      <table className={cn('data-table', className)} {...props} />
    </div>
  );
}
export function TableCaption({ className, ...props }: ComponentProps<'caption'>) { return <caption className={cn('sr-only', className)} {...props} />; }
export function TableHeader(props: ComponentProps<'thead'>) { return <thead {...props} />; }
export function TableBody(props: ComponentProps<'tbody'>) { return <tbody {...props} />; }
export function TableRow(props: ComponentProps<'tr'>) { return <tr {...props} />; }
export function TableHead(props: ComponentProps<'th'>) { return <th scope="col" {...props} />; }
export function TableCell(props: ComponentProps<'td'>) { return <td {...props} />; }
