/**
 * One origin for the whole platform.
 *
 * The React frontend in tarhal-admin-vscode/ (public site + admin dashboard) is built
 * into public/_site by `npm run build:frontend`. Next.js serves the API under /api and,
 * for any other path that is not a file, returns the frontend's index.html so the
 * client-side router can handle it (/, /login, /stays, /dashboard, ...).
 *
 * Same origin matters: the API rejects cross-origin POST/PATCH and the session cookie
 * is SameSite=Lax, so the frontend must not live on a different domain.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      // Checked after API routes and public files, so /api/* and real assets win.
      fallback: [{ source: '/:path((?!api/|_next/).*)', destination: '/_site/index.html' }],
    };
  },
};

export default nextConfig;
