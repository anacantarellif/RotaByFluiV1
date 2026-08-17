// STUB — to be ported from project/app/screens-map.jsx (`MapScreen`, `FilterSheet`).
// Use useNavigation() to push 'Nav' with { station } — see PORTING_GUIDE.md.
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function MapScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.ink }}>Mapa — placeholder</Text>
    </View>
  );
}
