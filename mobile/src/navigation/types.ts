import { NavigatorScreenParams } from '@react-navigation/native';
import { Station, Guide } from '../data/types';

export type TabParamList = {
  Map: undefined;
  Route: undefined;
  Community: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Nav: { station: Station };
  Trip: { guide: Guide };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
