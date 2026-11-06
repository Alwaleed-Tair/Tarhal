import { SearchX } from 'lucide-react';

/** Friendly "nothing here" block with an optional reset action. */
export function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="empty-state">
      <SearchX size={28} aria-hidden="true" />
      <p>{message}</p>
      {actionLabel && onAction && <button type="button" className="button button-ghost" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}
