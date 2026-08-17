// STUB — to be ported from project/app/screens-extra.jsx (`CommunityScreen`).
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function CommunityScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.ink }}>Comunidade — placeholder</Text>
    </View>
  );
}
