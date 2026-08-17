# Steps Academy

A warm, child-centered mobile app for a Montessori academy serving children aged 1–4 and their parents. Parents follow their child's day and photos; staff (admins) create events, upload photos, and tag which children appear in them. The repo holds the mobile client and its backend API as two independent projects.

## Features

- **Auth** — email/password sign-up & sign-in (JWT + bcrypt), **always on**. Sign-up requires a per-child invite code issued by the academy, which is what links a parent to their child; parents never type a child's name. Google sign-in is wired but has never worked in a real build (the release keystore's SHA-1 is not on the OAuth client).
- **Home board** — time-aware greeting, a hero carousel, the next upcoming event, and the latest academy announcement.
- **Gallery** — the emotional core:
  - _Admins_ create events, upload photos, and tag children per photo.
  - _Parents_ see events with photos of **their** child (matched by tag), a full-screen lightbox with swipe / save-to-camera-roll / share, and a 🐘 badge on photos their child is in.
- **Profile** — child pills, a per-child photo count, language switcher, and settings.
- **Internationalization** — full **English / Arabic / Hebrew** with right-to-left mirroring. Mirroring is JS-driven on purpose: `applyLocaleDirection` keeps native `I18nManager` RTL permanently off, because the OS would mirror rows a second time and fight the app's own styles.
- **Polish** — skeleton loaders, per-screen error boundaries, card depth tiers, a typography scale, and reduce-motion-aware animations.

## Stack

- **Mobile app** (`steps-app/`) — React Native + **Expo SDK 54** (pinned — see note below), TypeScript, Expo Router (file-based), TanStack Query, Zustand, Axios, AsyncStorage, NativeWind + `StyleSheet`, `react-native-reanimated`, `@expo/vector-icons`.
- **Backend API** (`steps-server/`) — Node.js + Express 5, TypeScript, JWT (`jsonwebtoken`), `bcryptjs`, `multer` uploads.

> ⚠️ **Expo SDK is pinned at 54 — do not upgrade.** The app is delivered as an EAS build, not through Expo Go. There is no `expo-updates`, so **every JS change needs a full rebuild and reinstall** — the API URL is compiled into the binary.
>
> ✅ **The backend runs on Postgres (Supabase) via Prisma, with photos on Cloudflare R2.** Nothing is stored in memory and nothing is written to local disk. The API is deployed on Railway at `https://api.steps-academy.com`. A dev seed (below) creates a demo parent, and is skipped entirely when `NODE_ENV=production`.

## Project structure

```
steps-app/                 Expo React Native frontend
  src/
    app/                   expo-router screens (file-based)
      (tabs)/              home, games, shop, gallery, profile
      auth.tsx             sign-in / sign-up
    components/            shared UI + gallery components
    hooks/                 useAuth, useRole, ...
    store/                 zustand stores (auth, locale)
    services/              axios API clients
    i18n/                  translations (en/ar/he) + RTL helpers
    constants/             colors, fonts, typography

steps-server/              Node.js + Express backend
  src/
    routes/                auth, gallery, announcements, games, shop, profile
    controllers/           route handlers
    middleware/            auth (JWT), upload (multer), error handling
    models/                Prisma data access (user, event, photo, photoTag, ...)
    devSeed.ts             demo data seeded on startup (dev only)
    index.ts               entry point
```

## Running locally

Run the **backend first**, then the app.

### Backend (`steps-server/`)

Create `steps-server/.env`:

```
PORT=4000
JWT_SECRET=change-me-in-any-real-deployment
JWT_EXPIRES_IN=30d
ADMIN_EMAILS=you@example.com        # comma-separated; these emails become admins
GOOGLE_CLIENT_ID=                    # optional, for Google sign-in
```

```bash
cd steps-server
npm install
npm run dev            # starts on http://localhost:4000
curl http://localhost:4000/health
```

On startup you'll see `[devSeed] Seeded parent account sarah@steps.local / steps1234` — a demo **parent of "Layla"** with sample events and tagged photos, recreated on every restart.

### Mobile app (`steps-app/`)

Create `steps-app/.env.local`:

```
EXPO_PUBLIC_API_URL=http://<your-machine-LAN-IP>:4000
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

```bash
cd steps-app
npm install
npm start
```

Press `i` / `a` for a simulator. On a physical device the app is installed as an EAS build (`npx eas build --profile preview --platform android`), not scanned into Expo Go.

> On a physical device, `EXPO_PUBLIC_API_URL` must be your computer's **LAN IP** (not `localhost`). `EXPO_PUBLIC_*` vars are baked into the bundle at start time — restart Metro after changing them. If Metro binds to the wrong network adapter (e.g. behind a VPN), force it:
> ```bash
> set REACT_NATIVE_PACKAGER_HOSTNAME=<your-LAN-IP> && npm start
> ```

### Roles

An account becomes an **admin** only if its email is listed in the server's `ADMIN_EMAILS`; everyone else is a **parent**. Admins get the gallery upload/tagging UI; parents get the child-facing views.

## Verifying changes

- `npx tsc --noEmit` in each project for a fast typecheck.
- `npx expo export --platform ios --output-dir <tmp>` in `steps-app/` fully bundles every route and fails loudly on a real error (more trustworthy than the dev server's lazy loading).
