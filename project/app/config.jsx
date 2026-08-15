// config.jsx — runtime configuration. Loaded BEFORE every other app script.
//
// googleMapsApiKey
//   Leave empty ('') and the app runs on the keyless raster-tile provider, so the
//   prototype works with no billing account. Paste a Maps JavaScript API key here
//   (or inject it at build time) and <GeoMapView> switches to the real Google
//   Maps provider automatically — same markers, same callbacks, no other change.
//
//   In the React Native build this value comes from the native manifests instead;
//   see docs/MAPS.md.
window.ROTA_CONFIG = {
  googleMapsApiKey: '',

  // Simulated network latency for the demo's loading states, in ms.
  // Set both to 0 to render instantly.
  latency: { map: 900, list: 700, detail: 550 },
};
