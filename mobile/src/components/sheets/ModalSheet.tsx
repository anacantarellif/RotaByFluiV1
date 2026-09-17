// Shared bottom-sheet wrapper around @gorhom/bottom-sheet, standing in for the web
// prototype's `.sheet` CSS component (docs/HANDOFF.md §7 step 5: "Bottom sheets →
// @gorhom/bottom-sheet (the CSS `.sheet` vira snapPoints)").
//
// Every ported *Sheet component (EventSheet, FilterSheet, MapsHandoffSheet,
// RouteHandoffSheet, RateFlow, ...) should render its content through this instead
// of managing its own sheet ref, so open/close, backdrop, handle styling, and
// accessibility (role="dialog" aria-modal equivalent) stay consistent everywhere.
//
// Built on `BottomSheetModal`, not the plain `BottomSheet` this used before —
// plain `BottomSheet` renders in place in the component tree, so a sheet opened
// from a screen nested inside a tab (e.g. RateFlow from GuideDetail from
// RouteScreen) could end up stacked *below* the bottom tab bar, which sits at a
// higher level as a sibling of the tab navigator's screen content (reported: the
// rating flow's "Continuar" button was unreachable, hidden behind the tab bar).
// `BottomSheetModal` renders through a portal mounted at the app root
// (`BottomSheetModalProvider` in App.tsx), so it's always on top of everything,
// tab bar included, regardless of how deep the screen that opened it is nested.
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

// `open` mounts the modal and immediately calls `.present()`; flipping it back to
// false calls `.dismiss()`, and once the close animation finishes `onDismiss`
// fires `onClose`, which the parent uses to unmount us.

