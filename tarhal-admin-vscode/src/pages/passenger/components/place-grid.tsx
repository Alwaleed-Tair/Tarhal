import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { ExternalLink, Image as ImageIcon, MapPin } from 'lucide-react';
import { useT } from '@/i18n/use-i18n';
import { useDemoState } from '@/store/demoStore';
import { cityPlaces, hudhudLink } from '../data/city-places';
import { isPlaceholderTitle, placeTitleAr } from '../data/cities-ar';
import { photoProps } from '../data/photo-sizes';

type Place = { id: string; title: string; photo?: string };

/**
 * Tariq's place cards (his image and title strip). ADDITION FOR TARIQ'S REVIEW: a place with a checked location is one
 * link to it in Hudhud (new tab), and its name and an "Open in Hudhud" button show on the photo:
 * - mouse: while the pointer is over the photo (soft fade); a click opens Hudhud;
 * - touch: the first tap shows them (and closes any other place); a second tap, on the button or the photo, opens Hudhud;
 * - keyboard: while the card has focus; Enter opens Hudhud, Esc hides them.
 * Only one place shows at a time; a tap or click outside hides it. No fade with "reduce motion" (CSS).
 */
export function PlaceGrid({ places, cityName }: { places: Place[]; cityName: string }) {
  const t = useT();
  const { language } = useDemoState().settings;
  const [active, setActive] = useState<string | null>(null);
  const lastPointer = useRef<string>('mouse');
  const grid = useRef<HTMLDivElement>(null);

  // A tap or click outside the open place hides it.
  useEffect(() => {
    if (!active) return;
    const onDown = (event: globalThis.PointerEvent) => {
      const card = grid.current?.querySelector(`[data-place="${CSS.escape(active)}"]`);
      if (card && !card.contains(event.target as Node)) setActive(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [active]);

  return (
    <div className="city-guide-place-grid" ref={grid}>
      {places.map((place) => {
        const located = cityPlaces[place.id];
        const tariqTitle = isPlaceholderTitle(place.title) ? '' : (language === 'ar' && placeTitleAr[place.id]) || place.title;
        const title = tariqTitle || (located ? (language === 'ar' ? located.nameAr : located.name) : '');
        const area = located && (language === 'ar' ? located.areaAr : located.area);
        const src = located?.photo ?? place.photo;
        const photo = src ? (
          <img className="city-guide-place-image" {...photoProps(src, '(max-width: 760px) 46vw, 260px')} alt={title || cityName} />
        ) : (
          <div className="city-guide-place-placeholder"><ImageIcon size={20} /><span>{t('tpAddPlacePhoto')}</span></div>
        );
        // No checked location: his card as it was, with the name in his title strip.
        if (!located || located.lat === undefined || located.lng === undefined) {
          return (
            <article className="city-guide-place-card" key={place.id} data-testid={`place-${place.id}`}>
              {photo}
              {title && <div className="city-guide-place-title">{title}</div>}
            </article>
          );
        }
        const open = active === place.id;
        const onPointerDown = (event: PointerEvent) => { lastPointer.current = event.pointerType; };
        const onPointerEnter = (event: PointerEvent) => { if (event.pointerType === 'mouse') setActive(place.id); };
        const onPointerLeave = (event: PointerEvent) => { if (event.pointerType === 'mouse') setActive((current) => (current === place.id ? null : current)); };
        const onClick = (event: MouseEvent) => {
          // Touch and pen have no hover: the first tap only shows the name and button.
          if (lastPointer.current !== 'mouse' && !open && event.detail > 0) { event.preventDefault(); setActive(place.id); }
        };
        const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) { event.preventDefault(); setActive(null); } };
        return (
          <a key={place.id} className="city-guide-place-card city-guide-place-located" data-place={place.id} data-active={open || undefined}
            href={hudhudLink(located)} target="_blank" rel="noopener noreferrer"
            aria-label={`${title}${area ? ` (${area})` : ''}: ${t('tpOpenInHudhud')} ${t('tpOpensNewTab')}`}
            onPointerDown={onPointerDown} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave} onClick={onClick} onKeyDown={onKeyDown}
            onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) setActive(place.id); }}
            onBlur={() => setActive((current) => (current === place.id ? null : current))}
            data-testid={`place-${place.id}`}>
            {photo}
            <span className="city-guide-place-title">{title}</span>
            <span className="city-guide-place-reveal" aria-hidden="true">
              <strong>{title}</strong>
              {area && <small>{area}</small>}
              <span className="city-guide-place-hudhud" data-testid={`hudhud-${place.id}`}>
                <MapPin size={14} /> {t('tpOpenInHudhud')} <ExternalLink size={12} />
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
