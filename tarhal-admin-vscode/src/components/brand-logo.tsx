import logoOnDark from '@/pages/passenger/assets/Tarhallogo-wide.webp';
import logoOnLight from '@/pages/passenger/assets/Tarhallogo-wide-light.webp';
import logoMark from '@/pages/passenger/assets/Tarhallogo-mark.webp';

// Tariq's logo from the top of his home page (bird, ترحال, TARHAL): his file trimmed to the artwork (411 x 120).
// His version has white lettering for dark backgrounds; the "-light" copy has the same lettering in his navy #10263d.
const RATIO = 411 / 120;
// The bird alone, cut from the same file (its first 157 columns, without the lettering): for the collapsed admin sidebar.
const MARK_RATIO = 158 / 120;

/**
 * The one Tarhal logo for the traveler pages and the admin. `tone="auto"` follows light/dark mode (the right copy is
 * shown by CSS, see .tarhal-logo in index.css); `tone="onDark"` is for navy surfaces such as the admin sidebar.
 * Width and height are set, so the space is kept before the image loads.
 */
export function BrandLogo({ height = 36, tone = 'auto', className = '', markHeight }: { height?: number; tone?: 'auto' | 'onDark'; className?: string; markHeight?: number }) {
  const size = { height, width: Math.round(height * RATIO) };
  // One name for screen readers on the box (role=img); the two pictures themselves are decorative, only one is shown.
  const box = { className: `tarhal-logo ${className}`, role: "img", "aria-label": "Tarhal", style: { ["--logo-h" as string]: `${height}px` } };
  // `markHeight`: also the bird alone, shown instead of the full logo when the admin sidebar is collapsed (CSS cross-fades them).
  const mark = markHeight ? <img className="tarhal-logo-mark" src={logoMark} alt="" height={markHeight} width={Math.round(markHeight * MARK_RATIO)} /> : null;
  if (tone === 'onDark') return <span {...box}><img className="tarhal-logo-full" src={logoOnDark} alt="" {...size} />{mark}</span>;
  return (
    <span {...box}>
      <img className="tarhal-logo-light" src={logoOnLight} alt="" {...size} />
      <img className="tarhal-logo-dark" src={logoOnDark} alt="" {...size} />
    </span>
  );
}
