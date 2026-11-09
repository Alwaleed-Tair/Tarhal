/**
 * Brand assets live in the public folder.
 * Keep these paths here so the logo can be changed without searching the UI.
 */
// BASE_URL is '/' in dev and '/_site/' in the production build (npm run build:frontend), so the files in this app's
// public folder are found in both. A hard-coded '/tarhal-logo.png' returned 404 on the deployed site.
const base = import.meta.env.BASE_URL;

export const brand = {
  name: 'Tarhal',
  logoSrc: `${base}tarhal-logo.png`,
  chatbotLogoSrc: `${base}tarhal-camel.png`,
} as const;