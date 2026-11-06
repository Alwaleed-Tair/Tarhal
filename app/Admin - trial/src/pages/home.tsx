import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { Car, Hotel, Plane, ShieldCheck, Tag, Headset, type LucideIcon } from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';
import { SearchFormSlot } from '@/components/search-form-slot';
import { Card, CardContent } from '@/components/ui/card';
import { routes } from '@/config/routes';
import type { TranslationKey } from '@/i18n/translations';
import { useT } from '@/i18n/use-i18n';

const SERVICES: { href: string; icon: LucideIcon; title: TranslationKey; text: TranslationKey }[] = [
  { href: '#search', icon: Plane, title: 'flights', text: 'serviceFlightsDesc' },
  { href: routes.stays, icon: Hotel, title: 'hotels', text: 'serviceHotelsDesc' },
  { href: routes.rentals, icon: Car, title: 'cars', text: 'serviceCarsDesc' },
];
const BENEFITS: { icon: LucideIcon; title: TranslationKey; text: TranslationKey }[] = [
  { icon: Tag, title: 'benefit1Title', text: 'benefit1Text' },
  { icon: ShieldCheck, title: 'benefit2Title', text: 'benefit2Text' },
  { icon: Headset, title: 'benefit3Title', text: 'benefit3Text' },
];

/** Hash targets (#search) need a plain anchor; wouter's Link is for routes. */
function ServiceLink({ href, children }: { href: string; children: ReactNode }) {
  const className = 'group rounded-xl focus-visible:outline-offset-4';
  return href.startsWith('#') ? <a href={href} className={className}>{children}</a> : <Link href={href} className={className}>{children}</Link>;
}

export default function Home() {
  const t = useT();
  return (
    <PublicLayout>
      <div className="grid gap-12 sm:gap-16">
        <section className="grid gap-6 text-center">
          <div className="mx-auto grid max-w-2xl gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">{t('heroTitle')}</h1>
            <p className="text-base text-muted-foreground sm:text-lg">{t('heroSubtitle')}</p>
          </div>
          {/* TODO / INTEGRATION POINT: Connect Tariq's Search API here. Render his form as the child: <SearchFormSlot><TripSearchForm /></SearchFormSlot> */}
          <SearchFormSlot />
        </section>

        <section aria-labelledby="explore-title" className="grid gap-5">
          <h2 id="explore-title" className="text-xl font-bold text-foreground sm:text-2xl">{t('exploreTitle')}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {SERVICES.map(({ href, icon: Icon, title, text }) => (
              <ServiceLink key={title} href={href}>
                <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg">
                  <CardContent className="grid gap-2 p-5">
                    <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true" /></span>
                    <h3 className="font-semibold text-foreground">{t(title)}</h3>
                    <p className="text-sm text-muted-foreground">{t(text)}</p>
                  </CardContent>
                </Card>
              </ServiceLink>
            ))}
          </div>
        </section>

        <section aria-labelledby="benefits-title" className="grid gap-5">
          <h2 id="benefits-title" className="text-xl font-bold text-foreground sm:text-2xl">{t('benefitsTitle')}</h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3 rounded-xl border bg-card p-4">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div><h3 className="font-semibold text-foreground">{t(title)}</h3><p className="mt-1 text-sm text-muted-foreground">{t(text)}</p></div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PublicLayout>
  );
}
