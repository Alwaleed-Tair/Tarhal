import { useState } from 'react';
import { BedDouble, CarFront } from 'lucide-react';
import { catalogPhotos } from '@/data/catalog-photos';

/**
 * A hotel or car photo from its imageUrl (the database field). For the bundled photos (data/catalog-photos.ts) it uses the
 * WebP copies with srcset and their real width/height (space reserved, nothing jumps); any other address is used as it
 * is. No address, or one that fails to load: a clean placeholder with the hotel or car symbol, never a broken image.
 */
export function CatalogPhoto({ src, kind, alt, sizes, className = '' }: { src?: string | null; kind: 'hotel' | 'car'; alt: string; sizes: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = src?.trim() || '';
  if (!url || failed === url) {
    const Icon = kind === 'car' ? CarFront : BedDouble;
    return <span className={`catalog-photo-empty ${className}`} role="img" aria-label={alt}><Icon size={22} strokeWidth={1.5} aria-hidden="true" /></span>;
  }
  const info = catalogPhotos[url];
  const webp = info ? url.replace(/\.(jpe?g|png)$/i, '.webp') : url;
  return (
    <img className={className} src={webp} alt={alt} loading="lazy" decoding="async" width={info?.w} height={info?.h}
      srcSet={info?.w2 ? `${webp} ${info.w}w, ${webp.replace(/\.webp$/, '-2x.webp')} ${info.w2}w` : undefined}
      sizes={info?.w2 ? sizes : undefined} onError={() => setFailed(url)} />
  );
}
