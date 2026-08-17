// STUB — to be ported from project/app/screens-extra.jsx (`Onboarding`).
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ color: colors.ink, fontSize: 18 }}>Onboarding — placeholder</Text>
      <Text onPress={onDone} style={{ color: colors.primary, fontSize: 16 }}>
        Continuar
      </Text>
    </View>
  );
}
