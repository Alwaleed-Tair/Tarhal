import postcss, { type AtRule, type Declaration, type Root, type Rule } from 'postcss';
import type { Plugin } from 'vite';

/**
 * Tariq's passenger stylesheets (src/pages/passenger/styles/*.css) stay exactly as he wrote them.
 * At build time this plugin makes them fit the one shared app:
 *  1. Scope: every rule only applies inside <div class="passenger-app">, so nothing leaks into the admin or public pages.
 *  2. Animation names get a "tp-" prefix (his `pop-in` has the same name as an admin animation).
 *  3. Right-to-left: left/right margins, paddings, borders, positions and text-align become their logical versions,
 *     so Arabic pages mirror the layout.
 *  4. Senior Mode: font sizes follow --text-scale (1, or 1.25 with larger text).
 *  5. Light mode: his design is dark blue, and dark mode shows it exactly as he made it. For light mode a
 *     `html:not(.dark)` copy of each colour is added, in the admin's light look (pale page, white panels, blue accents):
 *     his dark page colours turn into the admin's pale page tone, his glass panels and light panels turn white,
 *     faint white overlays (chips, pills, lines) turn into faint navy ones, and his light text turns dark.
 *     Left as they are: solid accent blues (with the text on them), his rail, his tab strips, and text on photos.
 */
const SCOPE = '.passenger-app';
const FILES = /[\\/]src[\\/]pages[\\/]passenger[\\/]styles[\\/][^\\/]+\.css(\?.*)?$/;
const KEYFRAME_PREFIX = 'tp-';

const LOGICAL: Record<string, string> = {
  'margin-left': 'margin-inline-start', 'margin-right': 'margin-inline-end',
  'padding-left': 'padding-inline-start', 'padding-right': 'padding-inline-end',
  'border-left': 'border-inline-start', 'border-right': 'border-inline-end',
  'border-left-color': 'border-inline-start-color', 'border-right-color': 'border-inline-end-color',
  'border-left-width': 'border-inline-start-width', 'border-right-width': 'border-inline-end-width',
  'border-left-style': 'border-inline-start-style', 'border-right-style': 'border-inline-end-style',
  'border-top-left-radius': 'border-start-start-radius', 'border-top-right-radius': 'border-start-end-radius',
  'border-bottom-left-radius': 'border-end-start-radius', 'border-bottom-right-radius': 'border-end-end-radius',
  left: 'inset-inline-start', right: 'inset-inline-end',
};

