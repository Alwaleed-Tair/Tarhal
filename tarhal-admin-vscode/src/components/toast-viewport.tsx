import { useEffect, useRef } from 'react';
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import { useT } from '@/i18n/use-i18n';
import { dismissToast, useNotifications, type Notice, type NoticeTone } from '@/store/notificationStore';
import { useDemoState } from '@/store/demoStore';

const ICONS: Record<NoticeTone, typeof Info> = { success: CircleCheck, info: Info, warning: TriangleAlert, error: CircleX };
const MAX_VISIBLE = 4;
const DURATION_MS = 5000;
const DURATION_LARGE_TEXT_MS = 9000; // more reading time in Senior Mode

function Toast({ notice, duration }: { notice: Notice; duration: number }) {
  const t = useT();
  const timer = useRef<number | undefined>(undefined);
  const Icon = ICONS[notice.tone];

  const stop = () => window.clearTimeout(timer.current);
  const start = () => { stop(); timer.current = window.setTimeout(() => dismissToast(notice.id), duration); };

  useEffect(() => { start(); return stop; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`toast toast-${notice.tone}`}
      role={notice.tone === 'error' ? 'alert' : undefined}
      onMouseEnter={stop}
      onMouseLeave={start}
      onFocus={stop}
      onBlur={start}
      data-testid={`toast-${notice.tone}`}
    >
      <Icon className="toast-icon" size={20} aria-hidden="true" />
      <div className="toast-body">
        <strong>{t(notice.titleKey)}</strong>
        <span>{t(notice.messageKey, notice.params)}</span>
      </div>
      <button className="toast-close" type="button" onClick={() => dismissToast(notice.id)} aria-label={t('close')}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Mount once in App.tsx so toasts survive page navigation. */
export default function ToastViewport() {
  const { history, toastIds } = useNotifications();
  const { settings } = useDemoState();
  const duration = settings.largerText ? DURATION_LARGE_TEXT_MS : DURATION_MS;
  const toasts = history.filter((notice) => toastIds.includes(notice.id)).reverse().slice(-MAX_VISIBLE);

  // The live region stays mounted so screen readers announce toasts as they appear.
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((notice) => <Toast key={notice.id} notice={notice} duration={duration} />)}
    </div>
  );
}
