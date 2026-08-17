// STUB — to be ported from project/app/screens-extra.jsx (`RouteScreen`, Guia Flui roteiros).
// Use useNavigation() to push 'Trip' with { guide } — see PORTING_GUIDE.md.
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function RouteScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.ink }}>Rota / Guia Flui — placeholder</Text>
    </View>
  );
}
