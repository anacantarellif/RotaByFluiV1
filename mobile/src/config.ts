// Ported from project/app/config.jsx.
//
// googleMapsApiKey
//   Leave empty ('') and <GeoMapView> falls back to Apple/OSM's default provider on
//   iOS or the plain (non-Google) provider on Android — see docs/MAPS.md. Fill this
//   in (or wire it through app.config.ts / EAS secrets) to switch on the Google
//   provider via react-native-maps' PROVIDER_GOOGLE, matching the web prototype's
//   "google" vs "tiles" fallback behavior.
//
//   Native builds additionally need the key in AndroidManifest.xml
//   (com.google.android.geo.API_KEY) and AppDelegate (GMSServices.provideAPIKey) —
//   see docs/MAPS.md §4. Expo config plugin wiring is in app.json (`ios.config.googleMapsApiKey`,
//   `android.config.googleMaps.apiKey`).
export const ROTA_CONFIG = {
  googleMapsApiKey: '',

  // Simulated network latency for the demo's loading states, in ms.
  // Set to 0 to render instantly. Swap for real isLoading state once wired to a data layer.
  latency: { map: 900, list: 700, detail: 550 },
};
