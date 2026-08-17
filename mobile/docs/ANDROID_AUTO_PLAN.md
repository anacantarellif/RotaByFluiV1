# Android Auto — implementation plan (not yet built)

Source spec: `project/app/car.jsx` + `project/app/car.css` (5 screens, S1–S5) and
`project/frames/android-frame.jsx` (device chrome used only for the design-tool
board, not part of the app). This document is the plan; the phone app
(`mobile/`) is being built first since it's both the larger scope and the
explicit Stage 2 deliverable (see `project/docs/HANDOFF.md` and the Enterprise
Challenge brief referenced in `chats/chat2.md`).

## Why this can't be a pixel port

`car.jsx` is a custom HTML/SVG mockup, but the prototype's own section notes
already name the real Android Auto template each screen stands in for (see the
`aa-note` copy in `car.jsx`'s `Board()`). Android's **Car App Library**
(`androidx.car.app`) only lets a navigation app draw two things freely: the map
surface itself, and small icons (`CarIcon`) inside otherwise-fixed templates
(list rows, panes, action buttons). Driver-distraction rules forbid arbitrary
custom UI — no custom battery rings, no bespoke station cards, no gold Selo Flui
badge artwork beyond a small icon. So this phase is a **re-interpretation into
templates**, not a visual port. That's what the user chose (see "Real Android
Auto via templates" over "phone-based visual preview").

## Screen → template mapping

| # | car.jsx screen | Real template | Notes |
|---|---|---|---|
| S1 | Lista + mapa de pontos próximos | `PlaceListMapTemplate` | Rows: name, `CarIcon` for Selo Flui, distance, kW as secondary text. Map pane shows the same markers as the phone's `GeoMapView` (shared marker color rules). |
| S2 | Ficha do ponto | `PaneTemplate` (+ map as the app's background surface, or a second `Row` pane) | Rows for potência/conectores/preço/horário; up to 2 primary `Action`s ("Navegar", "Comodidades" as a secondary pane). |
| S3 | Navegação turn-by-turn | `NavigationTemplate` | Real template for this — `Trip`/`Step` objects drive the maneuver banner + ETA bar natively; the app draws the map itself via `Surface`/`SurfaceCallback`. This is the only screen with a custom-drawn map. |
| S4 | Conectado / enquanto carrega | `PaneTemplate` or `ListTemplate` | No battery-ring widget in the library — represent charge state as text rows ("64% · carregando · pronto em 22 min") plus list rows for "enquanto carrega" suggestions (each a tappable `Row` with an icon). |
| S5 | Alerta da comunidade / recalcular | `NavigationTemplate`'s in-nav alert (`CarToast` / `Alert` API) shown over S3, not a separate screen | Actions: "Recalcular rota" (primary), "Ignorar" (secondary). |

## Library choice

`react-native-carplay` (birkir) — Android Auto support shipped in v2.4.0
(currently beta) via the same JS template API used for CarPlay, bridging to
`androidx.car.app` natively. Alternative: `Shopify/react-native-android-auto`
(Android-only, more actively maintained for this exact library, React-renderer
style API — `<Pane>`, `<Row>`, `<ListTemplate>` etc. as JSX). Recommendation:
prototype against `Shopify/react-native-android-auto` first since it's
purpose-built for this library and has an actively maintained example repo
(`Reactor-Labs/ReactNativeAndroidAutoExample` is another reference
implementation of the same idea) — fall back to `react-native-carplay` if we
also need CarPlay (iOS) parity later, since the source only speaks to Android
Auto (device: Android, chosen in `chats/chat1.md`).

## What this requires that the phone app doesn't

- **Bare/prebuild workflow**: Car App Library integration needs native Kotlin
  additions (a `CarAppService`, a `Session`, `Screen` subclasses) that Expo's
  managed workflow can't express without a config plugin. Either the chosen
  library ships an Expo config plugin, or this needs `npx expo prebuild` to
  generate the `android/` project and hand-edit `AndroidManifest.xml` +
  add the Kotlin classes.
- **Manifest**: `<meta-data android:name="androidx.car.app.minCarApiLevel" ...>`
  plus `<intent-filter>` for `androidx.car.app.CarAppService`, and
  `androidx.car.app.category.NAVIGATION` (see AndroidManifest requirements in
  `docs/HANDOFF.md`'s Google Maps key section for the pattern — same file,
  different keys).
- **Testing**: the Android Auto Desktop Head Unit (DHU) emulator, or a real
  head unit — this can't be verified in Expo Go and needs a native dev build
  (`expo run:android` after prebuild, or an EAS dev client).

## Suggested order once this phase starts

1. `expo prebuild` (or confirm the chosen library's config plugin covers it).
2. Wire the manifest + a minimal `CarAppService`/`Session` that shows a single
   static `PaneTemplate` ("Rota" + a placeholder row) — prove the app shows up
   in the DHU before building out real screens.
3. S1 (`PlaceListMapTemplate`) using the same `DATA.stations` — reuse marker
   color rules from `mobile/src/components/map/MarkerPins.tsx` but re-expressed
   as `CarIcon`s (no custom SVG marker bodies).
4. S3 (`NavigationTemplate`) reusing `mobile/src/utils/routeSim.ts` for the
   simulated maneuver feed.
5. S2, S4, S5.
6. Confirm Selo Flui / availability color language reads correctly in Android
   Auto's day/night theme (night is the default and effectively mandatory
   while driving, per `chats/chat1.md`'s original design brief).

Status: **planned, not implemented.** Tracked as a follow-up phase after the
phone app screens are complete.