export function ModalSheet({
  open,
  onClose,
  snapPoints,
  scroll = true,
  scrollableContent = scroll,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  // A single-number entry (e.g. `[measuredHeight]`) is exactly how a sheet
  // that just stacks fixed content (no flex layout to fill) sizes itself
  // precisely instead of guessing a percentage — see StationSheet's peek
  // mode and EventSheet, both computed from an onLayout measurement of
  // their own content. `enableDynamicSizing` looked like the built-in way
  // to do this without a manual measurement, but it measured tall: both of
  // those sheets opened with a visibly oversized gap below their last
  // button that a same-height snapPoints entry doesn't have, so it's not
  // used here at all — every *Sheet in this app passes explicit snapPoints.
  snapPoints?: (string | number)[];
  scroll?: boolean;
  // True when `children` scroll internally on their own instead of through
  // this component's own `Body` (StationSheet's ficha, RateFlow — both pass
  // `scroll={false}` here but render their own ScrollView deeper down).
  // Defaults to `scroll`, since when this component's own Body *is* the
  // scroll region, that's obviously "scrollable content" too. See the note
  // by `enableContentPanningGesture` below for what this actually controls.
  scrollableContent?: boolean;
  label: string; // accessibilityLabel for the dialog, e.g. "Reportar evento"
  children: React.ReactNode;
}) {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const contentRef = useRef<View>(null);
  // Tried adding `insets.bottom` to numeric (measured) entries here to
  // compensate for the Body's own shrink below — overcorrected: the two
  // sheets this was meant to fix (ReportSheet, the Maps/Waze handoffs) use
  // `scroll`, while the two sheets that were already correct without any
  // adjustment (the station peek card, EventSheet) use `scroll={false}`
  // (plain BottomSheetView) — reported as those two suddenly gaining a
  // large blank gap they never had before. The two Body implementations
  // evidently don't need the same compensation, so the real fix is making
  // every content-hugging sheet use the `scroll={false}` path that was
  // already proven correct, not patching ModalSheet itself — see
  // `scroll={false}` on ReportSheet/MapsHandoffSheet/RouteHandoffSheet.
  // Keyed on the *values* (joined into a string), not the `snapPoints` array
  // reference: most callers pass an inline array literal (`snapPoints={['92%']}`),
  // a fresh reference on every one of that screen's own re-renders — e.g.
  // RateFlow re-rendering on every star tap (`setStars`). Keying on the
  // reference made `points` "change" on those re-renders too even though the
  // actual snap value never did, which fired the re-snap effect below mid-tap
  // (reported: picking a star closed the whole sheet). Only a real value
  // change — a measured height from onLayout actually landing — should
  // re-trigger that reflow.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const points = useMemo(() => snapPoints ?? ['50%', '90%'], [snapPoints?.join(',')]);

  useEffect(() => {
    if (!open) return;
    ref.current?.present();
    const handle = findNodeHandle(contentRef.current);
    if (handle) setTimeout(() => AccessibilityInfo.setAccessibilityFocus(handle), 260);
  }, [open]);

  // Content-hugging sheets (EventSheet, the station peek card, ReportSheet,
  // the Maps/Waze handoff sheets) pass a single-entry `snapPoints` measured
  // from their own content via onLayout, with a hardcoded guess for the
  // very first frame before that measurement lands. `.present()` above
  // fires in its own effect on mount, essentially always before that native
  // onLayout round-trip completes — so it opens at the *guessed* height,
  // and simply changing the `snapPoints` prop afterward does not, on its
  // own, make an already-presented BottomSheetModal reflow to the new
  // value (reported as sheets staying slightly clipped or oversized no
  // matter how close the guess was). Explicitly re-snapping to index 0
  // whenever `points` changes after the sheet is already open forces that
  // reflow once the real measurement is in, instead of being stuck with
  // whichever number was guessed at mount.
  const hasPresented = useRef(false);
  useEffect(() => {
    if (!open) return;
    if (!hasPresented.current) {
      hasPresented.current = true;
      return;
    }
    ref.current?.snapToIndex(0);
  }, [points, open]);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="close" />,
    []
  );

  if (!open) return null;

  // Plain RN ScrollView, not BottomSheetScrollView: the latter's pan
  // gesture is built on react-native-gesture-handler, which a WebView
  // elsewhere on the same screen (the map's Leaflet fallback,
  // GeoMapView.tsx → LeafletMapView.tsx) can leave in a corrupted state
  // even after unmounting — reported as a sheet's scroll working fine
  // when opened from Favoritos (no WebView ever mounted there) but frozen
  // when opened from the map or list view (both live on MapScreen, which
  // does mount that WebView). Plain ScrollView uses RN's native
  // ScrollResponder, entirely outside gesture-handler, so it isn't
  // exposed to that corruption.
  //
  // Typed as ComponentType<any>: ScrollView and BottomSheetView don't
  // share a ref type, and TS's JSX union-element inference drops `ref`
  // entirely when picking between two differently-typed components like
  // this.
  const Body: React.ComponentType<any> = scroll ? ScrollView : BottomSheetView;

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={points}
      onDismiss={onClose}
      enablePanDownToClose
      // A plain ScrollView doesn't know how to hand a drag off to the
      // sheet's own pan-to-dismiss gesture the way BottomSheetScrollView
      // did (only closing once scrolled to the top and pulled further) —
      // without this, the two gestures raced for every touch, so it took
      // two fingers to find the one that actually scrolled instead of
      // closing the sheet (reported).
      //
      // `enableContentPanningGesture={false}` was the first fix tried here
      // — it "worked" for plain scrolling, but broke tapping a Pressable
      // inside that content entirely (reported: picking a star in RateFlow
      // closed the whole sheet). That prop swaps the content wrapper's
      // actual component type internally (BottomSheetContent.tsx), a path
      // with multiple open upstream bugs for exactly this kind of breakage
      // (gorhom/react-native-bottom-sheet#2330, #765, #1570) — not this
      // app's logic, the library's own content-panning toggle is
      // unreliable in this version. `enableContentPanningGesture` stays on
      // its default (true) instead, keeping that content wrapper on its
      // normal, stable path; giving its own pan gesture an enormous
      // activation threshold makes it never actually recognize a drag as
      // its own, so a scrollable sheet's content area works exactly like
      // plain RN content — taps and scrolls both reach it untouched. The
      // sheet is still dismissible without any drag at all via its handle
      // (unaffected — a separate gesture), the backdrop tap, or each
      // sheet's own close button.
      activeOffsetY={scrollableContent ? [-999999, 999999] : undefined}
      // @gorhom/bottom-sheet defaults this to true, which makes the sheet
      // auto-size to its rendered content's natural height instead of
      // respecting `snapPoints`/`index` above. Every *Sheet in this app
      // passes explicit snapPoints expecting them to be authoritative (e.g.
      // RateFlow's single `['92%']` point, meant to open already fully
      // expanded), so this stays off — leaving it at its default silently
      // overrode that: sheets opened sized to however tall their content
      // happened to measure, squeezing flex-based layouts like RateFlow's
      // header/scroll-body/footer column into less height than they were
      // built for (reported: the rating sheet not opening already expanded,
      // and its footer button looking undersized as a result). This was
      // also tried, briefly, as an opt-in for sheets with no flex layout to
      // squeeze (the peek card, the report-detail card) instead of guessing
      // a percentage snapPoint — it measured tall enough to leave its own
      // visibly oversized gap below the last button, so those sheets
      // measure their own content via onLayout and pass the exact result as
      // a single-entry `snapPoints` instead; this stays hardcoded off.
      enableDynamicSizing={false}
      // Default stack behavior ('switch') *minimizes* whatever sheet is already
      // registered when a new one mounts, instead of dismissing it — harmless
      // when only one sheet is ever open, but here a station's peek→ficha→handoff
      // flow closes one sheet and opens the next in the same tap (same React
      // commit), so the outgoing sheet was getting minimized rather than
      // dismissed and the new one never visibly took over (reported as "não
      // consigo ver a ficha" / the Maps preview sheet not appearing). 'replace'
      // makes that handoff an explicit dismiss-then-present instead.
      stackBehavior="replace"
      // Only affects where the sheet rests *off-screen* once dismissed — not
      // the visible content area while it's open (that's the `Body` style
      // below). Kept for a clean dismiss animation, but on its own this was
      // mistakenly assumed to also keep open content clear of the system bar,
      // which it doesn't — the "Continuar" button stayed cut off on 3-button
      // nav devices even with this set.
      bottomInset={insets.bottom}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface, borderTopLeftRadius: space.radius, borderTopRightRadius: space.radius }}
      handleIndicatorStyle={{ backgroundColor: colors.lineStrong, width: 36 }}
      accessibilityViewIsModal
      accessibilityLabel={label}
    >
      {/* A sheet's bottom edge always sits flush with the true screen bottom
          (behind the system nav bar in Expo's edge-to-edge Android mode) —
          the snap point only controls how tall the sheet is, not where its
          bottom edge is. Pulling `bottom` in by `insets.bottom` shrinks the
          content area itself to stop above the bar, so anything laid out with
          flex — including a sticky footer button pinned to the end of a
          flex:1 column, e.g. RateFlow's "Continuar" — lands above it instead
          of needing every sheet to separately pad for the inset itself. */}
      <Body
        ref={contentRef as any}
        style={[StyleSheet.absoluteFill, { bottom: insets.bottom }]}
        contentContainerStyle={{ paddingBottom: 24 }}
        accessible={false}
      >
        {children}
      </Body>
    </BottomSheetModal>
  );
}
