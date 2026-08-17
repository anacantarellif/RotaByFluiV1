// Global toast, replacing project/app/app.jsx's `toast` state + pushToast/setTimeout.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import { Icon } from '../components/icons/Icon';
import { useTheme } from '../theme/ThemeContext';

type Toast = { msg: string; icon?: string } | null;

const ToastContext = createContext<{ pushToast: (msg: string, icon?: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { colors, font } = useTheme();

  const pushToast = useCallback((msg: string, icon?: string) => {
    setToast({ msg, icon });
    AccessibilityInfo.announceForAccessibility(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      {toast && (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          pointerEvents="none"
          style={{
            position: 'absolute', left: 20, right: 20, bottom: 96,
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: colors.ink, borderRadius: 999,
            paddingVertical: 12, paddingHorizontal: 16,
            alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
          }}
        >
          {toast.icon && <Icon name={toast.icon} size={16} color={colors.bg} />}
          <Text style={{ color: colors.bg, fontFamily: font.uiMedium, fontSize: 14 }}>{toast.msg}</Text>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
