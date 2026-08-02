# Steps

Steps is a mobile app for a Montessori academy serving children aged 1-4 and their parents. This repo contains the mobile client and its backend API as two independent projects.

## Stack

- **Mobile app** (`steps-app/`) — React Native + Expo (SDK 57), TypeScript, Expo Router, TanStack Query, Zustand, Axios, AsyncStorage, NativeWind
- **Backend API** (`steps-server/`) — Node.js + Express 5, TypeScript

No database is wired up yet — the server is a skeleton with placeholder routes.

## Project structure

```
steps-app/          Expo React Native frontend
  src/
    app/             expo-router screens (file-based routing)
    components/      shared UI components
    hooks/           custom hooks
    store/           zustand stores
    services/        API clients
    constants/        colors, fonts, sizes
    assets/          images, icons

steps-server/        Node.js + Express backend
  src/
    routes/          route definitions (auth, games, shop, gallery, profile)
    controllers/     route handlers
    middleware/       error handling, etc.
    models/          (empty — no database yet)
    config/          environment config
    index.ts        entry point
```

## Running locally

### Backend (steps-server)

```bash
cd steps-server
npm install
cp .env.example .env
npm run dev
```

The API starts on `http://localhost:4000` by default. Check it's up with:

```bash
curl http://localhost:4000/health
```

### Mobile app (steps-app)

```bash
cd steps-app
npm install
npm run start
```

This opens the Expo Dev Tools / QR code. From there:

- Press `i` to open in the iOS Simulator (macOS only)
- Press `a` to open in an Android emulator
- Press `w` to open in a browser (requires `npx expo install react-native-web` first — web isn't set up by default)
- Or scan the QR code with the Expo Go app on your phone

By default the app points at `http://localhost:4000` for API calls (see `src/services/api.ts`). Set `EXPO_PUBLIC_API_URL` in an `.env` file at the root of `steps-app` to point elsewhere (e.g. your machine's LAN IP when testing on a physical device).
