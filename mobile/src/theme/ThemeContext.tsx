import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Density, ThemeMode, densityTokens, fontFamily, palette } from './tokens';

// Mirrors the `t` tweaks state from project/app/app.jsx (TWEAK_DEFAULTS):
// dark, density, markers ("Pino"|"Ponto"), reports (show community reports on map).
export type MarkerStyle = 'pin' | 'dot';

type Settings = {
  themePreference: ThemeMode | 'system';
  density: Density;
  markers: MarkerStyle;
  showReports: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  themePreference: 'system',
  density: 'regular',
  markers: 'pin',
  showReports: true,
};

const STORAGE_KEY = 'rota_settings_v1';

type ThemeContextValue = {
  mode: ThemeMode;
  themePreference: ThemeMode | 'system';
  setThemePreference: (m: ThemeMode | 'system') => void;
  density: Density;
  setDensity: (d: Density) => void;
  markers: MarkerStyle;
  setMarkers: (m: MarkerStyle) => void;
  showReports: boolean;
  setShowReports: (v: boolean) => void;
  colors: (typeof palette)['light'];
  space: (typeof densityTokens)['regular'];
  font: typeof fontFamily;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        } catch {}
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);

  const mode: ThemeMode = settings.themePreference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : settings.themePreference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      themePreference: settings.themePreference,
      setThemePreference: (themePreference) => setSettings((s) => ({ ...s, themePreference })),
      density: settings.density,
      setDensity: (density) => setSettings((s) => ({ ...s, density })),
      markers: settings.markers,
      setMarkers: (markers) => setSettings((s) => ({ ...s, markers })),
      showReports: settings.showReports,
      setShowReports: (showReports) => setSettings((s) => ({ ...s, showReports })),
      colors: palette[mode],
      space: densityTokens[settings.density],
      font: fontFamily,
    }),
    [mode, settings]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
