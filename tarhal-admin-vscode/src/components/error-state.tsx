import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/use-i18n';

/** Shown when loading fails. Pass `onRetry` to render the "Try again" button. */
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="grid justify-items-center gap-3 px-5 py-12 text-center">
      <TriangleAlert className="size-8 text-destructive" aria-hidden="true" />
      <div>
        <p className="font-semibold text-foreground">{t('errorTitle')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('errorMessage')}</p>
      </div>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>{t('retry')}</Button>}
    </div>
  );
}
