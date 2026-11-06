import { useLayoutEffect } from 'react';
import { useDemoState } from '@/store/demoStore';

/** Applies language, direction, theme and accessibility classes to <html>. Call once in App. */
export function useDocumentSettings() {
  const { settings } = useDemoState();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.lang = settings.language;
    root.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    root.classList.toggle('dark', settings.theme === 'dark');
    root.classList.toggle('accessibility-large', settings.largerText);
    root.classList.toggle('accessibility-contrast', settings.highContrast);
  }, [settings]);
}
