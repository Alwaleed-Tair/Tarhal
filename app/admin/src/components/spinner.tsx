import { Loader2 } from 'lucide-react';
import { useT } from '@/i18n/use-i18n';

export function Spinner() {
  const t = useT();
  return (
    <div role="status" aria-busy="true" className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-muted-foreground">
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />{t('loading')}
    </div>
  );
}
