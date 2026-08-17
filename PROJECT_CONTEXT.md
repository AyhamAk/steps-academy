# Steps — Project Context

This file is a cold-start briefing for an LLM (or a new developer) picking up this
repo with zero prior context. It describes the goal, the current state of the
code (not the intended future state), and the gotchas that aren't obvious from
reading the code alone.

## What this app is

Steps is a mobile app for **a Montessori academy serving children aged 1–4 and
their parents**. Two audiences share one account:

- **Parents** get full access: browsing content, managing their kid's profile,
  a shop, a photo gallery of their kid's activities at the academy, games.
- **Kids** get a restricted "kid mode" — a simplified, games-only view a parent
  hands the phone to them in, with no PIN (see "Kid mode" below — this is a
  planned feature, not yet built).

The repo has two independent projects, developed together but versioned/run
separately:

```
Steps/
  README.md          quick-start instructions (see caveats below)
  steps-app/          Expo React Native mobile client (has its own git repo)
  steps-server/        Node/Express backend (no git repo yet)
```

## Current state at a glance

**Built and working:**
- Full Montessori earth-tone design system (colors, fonts) applied throughout.
- Home tab: fully designed, animated (gradient banner, feature card grid).
- Auth: complete UI (welcome/register/login) + complete backend (register,
  login, Google OAuth, JWT) — but **wired off** via a feature flag, see below.
- Bottom tab navigation with 5 tabs.

**Stubbed / not yet built:**
- **Games and Shop only** — a short placeholder screen client-side and a
  `501 Not Implemented` route server-side. Gallery, Profile, Courses,
  Schedule, Students, Invites and Feedback are all fully built.
- No child sub-profiles and no kid mode.

**Built since this file was first written:** Postgres via Prisma, Cloudflare R2
photo storage, the Railway deployment, invite-code onboarding, courses and
enrolment, the weekly schedule, notifications, the admin dashboards, parent
feedback, account deletion, and the public privacy / account-deletion pages.

## Auth is ON

`steps-app/src/constants/flags.ts` exports `AUTH_ENABLED = true`, and every API
route outside `/health`, `/privacy`, `/account-deletion` and the invite-code
check is behind `requireAuth`. The redirect-to-`/auth` gate in
`src/app/_layout.tsx` is live: no token means the auth screen.

Sign-up additionally requires a valid **invite code**, which is what links the
new parent to their child. Existing accounts are grandfathered.

Google sign-in is wired end to end but **has never worked in a real build** —
Play re-signs the app, so the OAuth client needs the Play App Signing SHA-1,
which only exists after the first upload.

## Mobile app (`steps-app/`)

**Stack:** Expo SDK 54 (pinned — see gotcha below), React Native 0.81, React
19, TypeScript, Expo Router (file-based routing), Zustand (state), TanStack
Query (installed, provisioned, but no screen actually uses it yet — all
current network calls go through plain axios in `useAuth`), Axios, AsyncStorage,
NativeWind/Tailwind.

### Routing (file-based, via expo-router)

```
src/app/
  _layout.tsx         root Stack: loads Nunito fonts, waits for font+auth-store
                       hydration, wraps app in QueryClientProvider, runs the
                       (currently inert) auth gate
  auth.tsx             single screen, 3 local-state modes: welcome / register / login
  (tabs)/
    _layout.tsx         bottom Tabs navigator, 5 tabs, emoji icons, gradient
                        top border
    index.tsx           Home — fully built: animated greeting, gradient
                        banner, 2x2 feature-card grid, animated footer
    games.tsx           stub
    shop.tsx             stub
    gallery.tsx          stub
    profile.tsx          stub
```

Each stub screen is identically minimal:
```tsx
<Screen><Text className="text-2xl font-semibold text-bark">{Title}</Text></Screen>
```

### State (Zustand, both persisted to AsyncStorage)

