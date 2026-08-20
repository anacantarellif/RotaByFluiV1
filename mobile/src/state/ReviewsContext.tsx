// Real, persisted driver-submitted reviews, keyed by station id — DATA.stations'
// own `reviewsList` is curated seed content and stays read-only. A review
// published in RateFlow (including its photo, if the driver added one) lands
// here and is shown in that station's ficha for every user, same as a real
// review would be, instead of vanishing after the "Obrigado!" screen.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Review } from '../data/types';

const STORAGE_KEY = 'rota_reviews_v1';

type ReviewsState = Record<string, Review[]>;

type ReviewsContextValue = {
  getReviews: (stationId: string) => Review[];
  addReview: (stationId: string, review: Review) => void;
};

const ReviewsContext = createContext<ReviewsContextValue | null>(null);

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ReviewsState>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setState(JSON.parse(raw));
        } catch {}
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const value = useMemo<ReviewsContextValue>(
    () => ({
      getReviews: (stationId) => state[stationId] ?? [],
      addReview: (stationId, review) =>
        setState((s) => ({ ...s, [stationId]: [review, ...(s[stationId] ?? [])] })),
    }),
    [state]
  );

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
}

export function useReviews() {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error('useReviews must be used within ReviewsProvider');
  return ctx;
}
