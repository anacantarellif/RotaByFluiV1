import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Map: undefined;
  Route: undefined;
  Community: undefined;
  Profile: undefined;
};

// No in-app turn-by-turn navigation (Nav/Trip stack screens) — per product
// decision, all navigation hands off to Google Maps/Waze with the real station
// or route coordinates instead of driving it inside the app. See
// MapsHandoffSheet/RouteHandoffSheet in src/components/handoff/MapsHandoff.tsx.
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
