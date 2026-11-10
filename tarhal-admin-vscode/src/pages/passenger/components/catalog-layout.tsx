import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, type LucideIcon } from 'lucide-react';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { PassengerShell } from './passenger-shell';
import Sidebar from './passenger-sidebar';

type Props = { icon: LucideIcon; eyebrow: TranslationKey; title1: TranslationKey; title2: TranslationKey; note: TranslationKey; children: ReactNode };

/**
 * The hotels and cars search pages, built from the parts of Tariq's booking page: his blue page, rail, header, hero and
 * white step panel. Only the content of the panel is new.
 */
export function CatalogLayout({ icon: Icon, eyebrow, title1, title2, note, children }: Props) {
  const t = useT();
  return (
    <PassengerShell>
      <main className="tarhal-page catalog-page">
        <Sidebar />
        <div className="tarhal-shell catalog-shell">
          <header className="site-header">
            <div className="brand-slot" aria-label="Tarhal"><span className="brand-fallback">TARHAL</span></div>
            <span className="header-note"><span className="header-dot" />{t('tpHeaderNote')}</span>
          </header>
          <section className="welcome" aria-labelledby="welcome-title">
            <div className="welcome-copy">
              <p className="eyebrow">{t(eyebrow)}</p>
              <h1 id="welcome-title">{t(title1)}<br />{t(title2)}</h1>
              <p className="welcome-note">{t(note)}</p>
            </div>
            <div className="hero-art-reserved" aria-hidden="true">
              <span className="hero-orbit-ring hero-orbit-ring-outer" />
              <span className="hero-orbit-ring hero-orbit-ring-inner" />
              <span className="hero-orbit-dot hero-orbit-dot-one" />
              <span className="hero-orbit-dot hero-orbit-dot-two" />
              <span className="hero-orbit-dot hero-orbit-dot-three" />
              <span className="hero-orbit-globe"><Icon size={23} strokeWidth={1.5} /></span>
            </div>
          </section>
          {children}
          <footer className="page-footer"><span>{t('tpFooter')}</span></footer>
        </div>
      </main>
    </PassengerShell>
  );
}

/** Previous / next in his back-button style, with "page x of y". */
export function CatalogPager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  const t = useT();
  const format = useFormat();
  if (totalPages <= 1) return null;
  return (
    <nav className="catalog-pager" aria-label={t('paginationLabel')}>
      <button type="button" className="back-button" disabled={page <= 1} onClick={() => onPage(page - 1)} data-testid="pager-previous">
        <ArrowLeft className="rtl:-scale-x-100" size={16} aria-hidden="true" /> {t('previous')}
      </button>
      <span aria-live="polite">{t('tpPageOf', { page: format.number(page), total: format.number(totalPages) })}</span>
      <button type="button" className="back-button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} data-testid="pager-next">
        {t('next')} <ArrowRight className="rtl:-scale-x-100" size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
