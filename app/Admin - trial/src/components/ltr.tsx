import type { ReactNode } from 'react';

/** Keeps ids, emails and codes (SV-102, BK-1001, a@b.com) left-to-right inside Arabic text and table cells. */
export function Ltr({ children }: { children: ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>;
}
