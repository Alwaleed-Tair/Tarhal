import { useId } from 'react';

/** Small decorative trend line. The numbers it draws are always shown as text next to it. Flipped by CSS in Arabic. */
export function Sparkline({ values }: { values: number[] }) {
  const gradientId = useId();
  const max = Math.max(...values);
  if (values.length < 2 || max <= 0) return null;
  const width = 96, height = 32, pad = 2;
  const points = values.map((value, index) => [
    pad + (index / (values.length - 1)) * (width - pad * 2),
    height - pad - (value / max) * (height - pad * 2),
  ]);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity=".22" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pad},${height} ${line} ${width - pad},${height}`} fill={`url(#${gradientId})`} />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
