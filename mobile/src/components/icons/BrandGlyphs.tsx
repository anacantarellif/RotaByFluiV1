// Official app-mark glyphs for external nav-app handoff UI. Shared by
// MapsHandoff.tsx and LocationNotice.tsx. Fixed brand-identity colors (Google's
// four-color mark, Waze's cyan) are official marks, not themeable UI — literal hex
// here is intentional, same as the source (project/app/maps.jsx), which also
// hardcodes these instead of reading CSS vars.
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

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

export function WazeGlyph({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3c4.4 0 8 3.1 8 7 0 4.3-3.9 7.4-8.6 7.4-.9 0-1.7-.1-2.5-.3-.8.8-2 1.4-3.4 1.6.5-.8.8-1.7.9-2.6C4.6 14.8 4 12.9 4 10c0-3.9 3.6-7 8-7z"
        fill="#33CCFF"
      />
      <Circle cx={9.4} cy={9.6} r={1.1} fill="#fff" />
      <Circle cx={14.6} cy={9.6} r={1.1} fill="#fff" />
      <Path d="M9.2 13c.7.7 1.7 1.1 2.8 1.1s2.1-.4 2.8-1.1" stroke="#fff" strokeWidth={1.3} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
