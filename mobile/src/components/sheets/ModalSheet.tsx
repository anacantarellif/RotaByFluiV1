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
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface, borderTopLeftRadius: space.radius, borderTopRightRadius: space.radius }}
      handleIndicatorStyle={{ backgroundColor: colors.lineStrong, width: 36 }}
      accessibilityViewIsModal
      accessibilityLabel={label}
    >
      <Body
        ref={contentRef as any}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ paddingBottom: 24 }}
        accessible={false}
      >
        {children}
      </Body>
    </BottomSheetModal>
  );
}
