// Ported from project/app/app.jsx (`App`) — onboarding gate + Tabs + full-screen
// Nav/Trip overlays (source's `nav`/`trip` App-level state).
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { NavScreen } from '../screens/NavScreen';
import { TripScreen } from '../screens/TripScreen';
import { TabNavigator } from './TabNavigator';
import { RootStackParamList } from './types';

const ONBOARDED_KEY = 'rota_onboarded';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY).then((v) => setOnboarded(v === '1'));
  }, []);

  if (onboarded === null) return null; // brief hydration flash, no visible flicker in practice

  if (!onboarded) {
    return (
      <OnboardingScreen
        onDone={() => {
          AsyncStorage.setItem(ONBOARDED_KEY, '1');
          setOnboarded(true);
        }}
      />
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="Nav" component={NavScreen} options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Trip" component={TripScreen} options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}
