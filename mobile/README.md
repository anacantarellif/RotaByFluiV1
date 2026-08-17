# Rota by Flui — React Native app

React Native (Expo/TypeScript) port of the HTML/React prototype in `../project/`.
See `../project/docs/HANDOFF.md` for the original design spec, `../PORTING_GUIDE.md`
for the conventions this port follows, and `docs/ANDROID_AUTO_PLAN.md` for the
Android Auto phase (planned, not yet built).

This exists because the FIAP "Enterprise Challenge" Stage 2 brief requires a
functional mobile app (React Native or similar) with a real interactive map,
station detail, and working search filters, published to a public GitHub repo
(see `../chats/chat2.md`) — the `project/` folder is the executable design spec
for it, not the deliverable itself.

## Running it

```
cd mobile
npm install
npx expo start
```

Press `a` for Android, `i` for iOS (simulator), or scan the QR code with Expo Go
on a physical device. `react-native-maps` needs a native build to render Google
Maps on Android (see below) — Expo Go can still run the app with the map showing
its default/fallback provider.

## Adding a Google Maps API key

Edit `src/config.ts`:

```ts
export const ROTA_CONFIG = {
  googleMapsApiKey: 'YOUR_KEY_HERE',
  ...
};
```

Then wire the same key into native config (see `../project/docs/MAPS.md` §4 for
the underlying requirements):
- `app.json` → `expo.android.config.googleMaps.apiKey`
- `app.json` → `expo.ios.config.googleMapsApiKey`

Restrict the key by package name / bundle id in Google Cloud Console and enable
*Maps SDK for Android*, *Maps SDK for iOS*, *Directions API*, *Places API*.

## Status

Ported from `project/app/*.jsx` per `../PORTING_GUIDE.md`. Foundation (theme,
data, icons, config, skeletons, map, navigation shell) is done; screen-level
ports were built by parallel implementation passes — see git history / task
notes for what's complete vs. still a placeholder at any given point.

Not yet started: Android Auto (`docs/ANDROID_AUTO_PLAN.md`).
