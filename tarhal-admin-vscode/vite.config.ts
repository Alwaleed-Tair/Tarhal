import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { passengerCss } from './vite-plugins/passenger-css';

const sourceDirectory = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  // passengerCss: scopes Tariq's passenger stylesheets and adds dark mode, RTL and Senior Mode to them (see the file).
  plugins: [passengerCss(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': sourceDirectory,
    },
  },
  server: {
    host: '0.0.0.0',
    // Dev only: /api/* is forwarded to the backend, so the browser never hits CORS.
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
        // The backend only accepts same-origin POST/PATCH (lib/auth-http.ts rejectCrossOrigin), so the proxy must send the
        // backend's own origin; otherwise login and every admin write fail with 403 "Cross-origin requests are not allowed".
        headers: { origin: process.env.BACKEND_URL || 'http://localhost:3000' },
      },
    },
  },
});