// Shared bottom-sheet wrapper around @gorhom/bottom-sheet, standing in for the web
// prototype's `.sheet` CSS component (docs/HANDOFF.md §7 step 5: "Bottom sheets →
// @gorhom/bottom-sheet (the CSS `.sheet` vira snapPoints)").
//
// Every ported *Sheet component (EventSheet, FilterSheet, MapsHandoffSheet,
// RouteHandoffSheet, RateFlow, ...) should render its content through this instead
// of managing its own BottomSheetModal ref, so open/close, backdrop, handle styling,
// and accessibility (role="dialog" aria-modal equivalent) stay consistent everywhere.
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, StyleSheet, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '../../theme/ThemeContext';

// `open` mounts/unmounts the sheet; @gorhom/bottom-sheet's `index={0}` prop opens it
// immediately on mount (animated), and `enablePanDownToClose` + backdrop tap call
// `onClose`, which the parent uses to flip `open` back to false and unmount us.

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
  const ref = useRef<BottomSheet>(null);
  const contentRef = useRef<View>(null);
  const points = useMemo(() => snapPoints ?? ['50%', '90%'], [snapPoints]);

  useEffect(() => {
    if (!open) return;
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
    <BottomSheet
      ref={ref}
      index={0}
      snapPoints={points}
      onClose={onClose}
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
    </BottomSheet>
  );
}
