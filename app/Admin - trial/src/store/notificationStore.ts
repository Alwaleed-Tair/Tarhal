import { useSyncExternalStore } from 'react';
import type { TranslationKey, TranslationParams } from '@/i18n/translations';

export type NoticeTone = 'success' | 'info' | 'warning' | 'error';

/** Stores translation keys (not text) so open toasts and history follow a language switch. */
export type Notice = {
  id: number;
  tone: NoticeTone;
  titleKey: TranslationKey;
  messageKey: TranslationKey;
  params?: TranslationParams;
  createdAt: number;
  read: boolean;
};

type NotificationState = { history: Notice[]; toastIds: number[] };

const MAX_HISTORY = 30;
const listeners = new Set<() => void>();
let nextId = 1;
let state: NotificationState = { history: [], toastIds: [] };

function setState(next: NotificationState) {
  state = next;
  listeners.forEach((listener) => listener());
}

/** Shows a toast and records it in the bell menu. Call it from any admin action. */
export function notify(input: Pick<Notice, 'tone' | 'titleKey' | 'messageKey' | 'params'>): number {
  const notice: Notice = { ...input, id: nextId++, createdAt: Date.now(), read: false };
  setState({ history: [notice, ...state.history].slice(0, MAX_HISTORY), toastIds: [...state.toastIds, notice.id] });
  return notice.id;
}

export function dismissToast(id: number) {
  setState({ ...state, toastIds: state.toastIds.filter((toastId) => toastId !== id) });
}

export function markAllRead() {
  if (state.history.some((notice) => !notice.read)) setState({ ...state, history: state.history.map((notice) => ({ ...notice, read: true })) });
}

export function clearHistory() {
  setState({ ...state, history: [] });
}

export function useNotifications() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => state,
  );
}
