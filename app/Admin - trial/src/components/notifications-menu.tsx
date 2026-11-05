import { useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useDismiss } from '@/hooks/use-dismiss';
import { useFormat, useT } from '@/i18n/use-i18n';
import { clearHistory, markAllRead, useNotifications } from '@/store/notificationStore';

export function NotificationsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useT();
  useDismiss(menuRef, isOpen, () => setIsOpen(false));
  const format = useFormat();
  const { history } = useNotifications();
  const unread = history.filter((notice) => !notice.read).length;

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="top-action notif-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={t('notifications')}
        data-testid="button-notifications"
      >
        <Bell size={17} />
        {unread > 0 && <span className="notif-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {isOpen && (
        <div className="user-dropdown notif-dropdown">
          {history.length === 0 ? (
            <p className="notif-empty">{t('noNotifications')}</p>
          ) : (
            <ul className="notif-list">
              {history.map((notice) => (
                <li key={notice.id} className={`notif-item notif-${notice.tone} ${notice.read ? '' : 'unread'}`}>
                  <strong>{t(notice.titleKey)}</strong>
                  <span>{t(notice.messageKey, notice.params)}</span>
                  <time>{format.time(notice.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
          {history.length > 0 && (
            <>
              <button onClick={markAllRead} data-testid="button-notif-read">{t('markAllRead')}</button>
              <button onClick={clearHistory} data-testid="button-notif-clear">{t('clearAll')}</button>
            </>
          )}
          <button onClick={() => setIsOpen(false)} data-testid="button-notif-close">{t('close')}</button>
        </div>
      )}
    </div>
  );
}
