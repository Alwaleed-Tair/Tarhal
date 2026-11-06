import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormat, useT } from '@/i18n/use-i18n';

/** [1, '…', 4, 5, 6, '…', 12]: first, last and the pages around the current one. */
function getPageItems(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const items: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) items.push('…');
  for (let value = start; value <= end; value += 1) items.push(value);
  if (end < total - 1) items.push('…');
  items.push(total);
  return items;
}

export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  const t = useT();
  const format = useFormat();

  return (
    <nav aria-label={t('paginationLabel')} className="flex flex-wrap items-center justify-center gap-1.5">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={t('previous')}>
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        <span className="hidden sm:inline">{t('previous')}</span>
      </Button>

      <ul className="flex items-center gap-1.5">
        {getPageItems(page, totalPages).map((item, index) => (
          <li key={`${item}-${index}`}>
            {item === '…' ? (
              <span className="grid size-9 place-items-center text-muted-foreground" aria-hidden="true">…</span>
            ) : (
              <Button variant={item === page ? 'default' : 'ghost'} size="icon" className="size-9" aria-current={item === page ? 'page' : undefined}
                aria-label={t('goToPage', { page: item })} onClick={() => onPageChange(item)}>
                {format.number(item)}
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label={t('next')}>
        <span className="hidden sm:inline">{t('next')}</span>
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
      </Button>
    </nav>
  );
}
