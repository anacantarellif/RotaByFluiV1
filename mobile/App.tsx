import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer } from '@react-navigation/native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider } from './src/state/ToastContext';
import { FavoritesProvider } from './src/state/FavoritesContext';
import { CarProvider } from './src/state/CarContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function Themed({ children }: { children: React.ReactNode }) {
  const { mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {children}
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Themed>
            <ToastProvider>
              <FavoritesProvider>
                <CarProvider>
                  {/* BottomSheetModalProvider must be INSIDE every context provider that
                      sheet content reads (useTheme, useSafeAreaInsets, useToast, ...).
                      BottomSheetModal renders through this provider's own portal
                      container, which is a sibling of wherever <BottomSheetModalProvider>
                      itself sits in the tree — not of wherever a given ModalSheet is
                      *used* deep inside a screen. Having it above ThemeProvider (as in
                      an earlier version of this file) meant every sheet's content had no
                      ThemeProvider ancestor at all: `useTheme()` inside e.g.
                      MapPreviewFallback (src/components/handoff/MapsHandoff.tsx) threw
                      "useTheme must be used within ThemeProvider" the moment a sheet
                      mounted for the first time (reported: opening a route/roteiro). */}
                  <BottomSheetModalProvider>
                    <NavigationContainer>
                      <RootNavigator />
                    </NavigationContainer>
                  </BottomSheetModalProvider>
                </CarProvider>
              </FavoritesProvider>
            </ToastProvider>
          </Themed>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
