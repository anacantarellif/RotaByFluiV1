// Ported from project/app/screens-extra.jsx (`BrandMark`) — shared logo mark used
// by Onboarding (splash) and Profile (top bar). Source rendered a `<span>` row with
// the Seal glyph + "Rota" wordmark in the display font.
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Seal } from './icons/Icon';

export function BrandMark({ size = 28, color }: { size?: number; color?: string }) {
  const { colors, font } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {/* decorative — the "Rota" text alongside already gives the accessible name */}
      <Seal size={size} color={colors.primary} />
      <Text
        style={{
          fontFamily: font.display,
          fontSize: size,
          fontWeight: '600',
          letterSpacing: -0.2,
          color: color ?? colors.ink,
        }}
      >
        Rota
      </Text>
    </View>
  );
}
