// Real, persisted activity log backing the Profile screen's "Histórico"
// section — last stations visited, reviews published, and Watts/conquistas
// earned. Nothing in the app tracked timestamped events before this:
// WattsContext only ever kept a running total, MissionsContext only kept
// progress counts, ReviewsContext keyed reviews by station with no
// cross-station timeline, and nothing logged a station visit at all. This is
// purely additive — it doesn't replace any of those, it just also logs an
// entry alongside the existing action (a mission completing inside
// MissionsContext; addWatts/addReview and opening a station's full ficha at
// their call sites in MapScreen/ProfileScreen/RouteScreen).
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HistoryEntry } from '../data/types';

const STORAGE_KEY = 'rota_history_v1';
// Caps the persisted log so it can't grow forever on a long-lived install —
// the UI is a "recent activity" view, not a full audit trail.
const MAX_ENTRIES = 60;

type HistoryContextValue = {
  entries: HistoryEntry[];
  logVisit: (stationId: string, stationName: string) => void;
  logReview: (stationId: string, stationName: string, stars: number) => void;
  logWatts: (amount: number, reason: string) => void;
  logMission: (missionId: string, missionName: string, reward: number) => void;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

let seq = 0;
function nextId() {
  seq += 1;
  return `h${Date.now()}_${seq}`;
}

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setEntries(JSON.parse(raw));
        } catch {}
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hydrated]);

  const value = useMemo<HistoryContextValue>(
    () => ({
      entries,
      // Re-opening the same station's ficha to double check something
      // doesn't need its own new row every time — only the most recent
      // visit per station is kept, moved to the top, the way a real
      // "recently viewed" list behaves.
      logVisit: (stationId, stationName) =>
        setEntries((e) =>
          [
            { id: nextId(), at: Date.now(), kind: 'visit' as const, stationId, stationName },
            ...e.filter((x) => !(x.kind === 'visit' && x.stationId === stationId)),
          ].slice(0, MAX_ENTRIES)
        ),
      logReview: (stationId, stationName, stars) =>
        setEntries((e) =>
          [{ id: nextId(), at: Date.now(), kind: 'review' as const, stationId, stationName, stars }, ...e].slice(0, MAX_ENTRIES)
        ),
      logWatts: (amount, reason) =>
        setEntries((e) => [{ id: nextId(), at: Date.now(), kind: 'watts' as const, amount, reason }, ...e].slice(0, MAX_ENTRIES)),
      logMission: (missionId, missionName, reward) =>
        setEntries((e) =>
          [{ id: nextId(), at: Date.now(), kind: 'mission' as const, missionId, missionName, reward }, ...e].slice(0, MAX_ENTRIES)
        ),
    }),
    [entries]
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within HistoryProvider');
  return ctx;
}