- `src/store/authStore.ts` — `{ token, user, hasHydrated }`. Only `token` and
  `user` are persisted (`partialize`); `hasHydrated` is a runtime-only flag set
  true once AsyncStorage rehydration finishes, and `_layout.tsx` blocks
  rendering until it's true (avoids a flash of the wrong screen).
- `src/store/useAppStore.ts` — `{ hasOnboarded }`. Persisted, but nothing in
  the app currently reads or sets `hasOnboarded` — likely scaffolding for a
  future onboarding flow.

### Talking to the backend

`src/services/api.ts` creates one shared axios instance:
- Base URL: `process.env.EXPO_PUBLIC_API_URL`, falling back to
  `http://localhost:4000`.
- A request interceptor auto-attaches `Authorization: Bearer <token>` from
  `authStore` on every call.
- No response interceptor — a 401 does not trigger auto-logout or token
  refresh; that would need to be added if/when auth is re-enabled.

`src/services/authApi.ts` wraps the five auth endpoints; `src/hooks/useAuth.ts`
wraps those into a hook (`register`, `login`, `signInWithGoogle`, `logout`,
plus `isLoading`/`error`) used by `auth.tsx`.

### Design system (implemented, not just planned)

`src/constants/Colors.ts` — Montessori earth-tone palette, **already fully
replaces** the old Expo pink/purple placeholder:

| Token | Hex | Semantic alias |
|---|---|---|
| `cream` | `#FFFDF8` | `background` |
| `linen` | `#F5EFE4` | `card` |
| `terracotta` | `#E07A3A` | `primary` |
| `clay` | `#C4756A` | `secondary` |
| `forest` | `#5B8A5E` | `accent1` |
| `honey` | `#D4A843` | `accent2` |
| `sky` | `#7B9EC4` | `accent3` |
| `bark` | `#2C2416` | `text` |
| `#8C7B65` | — | `textLight` |
| `#E5DCC8` | — | `border` |

`src/constants/Fonts.ts` maps to Nunito weights (`Nunito_400Regular` /
`_600SemiBold` / `_700Bold` / `_800ExtraBold`), loaded via
`@expo-google-fonts/nunito` in `_layout.tsx`.

**Two styling idioms coexist** — worth knowing before adding new screens:
- Most built-out components (`StepsButton`, `StepsCard`, `StepsHeader`,
  `StepsFeatureCard`, the Home screen) use RN `StyleSheet.create` referencing
  `Colors.*` / `Fonts.*` constants directly.
- `Screen.tsx` and the four stub tab screens use NativeWind `className`
  utilities (`bg-cream`, `text-bark`, etc.) — only the raw earth-tone names
  (not the semantic aliases like `primary`) are exposed as Tailwind classes,
  configured in `tailwind.config.js`.

Not yet reflected in the new palette: `app.json`'s Android adaptive-icon
background (`#E6F4FE`, a leftover pale blue from the Expo default template)
and the app icon/splash assets under `assets/` haven't been visually confirmed
to match the earth-tone branding.

### Planned but not built (from prior product decisions — do not assume these exist)

- **Profile & kids**: parent account → one or more child sub-profiles (name,
  age, grade, emoji avatar); Profile tab would show avatar+name, a "My Kids"
  chip row, selected child's mini-dashboard, account settings. None of this
  exists yet — `profile.tsx` is a one-line stub.
- **Kid mode**: a parent-only toggle switching to a simplified full-screen
  Games view; exited via a small, deliberately-not-obvious corner button, no
  PIN. Purely client-side Zustand state, **not persisted** (closing the app
  resets it) — unlike `authStore`/`useAppStore`, this store should NOT use the
  `persist` middleware if/when built.

## Backend (`steps-server/`)

**Stack:** Node.js, TypeScript, Express 5, run via `tsx watch` in dev
(`npm run dev`), `tsc`-compiled for prod. Listens on port `4000` by default.

