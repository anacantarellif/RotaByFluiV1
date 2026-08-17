// Design tokens ported 1:1 from project/app/styles.css (`.rota` / `[data-theme]` / `[data-density]`).
// Keep names aligned with docs/HANDOFF.md §2 so the mapping back to the web prototype stays obvious.

export type ThemeMode = 'light' | 'dark';
export type Density = 'compact' | 'regular' | 'comfy';

export const focus = '#2F77F6';

export const availability = {
  light: { ok: '#2E9E5B', busy: '#E08A1E', off: '#D14343' },
  dark: { ok: '#3CB36B', busy: '#E89B3A', off: '#E25B5B' },
};

export const palette = {
  light: {
    bg: '#F4EEE3',
    surface: '#FFFFFF',
    surface2: '#FBF7EF',
    surface3: '#F0E8D8',
    ink: '#211B2A',
    inkSoft: '#6A6275',
    inkFaint: '#9A92A3',
    line: '#E7DECC',
    lineStrong: '#DACFB8',
    primary: '#6C2BD9',
    primary2: '#9D5BE8',
    primaryInk: '#FFFFFF',
    primarySoft: '#F1EAFB',
    primarySoftInk: '#5B21B6',
    gold: '#B8862F',
    goldInk: '#8A6420',
    goldSoft: '#F6ECD6',
    shadow: 'rgba(40,28,60,0.10)',
    shadowLg: 'rgba(40,28,60,0.18)',
    scrim: 'rgba(33,27,42,0.42)',
    mapLand: '#ECE4D4',
    mapLand2: '#E5DBC6',
    mapRoad: '#FBF8F1',
    mapRoadMajor: '#FFFFFF',
    mapRoadLine: '#E0D6C0',
    mapWater: '#BFD6DF',
    mapPark: '#CBDDAE',
    ...availability.light,
  },
  dark: {
    bg: '#14111B',
    surface: '#1C1726',
    surface2: '#221C2E',
    surface3: '#2B2438',
    ink: '#F1ECF7',
    inkSoft: '#A79FB5',
    inkFaint: '#756C84',
    line: 'rgba(255,255,255,0.09)',
    lineStrong: 'rgba(255,255,255,0.16)',
    primary: '#9B6BFF',
    primary2: '#B98CFF',
    primaryInk: '#1A1024',
    primarySoft: '#2A2140',
    primarySoftInk: '#C9B3FF',
    gold: '#E0B354',
    goldInk: '#E8C06A',
    goldSoft: '#2E2616',
    shadow: 'rgba(0,0,0,0.4)',
    shadowLg: 'rgba(0,0,0,0.55)',
    scrim: 'rgba(8,6,12,0.6)',
    mapLand: '#191421',
    mapLand2: '#1F1A29',
    mapRoad: '#2A2336',
    mapRoadMajor: '#352C44',
    mapRoadLine: '#3A3048',
    mapWater: '#15212C',
    mapPark: '#1C2A1E',
    ...availability.dark,
  },
};

export const densityTokens: Record<Density, { pad: number; gap: number; radius: number; radiusSm: number; ui: number }> = {
  regular: { pad: 16, gap: 12, radius: 20, radiusSm: 12, ui: 15 },
  compact: { pad: 12, gap: 8, radius: 16, radiusSm: 10, ui: 14 },
  comfy: { pad: 20, gap: 16, radius: 24, radiusSm: 14, ui: 16 },
};

export const fontFamily = {
  display: 'Inter_600SemiBold',
  displayBold: 'Inter_700Bold',
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiSemibold: 'Inter_600SemiBold',
  mono: 'Inter_500Medium', // Inter has tabular figures; RN has no font-feature-settings, so numerals just use medium weight
};

export type Palette = typeof palette.light;
