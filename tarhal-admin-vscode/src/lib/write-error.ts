import { parseApiError } from '@/services/api';
import type { useT } from '@/i18n/use-i18n';

/** Database and stack-trace text must never reach the screen. */
const RAW_TEXT = /prisma|invocation|constraint|\bP\d{4}\b|database|\bsql\b|\n/i;

/**
 * Explains a failed save in the admin's language. A 400 or 409 also shows the server's own text, unless it is raw database text.
 * A 5xx only ever shows the translated message.
 */
export function friendlyWriteError(error: unknown, t: ReturnType<typeof useT>): string {
  const { status, kind, message } = parseApiError(error);
  if (kind === 'timeout') return t('errTimeout');
  if (kind === 'network') return t('errNetwork');
  const detail = message && !RAW_TEXT.test(message) ? ` (${message})` : '';
  if (status === 400 || status === 422) return t('errBadRequest') + detail;
  if (status === 401) return t('errUnauthorized');
  if (status === 403) return t('errForbidden');
  if (status === 404) return t('errNotFound');
  if (status === 409) return t('errConflict') + detail;
  if (status && status >= 500) return t('errServer');
  return t('errGeneric') + detail;
}
