import { useMemo, useRef } from 'react';
import { Printer } from 'lucide-react';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { qrMatrix, qrPath } from '@/lib/qr';
import { useDemoState } from '@/store/demoStore';
import { cityLabel, riyadhDay, riyadhTime } from '../trip';

const CLASS_KEY: Record<string, TranslationKey> = { ECONOMY: 'ticketECONOMY', BUSINESS: 'ticketBUSINESS', FIRST: 'ticketFIRST' };

/** What a boarding pass shows. Everything comes from the real booking (GET /api/bookings). */
export type BoardingPassBooking = {
  id: string;
  flight: { flightNumber: string; from: string; to: string; departureTime: string; arrivalTime: string; airline: string; airlineAr: string };
  travelers: { fullName: string; seatCode: string; ticketClass: string }[];
};

/** Short booking reference shown on the pass and in the QR code: the first 8 characters of the booking id. */
export const bookingReference = (id: string) => id.slice(0, 8).toUpperCase();

function QrCode({ text, label }: { text: string; label: string }) {
  const { d, size } = useMemo(() => qrPath(qrMatrix(text)), [text]);
  return (
    <svg className="boarding-qr" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#ffffff" />
      <path d={d} fill="#10263d" />
    </svg>
  );
}

/**
 * Digital boarding pass in Tariq's "Last booking" panel style: his tab, his route line, and a QR code made from the
 * booking reference where his barcode stripes are. One pass per traveler. Shown only for paid, active flight bookings.
 */
export function BoardingPass({ booking }: { booking: BoardingPassBooking }) {
  const t = useT();
  const format = useFormat();
  const { language } = useDemoState().settings;
  const { flight } = booking;
  const reference = bookingReference(booking.id);
  const airline = (language === 'ar' ? flight.airlineAr : flight.airline) || t('tpAirlineUnknown');
  const box = useRef<HTMLDivElement>(null);
  // Only this booking's passes are printed: the print styles show the container marked printing and hide the rest.
  const print = () => {
    const el = box.current;
    if (!el) return;
    el.classList.add('printing');
    document.documentElement.classList.add('printing-pass');
    const done = () => { el.classList.remove('printing'); document.documentElement.classList.remove('printing-pass'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    window.setTimeout(done, 1000);
  };

  return (
    <div className="boarding-passes" ref={box} data-testid={`boarding-pass-${booking.id}`}>
      {booking.travelers.map((traveler, index) => (
        <article className="Booking-Panel boarding-pass" key={`${traveler.seatCode}-${index}`} aria-label={t('tpBoardingPassFor', { name: traveler.fullName })}>
          <header className="Booking-Tab"><span>{t('tpBoardingPass')}</span><b className="boarding-airline">{airline} · <bdi dir="ltr">{flight.flightNumber}</bdi></b></header>
          <div className="boarding-body">
            <div className="boarding-main">
              <div className="Booking-Route">
                <span className="Route-Endpoint"><small>{t('tpFrom')}</small><strong>{cityLabel(t, flight.from)}</strong><small dir="ltr">{flight.from} · {riyadhTime(flight.departureTime)}</small></span>
                <span className="Route-Track" aria-hidden="true"><span className="Route-Dot" /><span className="Route-Line" /><span className="Route-Plane">✈</span><span className="Route-Line" /><span className="Route-Dot" /></span>
                <span className="Route-Endpoint Route-Endpoint--right"><small>{t('tpTo')}</small><strong>{cityLabel(t, flight.to)}</strong><small dir="ltr">{flight.to} · {riyadhTime(flight.arrivalTime)}</small></span>
              </div>
              <dl className="boarding-details">
                <div className="boarding-wide"><dt>{t('tpPassenger')}</dt><dd data-testid="boarding-passenger">{traveler.fullName}</dd></div>
                <div><dt>{t('tpDate')}</dt><dd>{format.date(riyadhDay(flight.departureTime))}</dd></div>
                <div><dt>{t('tpDepartureTime')}</dt><dd dir="ltr">{riyadhTime(flight.departureTime)}</dd></div>
                <div><dt>{t('seat')}</dt><dd dir="ltr" data-testid="boarding-seat">{traveler.seatCode}</dd></div>
                <div><dt>{t('tpClass')}</dt><dd>{CLASS_KEY[traveler.ticketClass] ? t(CLASS_KEY[traveler.ticketClass]) : traveler.ticketClass}</dd></div>
                <div><dt>{t('tpReference')}</dt><dd dir="ltr" data-testid="boarding-reference">{reference}</dd></div>
              </dl>
            </div>
            <QrCode text={`TARHAL-${reference}`} label={t('tpQrLabel', { reference })} />
          </div>
        </article>
      ))}
      <button type="button" className="restart-button boarding-print" onClick={print} data-testid="button-print-boarding-pass">
        <Printer size={15} aria-hidden="true" /> {t('tpPrintBoardingPass')}
      </button>
    </div>
  );
}
