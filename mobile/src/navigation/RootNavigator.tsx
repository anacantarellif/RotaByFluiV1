// Ported from project/app/app.jsx (`App`) — onboarding gate + Tabs. The source's
// `nav`/`trip` App-level state (full-screen in-app turn-by-turn) isn't ported —
// per product decision, navigation always hands off to Google Maps/Waze with
// real coordinates instead (see MapsHandoffSheet/RouteHandoffSheet).
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '../screens/OnboardingScreen';
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
    </Stack.Navigator>
  );
}
