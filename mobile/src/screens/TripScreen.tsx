// STUB — to be ported from project/app/trip.jsx (`TripScreen`, executing a Guia Flui roteiro).
import React from 'react';
import { Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Trip'>;

export function TripScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { guide } = route.params;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.ink }}>Roteiro: {guide.title} — placeholder</Text>
      <Text onPress={() => navigation.goBack()} style={{ color: colors.primary, marginTop: 12 }}>
        Sair
      </Text>
    </View>
  );
}
