import { Link } from 'wouter';
import { brand } from '@/config/branding';
import { routes } from '@/config/routes';
import { useT } from '@/i18n/use-i18n';
import { useAuth } from '@/store/authStore';

export function Footer() {
  const t = useT();
  const { isLoggedIn } = useAuth();
  const linkClass = 'text-sm text-muted-foreground transition-colors hover:text-foreground';

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="grid content-start gap-2">
          <span className="text-lg font-bold tracking-wide text-foreground">{brand.name}</span>
          <p className="max-w-xs text-sm text-muted-foreground">{t('footerTagline')}</p>
        </div>
        <nav aria-label={t('footerExplore')} className="grid content-start gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t('footerExplore')}</h2>
          <Link href={routes.home} className={linkClass}>{t('home')}</Link>
          <Link href={routes.stays} className={linkClass}>{t('hotels')}</Link>
          <Link href={routes.rentals} className={linkClass}>{t('cars')}</Link>
        </nav>
        <nav aria-label={t('footerAccount')} className="grid content-start gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t('footerAccount')}</h2>
          {isLoggedIn ? (
            <Link href={routes.admin.dashboard} className={linkClass}>{t('adminDashboard')}</Link>
          ) : (
            <>
              <Link href={routes.login} className={linkClass}>{t('login')}</Link>
              <Link href={routes.register} className={linkClass}>{t('register')}</Link>
            </>
          )}
        </nav>
      </div>
      <div className="border-t px-4 py-4 text-center text-xs text-muted-foreground">{t('footerRights', { year: new Date().getFullYear() })}</div>
    </footer>
  );
}
