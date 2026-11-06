import { useRef, useState, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { Accessibility, BriefcaseBusiness, CarFront, ChevronDown, CircleUserRound, FileText, Gauge, Hotel, Languages, Menu, Moon, Plane, Search, Settings2, Sun, Users, X } from 'lucide-react';
import { useT } from '@/i18n/use-i18n';
import { CurrencySelect } from '@/components/currency-select';
import { NotificationsMenu } from '@/components/notifications-menu';
import { setSeniorMode, updateSettings, useDemoState } from '@/store/demoStore';
import { brand } from '@/config/branding';
import { useDismiss } from '@/hooks/use-dismiss';

// Main navigation items shown in the sidebar, mobile menu, and search suggestions.
const navItems = [
  { href: '/dashboard', key: 'dashboard' as const, icon: Gauge },
  { href: '/flights', key: 'flights' as const, icon: Plane },
  { href: '/hotels', key: 'hotels' as const, icon: Hotel },
  { href: '/cars', key: 'cars' as const, icon: CarFront },
  { href: '/bookings', key: 'bookings' as const, icon: FileText },
  { href: '/revenue', key: 'revenue' as const, icon: BriefcaseBusiness },
  { href: '/users', key: 'users' as const, icon: Users },
  { href: '/settings', key: 'settings' as const, icon: Settings2 },
];

// Re-exported so existing `import { useT } from '@/components/layout'` lines keep working.
export { useT };

function Logo() {
  const [failed, setFailed] = useState(false);
  const t = useT();
  return (
    <Link className="brand" href="/dashboard" aria-label={`${brand.name} — ${t('dashboard')}`} title={t('dashboard')}>
      {failed
        ? <span className="brand-mark" aria-hidden="true">{brand.name[0]}</span>
        : <img src={brand.logoSrc} alt="" onError={() => setFailed(true)} />}
      <span className="brand-text">
        <span className="brand-name">{brand.name.toUpperCase()}</span>
      </span>
    </Link>
  );
}

// Theme pill + language pill shown together under the logo (same look as the original theme pill).
function LogoControls() {
  const t = useT();
  const { settings } = useDemoState();
  const isArabic = settings.language === 'ar';
  const isDark = settings.theme === 'dark';
  return (
    <div className="logo-controls">
      <button
        className="theme-pill"
        data-testid="button-theme-toggle"
        onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
        aria-label={isDark ? t('switchToLight') : t('switchToDark')}
        aria-pressed={isDark}
      >
        <span className={!isDark ? 'selected' : ''}><Sun size={14} /></span>
        <span className={isDark ? 'selected' : ''}><Moon size={14} /></span>
      </button>
      <button
        className="lang-pill"
        data-testid="button-language-toggle"
        onClick={() => updateSettings({ language: isArabic ? 'en' : 'ar' })}
        aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
      >
        <Languages size={15} aria-hidden="true" />
        <span lang={isArabic ? 'en' : 'ar'}>{isArabic ? t('english') : t('arabic')}</span>
      </button>
    </div>
  );
}

function Sidebar({ onNavClick }: { onNavClick: () => void }) {
  const [location] = useLocation();
  const t = useT();

  return (
    <aside className="sidebar">
      <Logo />
      <LogoControls />
      <nav className="nav-list" aria-label={t('mainNavigation')}>
        {navItems.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link ${location === href ? 'active' : ''}`}
            aria-current={location === href ? 'page' : undefined}
            data-testid={`link-${key}`}
            onClick={onNavClick}
          >
            <span className="nav-icon"><Icon size={17} /></span>
            <span>{t(key)}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-foot" />
    </aside>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [location] = useLocation();
  const t = useT();

  return (
    <div className={`mobile-nav ${open ? 'open' : ''}`} aria-hidden={!open}>
      <button className="mobile-close" onClick={onClose} aria-label={t('closeNavigation')}><X /></button>
      <Logo />
      <LogoControls />
      <nav className="nav-list">
        {navItems.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link ${location === href ? 'active' : ''}`}
            aria-current={location === href ? 'page' : undefined}
            onClick={onClose}
          >
            <span className="nav-icon"><Icon size={17} /></span>
            {t(key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function GlobalSearch() {
  const [, setLocation] = useLocation();
  const t = useT();

  // TODO / INTEGRATION POINT: Connect Tariq's Search API here
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const term = search.trim().toLowerCase();

  const suggestions = term
    ? navItems.filter(({ key }) => t(key).toLowerCase().includes(term))
    : [];

  function goToPage(href: string) {
    setLocation(href);
    setSearch('');
    setIsOpen(false);
  }

  function handleChange(value: string) {
    setSearch(value);
    setIsOpen(true);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (event.key !== 'Enter') return;
    if (suggestions.length > 0) {
      goToPage(suggestions[0].href);
    }
  }

  return (
    <div className="global-search-wrap">
      <label className="global-search">
        <Search size={15} />
        <input
          value={search}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={t('search')}
          aria-label={t('search')}
          data-testid="input-global-search"
        />
      </label>

      {isOpen && suggestions.length > 0 && (
        <div className="search-suggestions" role="listbox">
          {suggestions.map(({ href, key, icon: Icon }) => (
            <button
              key={href}
              className="search-suggestion"
              onMouseDown={() => goToPage(href)}
              data-testid={`suggestion-page-${key}`}
            >
              <span className="search-suggestion-icon"><Icon size={15} /></span>
              <span className="search-suggestion-id">{t(key)}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && term && suggestions.length === 0 && (
        <div className="search-suggestions">
          <span className="search-suggestion-empty">{t('noResults')}</span>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useT();
  useDismiss(menuRef, isOpen, () => setIsOpen(false));

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        data-testid="button-user-menu"
      >
        <CircleUserRound size={17} />
        {t('admin')}
        <ChevronDown size={15} />
      </button>
      {isOpen && (
        <div className="user-dropdown">
          <button
            onClick={() => { setIsOpen(false); setLocation('/settings'); }}
            data-testid="button-user-settings"
          >
            {t('settings')}
          </button>
          <button onClick={() => setIsOpen(false)} data-testid="button-user-close">{t('close')}</button>
        </div>
      )}
    </div>
  );
}

function SeniorModeButton() {
  const { settings } = useDemoState();
  const t = useT();
  const active = settings.largerText && settings.highContrast;

  return (
    <button
      className={`top-action senior-toggle ${active ? 'active' : ''}`}
      onClick={() => setSeniorMode(!active)}
      aria-pressed={active}
      aria-label={t('seniorMode')}
      title={t('seniorMode')}
      data-testid="button-senior-mode"
    >
      <Accessibility size={17} />
    </button>
  );
}

function Topbar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const t = useT();
  return (
    <header className="topbar">
      <button className="menu-toggle" onClick={onOpenMobileMenu} aria-label={t('openNavigation')}>
        <Menu size={20} />
      </button>
      <GlobalSearch />
      <CurrencySelect />
      <SeniorModeButton />
      <NotificationsMenu />
      <UserMenu />
    </header>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar onNavClick={() => setMenuOpen(false)} />
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="main-shell">
        <Topbar onOpenMobileMenu={() => setMenuOpen(true)} />
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  );
}