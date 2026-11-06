import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useT } from '@/i18n/use-i18n';
import { cn } from '@/lib/utils';

/**
 * Container for the trip search form (Tariq's component).
 * Drop it in as children when it is ready:
 *
 *   <SearchFormSlot><TripSearchForm /></SearchFormSlot>
 *
 * Without children it shows a placeholder, so the home page layout is already final.
 */
// TODO / INTEGRATION POINT: Connect Tariq's Search API here
export function SearchFormSlot({ children, className }: { children?: ReactNode; className?: string }) {
  const t = useT();
  return (
    <section id="search" aria-label={t('searchSlotTitle')} data-testid="search-form-slot"
      className={cn('w-full scroll-mt-24 rounded-2xl border bg-card p-4 shadow-lg sm:p-6', className)}>
      {children ?? (
        <div className="grid min-h-40 place-items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-8 text-center">
          <Search className="size-7 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground">{t('searchSlotTitle')}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{t('searchSlotPlaceholder')}</p>
        </div>
      )}
    </section>
  );
}
