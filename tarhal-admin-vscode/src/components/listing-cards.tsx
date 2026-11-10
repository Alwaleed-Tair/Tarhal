import { useState } from 'react';
import { Hotel as HotelIcon, MapPin, Settings2, ShieldCheck, Star, Users } from 'lucide-react';
import { Money } from '@/components/money';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import type { Car, Hotel } from '@/data/listings';
import { translateValue } from '@/i18n/labels';
import { useFormat, useT } from '@/i18n/use-i18n';
import { notify } from '@/store/notificationStore';
import { useDemoState } from '@/store/demoStore';

/** Mock "Book now": there is no booking backend yet, so it only confirms with a toast. */
function useBookNow() {
  return (name: string) => notify({ tone: 'info', titleKey: 'demoActionTitle', messageKey: 'demoActionMessage', params: { name } });
}

export function HotelCard({ hotel }: { hotel: Hotel }) {
  const t = useT();
  const format = useFormat();
  const bookNow = useBookNow();
  const { language } = useDemoState().settings;
  const [imageFailed, setImageFailed] = useState(false);
  const name = language === 'ar' ? hotel.nameAr : hotel.name;
  const address = language === 'ar' ? hotel.addressAr : hotel.address;

  return (
    <Card className="flex w-full flex-col overflow-hidden transition-shadow hover:shadow-lg" data-testid={`hotel-card-${hotel.id}`}>
      <div className="relative aspect-[16/10] bg-gradient-to-br from-primary/25 to-muted">
        {imageFailed
          ? <div className="grid size-full place-items-center text-primary"><HotelIcon className="size-10" aria-hidden="true" /></div>
          : <img src={hotel.image} alt={name} loading="lazy" className="size-full object-cover" onError={() => setImageFailed(true)} />}
        <span className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-sm font-semibold text-foreground shadow">
          <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
          <span aria-label={t('ratingLabel', { rating: format.rating(hotel.rating) })}>{format.rating(hotel.rating)}</span>
        </span>
      </div>
      <CardContent className="grid flex-1 content-start gap-1.5 p-4">
        <h3 className="text-base font-semibold text-foreground">{name}</h3>
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{address}</p>
        {hotel.pricePerNight !== undefined && <p className="text-lg font-bold text-foreground"><Money sar={hotel.pricePerNight} /><span className="text-sm font-normal text-muted-foreground"> {t('perNight')}</span></p>}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full" size="sm" onClick={() => bookNow(name)}>{t('bookNow')}</Button>
      </CardFooter>
    </Card>
  );
}

export function CarCard({ car }: { car: Car }) {
  const t = useT();
  const format = useFormat();
  const bookNow = useBookNow();
  const { language } = useDemoState().settings;
  const title = `${translateValue(car.make, language)} ${translateValue(car.model, language)}`;
  const spec = 'inline-flex items-center gap-1.5 text-sm text-muted-foreground';
  // Split the sentence around {price} so <Money> can draw the symbol inside it, in either language's word order.
  const [insuranceBefore, insuranceAfter] = t('insurancePerDay', { price: '\0' }).split('\0');

  return (
    <Card className="flex w-full flex-col transition-shadow hover:shadow-lg" data-testid={`car-card-${car.id}`}>
      <CardContent className="grid flex-1 content-start gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">{format.year(car.year)}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <span className={spec}><Users className="size-4" aria-hidden="true" />{t('seatsCount', { count: format.number(car.seats) })}</span>
          <span className={spec}><Settings2 className="size-4" aria-hidden="true" />{t(car.transmission === 'Automatic' ? 'automatic' : 'manual')}</span>
        </div>
        <div className="grid gap-1 border-t pt-3">
          <p className="text-xl font-bold text-foreground"><Money sar={car.pricePerDay} /><span className="text-sm font-normal text-muted-foreground"> {t('perDay')}</span></p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><ShieldCheck className="size-4 text-primary" aria-hidden="true" /><span>{insuranceBefore}<Money sar={car.insurancePerDay} />{insuranceAfter}</span></p>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full" size="sm" onClick={() => bookNow(title)}>{t('bookNow')}</Button>
      </CardFooter>
    </Card>
  );
}
