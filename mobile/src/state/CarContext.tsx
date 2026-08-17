// The driver's selected car — new state, not in the web prototype (which only
// ever held the onboarding car pick in local component state and dropped it, and
// had a hardcoded `DATA.user.car` string everywhere else). Every route/trip/charge
// calculation in the app (src/utils/evCharging.ts) needs a real `Car` object to
// work from, so this is now persisted and shared app-wide.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DATA } from '../data/data';
import { Car } from '../data/types';

const STORAGE_KEY = 'rota_car_id_v1';

// Defaults to the car DATA.user.car names ("BYD Dolphin"), so the rest of the app
// (which still reads DATA.user.car as display text) stays consistent with the
// selected car out of the box.
const DEFAULT_CAR_ID = 'dolphin';

type CarContextValue = {
  car: Car;
  setCarId: (id: string) => void;
};

const CarContext = createContext<CarContextValue | null>(null);

export function CarProvider({ children }: { children: React.ReactNode }) {
  const [carId, setCarId] = useState(DEFAULT_CAR_ID);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && DATA.cars.some((c) => c.id === saved)) setCarId(saved);
    });
  }, []);

  const value = useMemo<CarContextValue>(() => {
    const car = DATA.cars.find((c) => c.id === carId) ?? DATA.cars[0];
    return {
      car,
      setCarId: (id: string) => {
        setCarId(id);
        AsyncStorage.setItem(STORAGE_KEY, id);
      },
    };
  }, [carId]);

  return <CarContext.Provider value={value}>{children}</CarContext.Provider>;
}

export function useCar() {
  const ctx = useContext(CarContext);
  if (!ctx) throw new Error('useCar must be used within CarProvider');
  return ctx;
}
