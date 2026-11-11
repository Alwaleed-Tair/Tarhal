/**
 * A "→" between two values (a route, or a from/to date range) that points the reading way: in Arabic it is mirrored by CSS
 * (.dir-arrow in index.css), so "17 Nov → 24 Nov" reads correctly right to left. Text arrows never mirror on their own,
 * which is why they pointed backwards on Arabic pages.
 */
export function DirArrow() {
  return <span className="dir-arrow" aria-hidden="true">→</span>;
}
