import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { useFormat, useT } from '@/i18n/use-i18n';

/**
 * How long the seats stay held (POST /api/flights/:id/hold returns `heldUntil`), in Tariq's chip style.
 * Without a time from the API it only says the hold lasts 10 minutes. The page itself handles the end of the hold.
 */
export function HoldTimer({ until }: { until: string | null }) {
  const t = useT();
  const format = useFormat();
  const end = until ? Date.parse(until) : NaN;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (Number.isNaN(end)) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [end]);

  if (Number.isNaN(end)) return <p className="flight-chip hold-chip" role="status"><Clock3 size={14} aria-hidden="true" />{t('tpHeldTenMinutes')}</p>;
  const left = Math.max(0, Math.round((end - now) / 1000));
  const time = `${format.number(Math.floor(left / 60))}:${format.number(left % 60).padStart(2, '0')}`;
  return (
    <p className={`flight-chip hold-chip${left <= 60 ? ' hold-chip-ending' : ''}`} role="timer" aria-label={t('tpHeldFor', { time })} data-testid="hold-timer">
      <Clock3 size={14} aria-hidden="true" />
      <span aria-hidden="true">{t('tpHeldFor', { time })}</span>
    </p>
  );
}
