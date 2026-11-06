import { statusLabel } from '@/i18n/labels';
import { useT } from '@/i18n/use-i18n';

/** Pill badge for any booking / user / listing status. Colours come from the `.status-*` classes. */
export function StatusBadge({ status }: { status: string }) {
  const t = useT();
  return <span className={`status status-pill status-${status.toLowerCase()}`}>{statusLabel(status, t)}</span>;
}
