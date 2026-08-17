// Ported from project/app/app.jsx (`NAV`, `NavBar`) — bottom tab bar.
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon } from '../components/icons/Icon';
import { useTheme } from '../theme/ThemeContext';
import { MapScreen } from '../screens/MapScreen';
import { RouteScreen } from '../screens/RouteScreen';
import { CommunityScreen } from '../screens/CommunityScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_META: Record<keyof TabParamList, { icon: string; label: string }> = {
  Map: { icon: 'map', label: 'Mapa' },
  Route: { icon: 'route', label: 'Rota' },
  Community: { icon: 'users', label: 'Comunidade' },
  Profile: { icon: 'user', label: 'Perfil' },
};

export function TabNavigator() {
  const { colors, font } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: font.uiMedium, fontSize: 11 },
        tabBarLabel: TAB_META[route.name].label,
        tabBarAccessibilityLabel: TAB_META[route.name].label,
        tabBarIcon: ({ focused, size }) => (
          <Icon name={TAB_META[route.name].icon} size={size ?? 22} stroke={focused ? 2.4 : 2} color={focused ? colors.primary : colors.inkFaint} />
        ),
      })}
    >
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Route" component={RouteScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