/** Splits "a, b:is(c, d)" at the top-level commas only. */
function splitSelectors(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) { parts.push(selector.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(selector.slice(start).trim());
  return parts.filter(Boolean);
}

function scopeSelector(selector: string): string {
  if (/^html:has\(/.test(selector)) return selector; // His scrollbar theme is already limited to pages that have .tarhal-page.
  if (/^(:root|html|body|#root)$/.test(selector)) return SCOPE;
  const rest = selector.replace(/^(html|body|:root)\s+/, '');
  return `${SCOPE} ${rest}`;
}

function lightSelector(scoped: string): string {
  return scoped.startsWith('html:has(') ? scoped.replace(/^html/, 'html:not(.dark)') : `html:not(.dark) ${scoped}`;
}

/** Rules that keep his colours in light mode too: his rail, and text and panels laid over photos. */
const KEEP_IN_LIGHT = /\.(sidebar|Travel-Card|Destination|card-copy|card-arrow|card-visual|card-photo|city-guide-hero|login-image-panel|login-airplane|login-form button|Dashboard-Airplane|Booking-Tab|boarding-airline|city-guide-place-reveal)\b/;

// ---------- colours ----------
type Rgba = { r: number; g: number; b: number; a: number };
const NAMED: Record<string, Rgba> = { white: { r: 255, g: 255, b: 255, a: 1 }, black: { r: 0, g: 0, b: 0, a: 1 } };

function parseColor(token: string): Rgba | null {
  const t = token.toLowerCase();
  if (NAMED[t]) return NAMED[t];
  if (t.startsWith('#')) {
    let h = t.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const m = t.match(/^rgba?\(([^)]*)\)$/);
  if (!m) return null;
  const nums = m[1].split(/[\s,/]+/).filter(Boolean);
  if (nums.length < 3) return null;
  const channel = (v: string) => (v.endsWith('%') ? (parseFloat(v) * 255) / 100 : parseFloat(v));
  const alpha = nums[3] === undefined ? 1 : nums[3].endsWith('%') ? parseFloat(nums[3]) / 100 : parseFloat(nums[3]);
  return { r: channel(nums[0]), g: channel(nums[1]), b: channel(nums[2]), a: alpha };
}

function toHsl({ r, g, b }: Rgba) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: h * 60, s, l };
}

const fmt = (n: number) => Math.round(n * 10) / 10;
const hsla = (h: number, s: number, l: number, a: number) => `hsl(${fmt(h)} ${fmt(s * 100)}% ${fmt(l * 100)}%${a < 1 ? ` / ${fmt(a * 100) / 100}` : ''})`;

/** Light text becomes deep ink of the same hue. */
const darkText = (l: number) => 0.12 + (1 - l) * 0.5;

/** A solid, saturated mid blue (his #2b66a3 buttons, #4f83a8 marks): an accent, kept in light mode. */
export function isAccent(token: string): boolean {
  const c = parseColor(token);
  if (!c || c.a < 0.6) return false;
  const { s, l } = toHsl(c);
  return s >= 0.3 && l >= 0.28 && l <= 0.72;
}

type Role = 'surface' | 'text';
/** `inGradient`: page gradients are page colour, never accents. */
export function lightColor(token: string, role: Role, inGradient = false): string | null {
  const c = parseColor(token);
  if (!c) return null;
  const { h, s, l } = toHsl(c);
  if (role === 'text') return l <= 0.5 ? null : hsla(h, s, darkText(l), c.a);
  if (!inGradient && isAccent(token)) return null;
  // Faint white overlays (glass chips, pills, hairlines) would vanish on a pale page: the same faint touch in navy.
  if (l >= 0.85 && c.a < 0.5) return hsla(210, 0.45, 0.2, Math.min(0.14, c.a * 1.2 + 0.02));
  // His light panels (#f7f8fc, #f8f9fc) become white, like the admin's cards.
  if (l >= 0.97) return c.r === 255 && c.g === 255 && c.b === 255 ? null : hsla(0, 0, 1, c.a);
  if (l >= 0.5) return null; // Other light colours stay.
  // His translucent dark glass becomes a white panel; his solid dark page colours become the admin's pale page tone.
  if (c.a < 1) return hsla(h, Math.min(s, 0.3), 0.99, Math.max(c.a, 0.86));
  return hsla(h, Math.min(s, 0.38), 0.93 + (1 - l) * 0.03, c.a);
}

const COLOR_TOKEN = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;

function roleOf(prop: string): Role | null {
  // His custom properties: --ink, --ink-soft, --page-text, --booking-muted hold text colours; the others hold surfaces.
  if (prop.startsWith('--')) return /ink|text|muted|fg|foreground/.test(prop) ? 'text' : 'surface';
  if (/^(color|fill|stroke|caret-color|text-decoration-color|-webkit-text-fill-color)$/.test(prop)) return 'text';
  if (/^(background|background-color|background-image|outline|outline-color|accent-color|border|border-(top|right|bottom|left|inline|block)(-start|-end)?(-color)?|border-color|column-rule-color)$/.test(prop)) return 'surface';
  return null; // Shadows, filters and everything else stay as they are.
}

/** Replaces colours outside url(...) only. Returns null when nothing changes. */
function lightValue(value: string, role: Role): string | null {
  let changed = false;
  const inGradient = /gradient\(/.test(value);
  const out = value.split(/(url\([^)]*\))/).map((part) => (part.startsWith('url(') ? part : part.replace(COLOR_TOKEN, (token) => {
    const next = lightColor(token, role, inGradient);
    if (next) { changed = true; return next; }
    return token;
  }))).join('');
  return changed ? out : null;
}

// ---------- the transform ----------
function insideKeyframes(node: Rule | Declaration): boolean {
  let parent = node.parent;
  while (parent) {
    if (parent.type === 'atrule' && /keyframes$/.test((parent as AtRule).name)) return true;
    parent = parent.parent;
  }
  return false;
}

export function transformPassengerCss(css: string, from?: string): string {
  const root: Root = postcss.parse(css, { from });
  const names = new Set<string>();
  root.walkAtRules(/keyframes$/, (rule) => { names.add(rule.params.trim()); rule.params = KEYFRAME_PREFIX + rule.params.trim(); });

  const added: { after: Rule; rule: Rule }[] = [];
  root.walkRules((rule) => {
    if (insideKeyframes(rule)) return;
    const scoped = splitSelectors(rule.selector).map(scopeSelector);
    rule.selector = [...new Set(scoped)].join(',\n');

    const darkDecls: Declaration[] = [];
    // A masked element uses its background colour as the icon colour (his sidebar icons): keep it as he chose.
    let masked = false;
    rule.walkDecls(/mask/, () => { masked = true; });
    // A rule that paints a solid accent background keeps its own text colour too (white on blue stays readable).
    let onAccent = false;
    rule.walkDecls(/^background(-color)?$/, (decl) => { if (!/gradient\(/.test(decl.value) && (decl.value.match(COLOR_TOKEN) ?? []).some(isAccent)) onAccent = true; });
    rule.walkDecls((decl) => {
      const prop = decl.prop.toLowerCase();
      if (/^animation(-name)?$/.test(prop) && names.size) {
        decl.value = decl.value.replace(/[A-Za-z_][\w-]*/g, (word) => (names.has(word) ? KEYFRAME_PREFIX + word : word));
      }
      if (prop === 'font-size') decl.value = decl.value.replace(/(-?\d*\.?\d+)px/g, (_, n) => `calc(${n}px * var(--text-scale, 1))`);
      if (prop === 'text-align' && /^(left|right)$/.test(decl.value.trim())) decl.value = decl.value.trim() === 'left' ? 'start' : 'end';
      if (prop === 'float' && /^(left|right)$/.test(decl.value.trim())) decl.value = decl.value.trim() === 'left' ? 'inline-start' : 'inline-end';
      // Centred boxes (left: 50% with a translate) must keep their physical side, or they move in Arabic.
      if (LOGICAL[prop] && !((prop === 'left' || prop === 'right') && decl.value.trim() === '50%')) decl.prop = LOGICAL[prop];
      // "padding: 122px 90px 48px 200px" has different left and right sides: write them as start/end so Arabic mirrors.
      if (/^(padding|margin|inset)$/.test(prop)) {
        const parts = decl.value.trim().split(/\s+(?![^(]*\))/);
        if (parts.length === 4 && parts[1] !== parts[3]) {
          const [top, right, bottom, left] = parts;
          const block = prop === 'inset' ? ['top', 'bottom'] : [`${prop}-top`, `${prop}-bottom`];
          const inline = prop === 'inset' ? ['inset-inline-start', 'inset-inline-end'] : [`${prop}-inline-start`, `${prop}-inline-end`];
          decl.cloneBefore({ prop: block[0], value: top });
          decl.cloneBefore({ prop: block[1], value: bottom });
          decl.cloneBefore({ prop: inline[0], value: left });
          decl.cloneBefore({ prop: inline[1], value: right });
          decl.remove();
          return;
        }
      }
      const role = roleOf(prop);
      if (role && !(masked && prop === 'background-color')) {
        const light = KEEP_IN_LIGHT.test(rule.selector) || (onAccent && role === 'text') ? null : lightValue(decl.value, role);
        if (light) darkDecls.push(postcss.decl({ prop: decl.prop, value: light, important: decl.important }));
      }
    });
    if (darkDecls.length) {
      const darkRule = postcss.rule({ selector: splitSelectors(rule.selector).map(lightSelector).join(',\n') });
      darkDecls.forEach((decl) => darkRule.append(decl));
      added.push({ after: rule, rule: darkRule });
    }
  });
  // Inserted after the walk, so the dark copies are not scoped a second time.
  for (const { after, rule } of added) after.after(rule);
  return root.toString();
}

export function passengerCss(): Plugin {
  return {
    name: 'tarhal-passenger-css',
    enforce: 'pre',
    transform(code, id) {
      if (!FILES.test(id)) return null;
      return { code: transformPassengerCss(code, id), map: null };
    },
  };
}
