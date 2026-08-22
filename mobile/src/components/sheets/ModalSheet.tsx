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
import { AccessibilityInfo, findNodeHandle, StyleSheet, View } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

// `open` mounts the modal and immediately calls `.present()`; flipping it back to
// false calls `.dismiss()`, and once the close animation finishes `onDismiss`
// fires `onClose`, which the parent uses to unmount us.

export function ModalSheet({
  open,
  onClose,
  snapPoints,
  dynamicSizing = false,
  scroll = true,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  snapPoints?: (string | number)[];
  // Sizes the sheet to exactly fit its rendered content's natural height
  // instead of a fixed/guessed snapPoint. Right for content that just stacks
  // (a report card, the station peek card) — wrong for flex-based layouts
  // that expect a given height to distribute across a header/scroll-body/
  // sticky-footer column (RateFlow, the ficha's own internal scroll+footer),
  // which still need `snapPoints`. See the enableDynamicSizing comment below
  // for why this used to be hardcoded off everywhere.
  dynamicSizing?: boolean;
  scroll?: boolean;
  label: string; // accessibilityLabel for the dialog, e.g. "Reportar evento"
  children: React.ReactNode;
}) {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const contentRef = useRef<View>(null);
  const points = useMemo(() => (dynamicSizing ? undefined : snapPoints ?? ['50%', '90%']), [snapPoints, dynamicSizing]);

  useEffect(() => {
    if (!open) return;
    ref.current?.present();
    const handle = findNodeHandle(contentRef.current);
    if (handle) setTimeout(() => AccessibilityInfo.setAccessibilityFocus(handle), 260);
  }, [open]);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="close" />,
    []
  );

  if (!open) return null;

  const Body = scroll ? BottomSheetScrollView : BottomSheetView;

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={points}
      onDismiss={onClose}
      enablePanDownToClose
      // @gorhom/bottom-sheet defaults this to true, which makes the sheet
      // auto-size to its rendered content's natural height instead of
      // respecting `snapPoints`/`index` above. Every *Sheet in this app used
      // to pass explicit snapPoints expecting them to be authoritative (e.g.
      // RateFlow's single `['92%']` point, meant to open already fully
      // expanded), so leaving this at its default silently overrode that:
      // sheets opened sized to however tall their content happened to
      // measure, squeezing flex-based layouts like RateFlow's header/
      // scroll-body/footer column into less height than they were built for
      // (reported: the rating sheet not opening already expanded, and its
      // footer button looking undersized as a result) — hence defaulting the
      // `dynamicSizing` prop above to false. But that default-off caused a
      // *different* problem for sheets that don't have a flex layout to
      // squeeze: the station peek card and the report-detail card just stack
      // a fixed amount of content, so a guessed percentage snapPoint either
      // left a large empty gap below the content (peek's old `32%`) or cut
      // the last button off entirely when the content turned out taller than
      // guessed (the report sheet's default `['50%','90%']`, with its
      // second button past the fold). Both now opt into dynamicSizing
      // instead of fighting over one snapPoint guess.
      enableDynamicSizing={dynamicSizing}
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
      {dynamicSizing ? (
        // The absoluteFill+bottom trick below relies on the Body already
        // having a size to shrink — exactly backwards for dynamicSizing,
        // which sizes the *sheet* by measuring the Body's own rendered
        // content height. Reserving the safe-area inset has to be real
        // padding inside what gets measured instead, or it's invisible to
        // the measurement and the sheet ends up sized too short. Each
        // dynamicSizing sheet's own content is responsible for its own
        // *other* spacing (e.g. EventSheet's and the peek card's own
        // paddingBottom) — this only adds the device inset on top of that.
        <Body ref={contentRef as any} accessible={false}>
          <View style={{ paddingBottom: insets.bottom }}>{children}</View>
        </Body>
      ) : (
        // A sheet's bottom edge always sits flush with the true screen bottom
        // (behind the system nav bar in Expo's edge-to-edge Android mode) —
        // the snap point only controls how tall the sheet is, not where its
        // bottom edge is. Pulling `bottom` in by `insets.bottom` shrinks the
        // content area itself to stop above the bar, so anything laid out with
        // flex — including a sticky footer button pinned to the end of a
        // flex:1 column, e.g. RateFlow's "Continuar" — lands above it instead
        // of needing every sheet to separately pad for the inset itself.
        <Body
          ref={contentRef as any}
          style={[StyleSheet.absoluteFill, { bottom: insets.bottom }]}
          contentContainerStyle={{ paddingBottom: 24 }}
          accessible={false}
        >
          {children}
        </Body>
      )}
    </BottomSheetModal>
  );
}
