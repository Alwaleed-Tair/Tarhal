import { useMemo } from 'react';
import { translate, type TranslationKey, type TranslationParams } from '@/i18n/translations';
import { createFormatters } from '@/i18n/format';
import { useCurrency } from '@/store/currencyStore';
import { useDemoState } from '@/store/demoStore';

export function useT() {
  const { language } = useDemoState().settings;
  return (key: TranslationKey, params?: TranslationParams) => translate(language, key, params);
}

/** Locale-aware number, currency, date and month formatting for the active language. */
export function useFormat() {
  const { language } = useDemoState().settings;
  const currency = useCurrency();
  return useMemo(() => createFormatters(language, currency), [language, currency]);
}
