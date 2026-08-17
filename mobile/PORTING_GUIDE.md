# Porting conventions — Rota by Flui (React Native / Expo)

This app is a port of the HTML/React prototype in `../project/` (see
`../project/docs/HANDOFF.md`, `MAPS.md`, `LOADING-STATES.md`). Read the relevant
source `.jsx` file(s) in `../project/app/` in full before porting — they are the
spec. Match behavior and pt-BR copy exactly; **re-implement markup as native RN
views**, don't try to run HTML/CSS in RN.

## Foundation already built (import, don't recreate)

- **Theme** — `src/theme/ThemeContext.tsx`: `useTheme()` returns
  `{ mode, colors, space, font, density, markers, showReports, setThemePreference,
  setDensity, setMarkers, setShowReports }`.
  - `colors` is the token set from `src/theme/tokens.ts` (`palette.light` /
    `palette.dark` shape) — e.g. `colors.primary`, `colors.surface`, `colors.ok`.
    **Never hardcode a hex color** — always read from `colors`, mirroring the CSS
    rule in `docs/HANDOFF.md` §2 ("nunca hex literal, sempre var(--token)").
  - `space` is density-driven: `{ pad, gap, radius, radiusSm, ui }` (numbers, px).
  - `font` gives font family strings (Inter, already loaded in `App.tsx`):
    `font.display`, `font.displayBold`, `font.ui`, `font.uiMedium`,
    `font.uiSemibold`, `font.mono`.
- **Icons** — `src/components/icons/Icon.tsx`: `Icon`, `Seal`, `SeloRow`,
  `SeloBadge`. Same icon name strings as the source `P`/`FILLED` maps in
  `project/app/icons.jsx` (e.g. `<Icon name="zap" size={18} />`).
- **Data** — `src/data/data.ts` exports `DATA` (typed via `src/data/types.ts`).
  Field names match `project/app/data.jsx` exactly. Do not reshape it.
- **Config** — `src/config.ts` exports `ROTA_CONFIG` (`googleMapsApiKey`, `latency`).
- **Loading** — `src/hooks/useDelay.ts` (`useDelay(ms, dep)`, same contract as the
  source `useDelay`), `src/components/skeletons/Skeletons.tsx`
  (`Skeleton`, `Spinner`, `MapSkeleton`, `ListSkeleton`, `StationSkeleton`).
- **Map** — `src/components/map/GeoMapView.tsx` (`<GeoMapView stations active onPin
  onReport showReports recenterSignal />`, same prop contract as
  `project/app/gmap.jsx`). Marker pieces: `src/components/map/MarkerPins.tsx`
  (`StationPin`, `ReportPin`, `pinLabel`).
  - **The legacy illustrated map (`project/app/map.jsx`, `MapStatic`, the
    1000×1500 x/y coordinate space) is NOT being ported.** Per
    `docs/MAPS.md` §5, nav/trip route drawing should use the real map
    (`GeoMapView`) with a `Polyline` from `react-native-maps` computed from real
    lat/lng (synthetic waypoints are fine — same "simulated" caveat as the
    source's synthetic polyline, see `docs/MAPS.md` §5 table). Do not try to
    port `MAP_W`/`MAP_H`/x-y positioning.
- **Bottom sheets** — `src/components/sheets/ModalSheet.tsx`:
  `<ModalSheet open onClose snapPoints label>{content}</ModalSheet>`, built on
  `@gorhom/bottom-sheet`. Use this for every `*Sheet`/modal flow (EventSheet,
  FilterSheet, MapsHandoffSheet, RouteHandoffSheet, RateFlow, station detail as a
  sheet if the source presents it that way). `label` is the accessible dialog name
  (equivalent of the source's `role="dialog" aria-label`).

## Conventions for new code

- **File layout**: one file per source domain, same as the source
  (`docs/HANDOFF.md` closing note: "um arquivo por domínio"). Put screens in
  `src/screens/`, shared feature components in `src/components/<domain>/`.
- **Language**: all user-facing text stays in **pt-BR**, copied verbatim from the
  source file's JSX strings.
- **Styling**: use `StyleSheet.create` or inline styles reading from `useTheme()`
  — no hardcoded hex, no literal `16px`-style magic numbers where a `space.*`
  token applies.
- **Accessibility** (`docs/HANDOFF.md` §5 — must not regress):
  - Every icon-only touchable needs `accessibilityLabel`.
  - Interactive elements: `accessibilityRole="button"` (or `"switch"`/`"radio"`
    for filter chips/toggles), `accessibilityState={{ selected / checked }}`.
  - Sheets/modals: `accessibilityViewIsModal` (handled by `ModalSheet`).
  - Live regions (toasts, result counts): wrap text updates so they're
    announced — `AccessibilityInfo.announceForAccessibility(msg)` is the RN
    equivalent of the source's `aria-live="polite"`.
  - Touch targets ≥ 44×44 (use `hitSlop` on small icon buttons if the visual
    size is smaller).
  - Respect `useReducedMotion()` (`src/hooks/useReducedMotion.ts`) for any
    custom animation you add beyond what `Skeletons.tsx`/`Spinner` already handle.
- **Loading states**: any screen/section that reads from `DATA` and originally
  used `useDelay` in the source must keep that simulated-latency skeleton
  pattern (`docs/LOADING-STATES.md`) — don't render instantly.
- **Navigation**: `src/navigation/RootNavigator.tsx` is a native-stack with a
  `Tabs` screen (bottom tabs: Map/Route/Community/Profile) plus full-screen-modal
  `Nav` and `Trip` screens (`src/navigation/types.ts` has the param lists — `Nav`
  takes `{ station }`, `Trip` takes `{ guide }`, both full objects from `DATA`, not
  ids). From inside a tab screen, `useNavigation()` (untyped, or
  `useNavigation<NativeStackNavigationProp<RootStackParamList>>()`) can navigate
  straight to `'Nav'`/`'Trip'` — React Navigation resolves route names it doesn't
  recognize in the current navigator by walking up to the parent stack, so this
  works without extra plumbing. Don't invent your own screen-switching state for
  what the source did with `tab`/`nav`/`trip` App-level state — that's now
  react-navigation's job. Non-navigation callback props from the source
  (`pushToast`, `onToggleFav`, `favs`) come from `useToast()` /
  `useFavorites()` instead of being passed down.
- **Toasts**: there's a shared `pushToast(msg, icon?)` passed down from the app
  root (see `App.tsx`) — call it, don't build a local toast.
- **TypeScript**: type all props; reuse types from `src/data/types.ts` rather than
  redeclaring `Station`/`Report`/etc. shapes.

## When something in the source doesn't map 1:1 to RN

Note it inline as a short comment (why, and what the RN equivalent is) — same
spirit as `docs/MAPS.md` §5's "o que ainda é simulado" table. Don't silently drop
a documented requirement (e.g. an accessibility rule); if you truly can't
implement something, say so in your final report rather than skipping silently.
