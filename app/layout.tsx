import type { ReactNode } from 'react';
import ChatWidget from '../components/ChatWidget.tsx';

export const metadata = { title: 'Tarhal', description: 'Flights, hotels and cars in Saudi Arabia' };

// Root layout: the chat widget is mounted here so it appears on every page.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
