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
  scroll = true,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  snapPoints?: (string | number)[];
  scroll?: boolean;
  label: string; // accessibilityLabel for the dialog, e.g. "Reportar evento"
  children: React.ReactNode;
}) {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const contentRef = useRef<View>(null);
  const points = useMemo(() => snapPoints ?? ['50%', '90%'], [snapPoints]);

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
