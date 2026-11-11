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

// Shown at most once per visit (it hides by itself); never again after the visitor closes it or opens the chat.
let shownThisVisit = false;

/**
 * Would the bubble cover any of the page's content? Text, pictures, form controls and painted boxes (cards, panels) count;
 * the page's own background, the rail and the bubble itself do not.
 */
function coversContent(r: DOMRect): boolean {
  const app = document.querySelector('.passenger-app');
  if (!app) return true;
  const hit = (x: DOMRect) => x.width > 0 && x.height > 0 && r.left < x.right && r.right > x.left && r.top < x.bottom && r.bottom > x.top;
  for (const el of app.querySelectorAll<HTMLElement>('*')) {
    if (el.closest('.sidebar, .chat-intro, .sr-only')) continue;
    const box = el.getBoundingClientRect();
    if (!hit(box)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    if (/^(img|svg|input|button|select|textarea|video|canvas)$/i.test(el.tagName)) return true;
    for (const node of el.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      if ([...range.getClientRects()].some(hit)) return true;
    }
    const painted = !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(cs.backgroundColor) || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none' || parseFloat(cs.borderTopWidth) > 0;
    const isPageBackground = box.width >= innerWidth * 0.8 && box.height >= innerHeight * 0.8;
    if (painted && !isPageBackground) return true;
  }
  return false;
}

/**
 * A small bubble beside the camel chat button on traveler pages: says this is the chat assistant and invites people to use
 * it. Look only, in the style of the chat window; it does not touch the chat's code: clicking it presses the camel button,
 * and it watches that button's aria-expanded to know when the chat is open.
 * Not on /login, /register or the admin pages, and never while the chat is open. It never covers the page's content: it is
 * measured before it appears and skips a page where it would, and if the visitor scrolls content under it, it goes away.
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

  // Before it is visible: does it cover anything the visitor can use? Then not on this page.
  useLayoutEffect(() => {
    if (!shown || measured || !box.current) return;
    if (coversContent(box.current.getBoundingClientRect())) { setShown(false); return; }
    shownThisVisit = true;
    setMeasured(true);
  }, [shown, measured]);

  useEffect(() => {
    if (!shown || !measured) return;
    const hide = window.setTimeout(() => setShown(false), HIDE_AFTER_MS);
    // Content scrolled (or resized) under it: it goes away rather than cover it.
    const check = () => { if (box.current && coversContent(box.current.getBoundingClientRect())) setShown(false); };
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
