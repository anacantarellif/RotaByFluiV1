// Global toast, replacing project/app/app.jsx's `toast` state + pushToast/setTimeout.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Text, View } from 'react-native';
import { Icon } from '../components/icons/Icon';
import { SparkleBurst } from '../components/motion/SparkleBurst';
import { useTheme } from '../theme/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Toast = { msg: string; icon?: string; sparkle?: boolean } | null;

const ToastContext = createContext<{ pushToast: (msg: string, icon?: string, sparkle?: boolean) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast>(null);
  const sparkleTrigger = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { colors, font } = useTheme();
  const reduced = useReducedMotion();

  // Every pushToast() call (favoriting, rating, reporting, navigating handoff…)
  // used to snap the toast in/out instantly. Fading and sliding it in/out is a
  // small, self-contained change with app-wide reach — this one component
  // backs nearly every confirmation toast in the app.
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  const pushToast = useCallback(
    (msg: string, icon?: string, sparkle?: boolean) => {
      if (sparkle) sparkleTrigger.current += 1;
      setToast({ msg, icon, sparkle });
      AccessibilityInfo.announceForAccessibility(msg);
      clearTimeout(hideTimer.current);

      if (reduced) {
        opacity.setValue(1);
        translateY.setValue(0);
      } else {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, damping: 16, stiffness: 220, useNativeDriver: true }),
        ]).start();
      }

      hideTimer.current = setTimeout(() => {
        if (reduced) {
          setToast(null);
          return;
        }
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 10, duration: 180, useNativeDriver: true }),
        ]).start(() => setToast(null));
      }, 2200);
    },
    [reduced, opacity, translateY]
  );

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      {toast && (
        <Animated.View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          pointerEvents="none"
          style={{
            position: 'absolute', left: 20, right: 20, bottom: 96,
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: colors.ink, borderRadius: 999,
            paddingVertical: 12, paddingHorizontal: 16,
            alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
            opacity, transform: [{ translateY }],
          }}
        >
          {toast.icon && (
            <View>
              <Icon name={toast.icon} size={16} color={colors.bg} />
              {toast.sparkle && <SparkleBurst trigger={sparkleTrigger.current} color={colors.gold} size={11} />}
            </View>
          )}
          <Text style={{ color: colors.bg, fontFamily: font.uiMedium, fontSize: 14 }}>{toast.msg}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
