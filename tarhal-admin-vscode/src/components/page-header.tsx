import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useT } from '@/i18n/use-i18n';

/** "Admin › Flights": the category above the page title. The last crumb is the current page. */
function Breadcrumb({ section }: { section: string }) {
  const t = useT();
  return (
    <nav aria-label={t('breadcrumb')} className="breadcrumb">
      <Link href="/dashboard">{t('breadcrumbAdmin')}</Link>
      <ChevronRight size={13} className="rtl:rotate-180" aria-hidden="true" />
      <span aria-current="page">{section}</span>
    </nav>
  );
}

/** Small pill next to the title for quick context ("12 records", "Demo data"). `tone` colours the dot. */
export function ContextBadge({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'success' | 'warning' }) {
  return <span className={`context-badge context-badge-${tone}`}>{children}</span>;
}

type PageHeaderProps = {
  /** Category shown in the breadcrumb, usually the sidebar label of the page. */
  section: string;
  title: string;
  subtitle: string;
  badges?: ReactNode;
  /** Right-hand side: search, filters, buttons. */
  actions?: ReactNode;
};

export function PageHeader({ section, title, subtitle, badges, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        <Breadcrumb section={section} />
        <div className="page-title-row">
          <h1>{title}</h1>
          {badges}
        </div>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </header>
  );
}
