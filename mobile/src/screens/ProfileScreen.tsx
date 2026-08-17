// STUB — to be ported from project/app/screens-extra.jsx (`ProfileScreen`).
// Should also host the settings that were the web prototype's dev Tweaks panel
// (theme, density, marker style, community reports toggle) via useTheme() setters —
// see PORTING_GUIDE.md and docs/HANDOFF.md.
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function ProfileScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.ink }}>Perfil — placeholder</Text>
    </View>
  );
}