```
src/
  index.ts            entry point — helmet → cors (all origins) → morgan("dev")
                       → express.json() → routes → notFound (404) → errorHandler (500)
  config/env.ts        reads PORT, NODE_ENV, JWT_SECRET, JWT_EXPIRES_IN, GOOGLE_CLIENT_ID
                       from .env, with dev-only fallback defaults
  controllers/
    authController.ts    register / login / googleAuth / me / logout — fully implemented
    gamesController.ts   placeholder → 501
    shopController.ts     placeholder → 501
    galleryController.ts  placeholder → 501
    profileController.ts  placeholder → 501
  middleware/
    auth.ts             requireAuth (401 if missing/invalid Bearer token),
                        optionalAuth (never blocks, just sets req.userId if valid)
    errorHandler.ts       notFound + generic errorHandler (no error detail leakage)
  models/user.ts        Prisma data access for the User table (Postgres)
  routes/               one file per resource, mounted under /api/<resource>
  utils/jwt.ts          signToken({userId}) / verifyToken(token)
```

Auth endpoints (`/api/auth`):
- `POST /register` — email/name/password, 409 on duplicate email, bcrypt
  hash (cost 10), returns `{ token, user }`.
- `POST /login` — 401 on bad credentials or on a Google-only account with no
  password set.
- `POST /google` — verifies `idToken` via `google-auth-library` against
  `GOOGLE_CLIENT_ID`, finds-or-creates a user by email.
- `GET /me` — requires auth, returns the current user.
- `POST /logout` — stateless JWT, so this is a no-op server-side; client
  clears its local session regardless of the response.

Everything else (`/api/games`, `/api/shop`, `/api/gallery`, `/api/profile`) is
a single `GET /` route returning `501` with a "not implemented yet" message.

## Environment / gotchas that aren't obvious from the code

- **Expo SDK is pinned at 54 — do not upgrade.** The tester's physical
  phone's Expo Go install (from the App Store) only supports SDK 54. Bumping
  the `expo` package to 56/57 previously broke on-device testing with
  "Project is incompatible with this version of Expo Go," even with no
  pending Expo Go update available. Confirm the tester's installed Expo Go
  SDK version (visible in Expo Go's Profile/Settings screen) before ever
  bumping this.
- **NordVPN breaks Expo's LAN auto-detection.** This dev machine runs
  NordVPN, which adds virtual network adapters (NordLynx, OpenVPN Data
  Channel Offload) that Expo's IP auto-detection can pick instead of the real
  WiFi adapter, advertising an unreachable address to the phone (blank/error
  screen in Expo Go, despite firewall/router being fine). Always start the
  dev server with the real WiFi LAN IP forced explicitly:
  ```
  set REACT_NATIVE_PACKAGER_HOSTNAME=<lan-ip> && npx expo start
  ```
  (find `<lan-ip>` via `Get-NetIPAddress`, the `WiFi` interface alias).
  Tunnel mode (`--tunnel`) has failed on this machine (ngrok errors) — LAN
  mode with forced hostname is the known-working approach.
- **Metro cache can go stale across SDK version churn.** Switching the
  `expo` package version repeatedly can leave `%TEMP%\metro-cache` and the
  project's `.expo` folder pointing at stale `node_modules` paths, causing a
  file-watcher `ENOENT` crash on startup with a misleading repeated
  "incompatible" log line. Fix: clear `%TEMP%\metro-cache` and `.expo`,
  restart with `--clear`.
- `steps-app/.env.local` (git-ignored) currently points
  `EXPO_PUBLIC_API_URL` at a LAN IP (`http://10.10.10.171:4000`) rather than
  `localhost`, for testing against the backend from a physical device — the
  IP will need updating if the dev machine's address changes.
- No ESLint/Prettier config exists in either project, and neither has a
  `test` or `lint` npm script — there is currently no automated
  linting/formatting/testing in this repo.
