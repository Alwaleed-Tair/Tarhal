# Tarhal Admin Dashboard

A standalone React + TypeScript + Vite project for the Tarhal administration dashboard. It includes the bilingual English/Arabic interface, RTL layout, theme selection, accessibility options, responsive pages, and a local demo chatbot.

## Open in VS Code

1. Download the Replit project as a ZIP from the file-tree menu.
2. Extract the ZIP.
3. In VS Code, choose **File → Open Folder...** and select `tarhal-admin-vscode`.
4. Install Node.js 20.19 or newer if it is not already installed.
5. Open the VS Code terminal in this folder and run:

   ```bash
   npm install
   npm run dev
   ```

6. Open the local address printed in the terminal.

To make a production build, run `npm run build`. To check TypeScript without building, run `npm run typecheck`.

## Project map

- `src/pages/` — overview, flights, hotels, car rentals, bookings, revenue, users, settings, and not-found pages
- `src/components/layout.tsx` — shared navigation, language, and theme behavior
- `src/components/chat-assistant.tsx` — bilingual demo help widget
- `src/i18n/translations.ts` — English and Arabic labels and messages
- `src/store/demoStore.ts` — browser-local preferences and demo edits
- `src/data/demoData.ts` — sample dashboard records and figures
- `src/config/branding.ts` — brand name and logo path
- `src/index.css` — themes, responsive layout, and accessibility styling

## Replace the logo

Your attached Tarhal logo is already in `public/tarhal-logo.png`, with its dark background removed. To replace it, use the same filename and overwrite that file. If you use another filename, update `logoSrc` in `src/config/branding.ts`. The camel mark used by the chatbot is `public/tarhal-camel.png`, configured with `chatbotLogoSrc`. The logo and TARHAL wordmark at the top of the sidebar link back to the dashboard.

## Change the wording and appearance

- Change the displayed brand name in `src/config/branding.ts`. The current wordmark is automatically uppercased in `src/components/layout.tsx`; replace `brand.name.toUpperCase()` with `brand.name` if you want to preserve the exact letter case.
- Change English and Arabic UI wording in `src/i18n/translations.ts`; keep both language entries in sync.
- Change app fonts in `src/index.css` under `--app-font-sans`. The current font stack includes Arabic-friendly fallbacks; the `--radius` and related component rules also control shapes and spacing.
- Change the top logo size and wordmark font size in the `.brand img` and `.brand-name` rules in `src/index.css`.
- Change navigation, headings, and metric text in the related CSS rules in `src/index.css`.
- Change light and dark colors in the `:root` and `.dark` variable blocks in `src/index.css`.
- Change responsive breakpoints in the `@media` rules near the end of `src/index.css`.
- Change the main typing color in `src/index.css` through `--brand-ink` and `--metric-text`. The current primary brand typing color is `#314C69`.

Users can also switch the theme, Arabic/English, larger text, and high contrast from Settings.

## Demo data and chatbot

Pages load live data from the API and fall back to labelled demo data when a request fails; see `INTEGRATION.md` for which page uses what. Edits made on demo data and preferences are saved in the current browser only. The chatbot gives preset dashboard guidance and is not connected to an AI provider or Tariq's passenger chatbot.