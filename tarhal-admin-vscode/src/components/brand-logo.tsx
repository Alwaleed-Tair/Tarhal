import logoOnDark from '@/pages/passenger/assets/Tarhallogo-wide.webp';
import logoOnLight from '@/pages/passenger/assets/Tarhallogo-wide-light.webp';

// Tariq's logo from the top of his home page (bird, ترحال, TARHAL): his file trimmed to the artwork (411 x 120).
// His version has white lettering for dark backgrounds; the "-light" copy has the same lettering in his navy #10263d.
const RATIO = 411 / 120;

/**
 * The one Tarhal logo for the traveler pages and the admin. `tone="auto"` follows light/dark mode (the right copy is
 * shown by CSS, see .tarhal-logo in index.css); `tone="onDark"` is for navy surfaces such as the admin sidebar.
 * Width and height are set, so the space is kept before the image loads.
 */
export function BrandLogo({ height = 36, tone = 'auto', className = '' }: { height?: number; tone?: 'auto' | 'onDark'; className?: string }) {
  const size = { height, width: Math.round(height * RATIO) };
  const box = { className: `tarhal-logo ${className}`, style: { ["--logo-h" as string]: `${height}px` } };
  if (tone === 'onDark') return <span {...box}><img src={logoOnDark} alt="Tarhal" {...size} /></span>;
  return (
    <span {...box}>
      <img className="tarhal-logo-light" src={logoOnLight} alt="Tarhal" {...size} />
      <img className="tarhal-logo-dark" src={logoOnDark} alt="" aria-hidden="true" {...size} />
    </span>
  );
}
