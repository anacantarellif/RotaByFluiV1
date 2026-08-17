// STUB — to be ported from project/app/nav.jsx (`NavScreen`, turn-by-turn navigation).
// Per docs/MAPS.md §5, draw the route as a react-native-maps <Polyline> over the real
// <GeoMapView> (synthetic waypoints), not the legacy illustrated map.
import React from 'react';
import { Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Nav'>;

export function NavScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { station } = route.params;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.ink }}>Navegação até {station.name} — placeholder</Text>
      <Text onPress={() => navigation.goBack()} style={{ color: colors.primary, marginTop: 12 }}>
        Encerrar
      </Text>
    </View>
  );
}
