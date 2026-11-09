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
 *  5. Dark mode: a `.dark` copy of each colour is added. Light surfaces and borders turn dark, dark text turns light;
 *     the hues stay his.
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

function darkSelector(scoped: string): string {
  return scoped.startsWith('html:has(') ? scoped.replace(/^html/, 'html.dark') : `.dark ${scoped}`;
}

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

/** Mirrors the lightness: white becomes almost black, deep navy text becomes a light tint of the same hue. */
const invert = (l: number) => 0.07 + (1 - l) * 0.86;

type Role = 'surface' | 'text';
function darkColor(token: string, role: Role): string | null {
  const c = parseColor(token);
  if (!c) return null;
  const { h, s, l } = toHsl(c);
  if (role === 'surface' && l <= 0.5) return null; // Already dark: keep it.
  if (role === 'text' && l >= 0.5) return null; // Already light: keep it.
  return hsla(h, s * 0.9, invert(l), c.a);
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
function darkValue(value: string, role: Role): string | null {
  let changed = false;
  const out = value.split(/(url\([^)]*\))/).map((part) => (part.startsWith('url(') ? part : part.replace(COLOR_TOKEN, (token) => {
    const next = darkColor(token, role);
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
        const dark = darkValue(decl.value, role);
        if (dark) darkDecls.push(postcss.decl({ prop: decl.prop, value: dark, important: decl.important }));
      }
    });
    if (darkDecls.length) {
      const darkRule = postcss.rule({ selector: splitSelectors(rule.selector).map(darkSelector).join(',\n') });
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
