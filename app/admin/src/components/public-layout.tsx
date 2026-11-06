import type { ReactNode } from 'react';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { useT } from '@/i18n/use-i18n';

/** Shell for public pages (home, listings, auth, 404). Admin pages keep using <Layout> with the sidebar. */
export function PublicLayout({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#main" className="absolute start-4 top-2 z-[60] -translate-y-20 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:translate-y-0">{t('skipToContent')}</a>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <Footer />
    </div>
  );
}
