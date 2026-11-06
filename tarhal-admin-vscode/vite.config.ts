import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const sourceDirectory = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': sourceDirectory,
    },
  },
  server: {
    host: '0.0.0.0',
    // Dev only: /api/* is forwarded to the backend, so the browser never hits CORS.
    proxy: {
      '/api': { target: process.env.BACKEND_URL || 'http://localhost:3000', changeOrigin: true },
    },
  },
});