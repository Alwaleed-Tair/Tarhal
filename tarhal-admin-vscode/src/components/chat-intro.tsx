import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useLocation } from 'wouter';
import { routes } from '@/config/routes';
import { useT } from '@/i18n/use-i18n';

const STORAGE_KEY = 'tarhal-chat-intro-done';
const SHOW_AFTER_MS = 3000;
const HIDE_AFTER_MS = 8000;

const isDone = () => { try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; } };
const markDone = () => { try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* storage can be blocked: it is then hidden for this visit only */ } };
const launcher = () => [...document.querySelectorAll<HTMLButtonElement>('.chat-launcher')].find((el) => el.getClientRects().length > 0) ?? null;
const ADMIN_PATHS = new Set<string>(Object.values(routes.admin as Record<string, string>));

// Shown once per visitor (remembered in localStorage as soon as it has been shown), and only once in this visit when
// storage is blocked.
let shownThisVisit = false;

// What the visitor may be about to press: the header controls, the rail, and anything clickable on the page.
const CONTROLS = 'a[href], button, input, select, textarea, label, summary, [role="button"], [role="radio"], [role="tab"], [role="option"], [role="link"], [tabindex]:not([tabindex="-1"])';

/** How many controls (with an 8px margin around the bubble) a box at this place would sit on. */
function controlsUnder(r: DOMRect): number {
  const m = 8, top = r.top - m, bottom = r.bottom + m, left = r.left - m, right = r.right + m;
  let n = 0;
  for (const el of document.querySelectorAll<HTMLElement>(CONTROLS)) {
    if (el.closest('.chat-intro, .chat-launcher, .sr-only')) continue;
    const x = el.getBoundingClientRect();
    if (!x.width || !x.height || x.left >= right || x.right <= left || x.top >= bottom || x.bottom <= top) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'hidden' && cs.display !== 'none') n++;
  }
  return n;
}

/**
 * Put the bubble beside the camel, moved up in small steps when its place would sit on a control, never off screen.
 * The lowest place with no control under it wins; if there is none, the place with the fewest.
 */
function place(el: HTMLElement) {
  // Measured with transitions off: with "reduce motion" the site gives every property a tiny transition, so a new
  // position would only apply on the next frame and the measurement would read the old one.
  const transition = el.style.transition;
  el.style.transition = 'none';
  el.style.bottom = '';
  const base = parseFloat(getComputedStyle(el).bottom) || 0;
  let best = { lift: 0, n: Infinity };
  let lastTop = Infinity;
  // At most 60 steps (720px), and stop when a step no longer moves it, so this always ends.
  for (let lift = 0; lift <= 720; lift += 12) {
    el.style.bottom = `${base + lift}px`;
    const r = el.getBoundingClientRect();
    if (r.top < 8 || r.top >= lastTop) break;
    lastTop = r.top;
    const n = controlsUnder(r);
    if (n < best.n) best = { lift, n };
    if (n === 0) break;
  }
  el.style.bottom = `${base + best.lift}px`;
  el.style.transition = transition;
}

/**
 * A small bubble beside the camel chat button on traveler pages: says this is the chat assistant and invites people to use
 * it. Look only, in the style of the chat window; it does not touch the chat's code: clicking it presses the camel button,
 * and it watches that button's aria-expanded to know when the chat is open.
 * Shown once per visitor on any traveler page, but not on /login, /register or the admin pages, and never while the chat is
 * open. It may briefly cover a little content (it hides by itself and has a close button), but it keeps clear of the header
 * controls, the rail and anything clickable: it moves up from beside the camel until nothing clickable is under it.
 */
export function ChatIntro() {
  const t = useT();
  const [location] = useLocation();
  const [shown, setShown] = useState(false);
  const [measured, setMeasured] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const allowed = location !== routes.login && location !== routes.register && !ADMIN_PATHS.has(location);

  const finish = useCallback(() => { markDone(); setShown(false); }, []);

  // The chat opened (from the bubble or the camel itself): hide and never show again.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.querySelector('.chat-launcher[aria-expanded="true"]')) finish();
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-expanded'] });
    return () => observer.disconnect();
  }, [finish]);

  useEffect(() => {
    if (!allowed) { setShown(false); return; }
    if (shownThisVisit || isDone()) return;
    const show = window.setTimeout(() => {
      const button = launcher();
      // Only beside Tariq's rail, and not while the chat is open.
      if (!button || !document.querySelector('.passenger-app .sidebar') || button.getAttribute('aria-expanded') === 'true') return;
      setMeasured(false);
      setShown(true);
    }, SHOW_AFTER_MS);
    return () => window.clearTimeout(show);
  }, [allowed, location]);

  // Before it is visible: find its place, then show it and remember that this visitor has seen it.
  useLayoutEffect(() => {
    if (!shown || measured || !box.current) return;
    place(box.current);
    shownThisVisit = true;
    markDone();
    setMeasured(true);
  }, [shown, measured]);

  useEffect(() => {
    if (!shown || !measured) return;
    const hide = window.setTimeout(() => setShown(false), HIDE_AFTER_MS);
    // Scrolled or resized: if something clickable is now under it, it moves to a free place.
    const check = () => { if (box.current && controlsUnder(box.current.getBoundingClientRect())) place(box.current); };
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { window.clearTimeout(hide); window.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [shown, measured]);

  return (
    <>
      {/* Read out politely once, when it appears. */}
      <div className="sr-only" role="status" aria-live="polite">{shown && measured ? t('chatIntro') : ''}</div>
      {shown && allowed && (
        <div className={`chat-intro${measured ? '' : ' is-measuring'}`} ref={box} data-testid={measured ? 'chat-intro' : undefined} aria-hidden={measured ? undefined : true}>
          <button type="button" className="chat-intro-text" onClick={() => { finish(); launcher()?.click(); }} data-testid="chat-intro-open">
            {t('chatIntro')}
          </button>
          <button type="button" className="chat-intro-close" aria-label={t('chatIntroClose')} title={t('chatIntroClose')} onClick={finish} data-testid="chat-intro-close">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
