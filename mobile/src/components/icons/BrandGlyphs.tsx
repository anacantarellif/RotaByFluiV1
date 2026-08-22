// Official app-mark glyphs for external nav-app handoff UI. Shared by
// MapsHandoff.tsx and LocationNotice.tsx. Fixed brand-identity colors (Google's
// four-color mark) are official marks, not themeable UI — literal hex here is
// intentional, same as the source (project/app/maps.jsx), which also hardcodes
// these instead of reading CSS vars.
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { Image } from 'expo-image';

export function GoogleGlyph({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#34A853" />
      <Path d="M12 2C8.13 2 5 5.13 5 9c0 1.53.6 3.16 1.5 4.75L12 6h7c-1.1-2.35-3.72-4-7-4z" fill="#4285F4" />
      <Path d="M5 9c0 1.53.6 3.16 1.5 4.75L12 6H5.6C5.22 6.9 5 7.92 5 9z" fill="#FBBC04" />
      <Path d="M12 6l5.5 7.75C18.4 12.16 19 10.53 19 9c0-1.08-.22-2.1-.6-3H12z" fill="#EA4335" />
      <Circle cx={12} cy={9} r={2.6} fill="#fff" />
    </Svg>
  );
}

// The real Waze app icon (rounded-square mark, its own cyan background baked
// in) — was a hand-drawn SVG approximation of the "ghost" face before;
// swapped for the actual icon artwork (assets/icons/waze.jpg). The source
// file is a plain square JPG (no transparency) with the rounded-square shape
// already drawn on a white canvas, so a borderRadius on the Image itself
// clips that white margin away instead of showing a white-cornered square.
export function WazeGlyph({ size = 26 }: { size?: number }) {
  return (
    <Image
      source={require('../../../assets/icons/waze.jpg')}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Waze"
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      contentFit="cover"
    />
  );
}
