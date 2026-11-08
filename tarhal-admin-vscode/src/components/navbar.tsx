import { useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronDown, Languages, LayoutDashboard, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { CurrencySelect } from '@/components/currency-select';
import { Button, buttonClasses } from '@/components/ui/button';
import { brand } from '@/config/branding';
import { routes } from '@/config/routes';
import { useDismiss } from '@/hooks/use-dismiss';
import { useSignOut } from '@/hooks/use-sign-out';
import { useT } from '@/i18n/use-i18n';
import { cn } from '@/lib/utils';
import { canUseAdmin, useAuth } from '@/store/authStore';
import { updateSettings, useDemoState } from '@/store/demoStore';

// Shared look for the language + theme controls so they read as one unified pair.
const controlClass = 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';

function BrandLink() {
  const [failed, setFailed] = useState(false);
  return (
    <Link href={routes.home} aria-label={brand.name} className="flex items-center gap-2.5">
      {failed
        ? <span className="grid size-9 place-items-center rounded-lg bg-primary font-bold text-primary-foreground" aria-hidden="true">{brand.name[0]}</span>
        : <img src={brand.logoSrc} alt="" className="h-9 w-auto" onError={() => setFailed(true)} />}
      <span className="text-base font-bold tracking-widest text-foreground">{brand.name.toUpperCase()}</span>
    </Link>
  );
}

function AccountMenu() {
  const t = useT();
  const { user } = useAuth();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  if (!user) return null;

  const itemClass = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-muted';
  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="menu" data-testid="button-account-menu">
        <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground" aria-hidden="true">{user.name[0]?.toUpperCase()}</span>
        <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
        <ChevronDown className="size-4" aria-hidden="true" />
      </Button>
      {open && (
        <div role="menu" className="absolute end-0 top-full z-50 mt-2 w-56 rounded-xl border bg-card p-1.5 shadow-lg">
          <p className="truncate px-3 py-2 text-xs text-muted-foreground" dir="ltr">{user.email}</p>
          {canUseAdmin(user) && (
            <Link href={routes.admin.dashboard} role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <LayoutDashboard className="size-4" aria-hidden="true" />{t('adminDashboard')}
            </Link>
          )}
          <button role="menuitem" className={cn(itemClass, 'text-destructive')} onClick={() => { setOpen(false); signOut(); }} data-testid="button-logout">
            <LogOut className="size-4" aria-hidden="true" />{t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const t = useT();
  const [location] = useLocation();
  const { settings } = useDemoState();
  const { isLoggedIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = settings.theme === 'dark';
  const isArabic = settings.language === 'ar';

  const links = [
    { href: routes.home, label: t('home') },
    { href: routes.stays, label: t('hotels') },
    { href: routes.rentals, label: t('cars') },
  ];
  const linkClass = (href: string) => cn(
    'rounded-full px-3.5 py-2 text-sm font-medium transition-colors hover:bg-muted',
    location === href ? 'bg-muted text-foreground' : 'text-muted-foreground',
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        <BrandLink />

        <nav aria-label={t('mainNavigation')} className="ms-6 hidden items-center gap-1 md:flex">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass(href)} aria-current={location === href ? 'page' : undefined}>{label}</Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-3">
          <CurrencySelect />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className={controlClass} onClick={() => updateSettings({ language: isArabic ? 'en' : 'ar' })}
              aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'} data-testid="button-navbar-language">
              <Languages className="size-4" aria-hidden="true" />
              <span className="min-w-14 text-center" lang={isArabic ? 'en' : 'ar'} dir={isArabic ? 'ltr' : 'rtl'}>{isArabic ? t('english') : t('arabic')}</span>
            </Button>
            <Button variant="ghost" size="icon" className={cn(controlClass, 'size-9 px-0')} onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
              aria-label={isDark ? t('switchToLight') : t('switchToDark')} aria-pressed={isDark} data-testid="button-navbar-theme">
              {isDark ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
            </Button>
          </div>

          {isLoggedIn ? <AccountMenu /> : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link href={routes.login} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>{t('login')}</Link>
              <Link href={routes.register} className={buttonClasses({ size: 'sm' })}>{t('register')}</Link>
            </div>
          )}

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen((current) => !current)}
            aria-expanded={menuOpen} aria-label={menuOpen ? t('closeNavigation') : t('openNavigation')}>
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t bg-background md:hidden">
          <nav aria-label={t('mainNavigation')} className="mx-auto grid max-w-6xl gap-1 px-4 py-3 sm:px-6">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} className={linkClass(href)} onClick={() => setMenuOpen(false)}>{label}</Link>
            ))}
            {!isLoggedIn && (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
                <Link href={routes.login} className={buttonClasses({ variant: 'outline', size: 'sm' })} onClick={() => setMenuOpen(false)}>{t('login')}</Link>
                <Link href={routes.register} className={buttonClasses({ size: 'sm' })} onClick={() => setMenuOpen(false)}>{t('register')}</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
