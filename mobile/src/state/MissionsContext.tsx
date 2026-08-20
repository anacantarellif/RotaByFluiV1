// Real, persisted mission progress — the source (and DATA.missions) only ever
// had fixed mock `prog` numbers that never moved no matter what the driver
// actually did in the app. This tracks the same four missions against real
// actions:
//   m1 "Olho de águia"     — a photo actually added in RateFlow (see recordPhoto)
//   m2 "Crítico da semana" — a rating actually published (recordRating)
//   m3 "Vigia da rede"     — a community report actually filed (recordReport)
//   m4 "Desbravador"       — opening a station's ficha in a bairro not seen
//                            before (recordAreaVisit) — the closest real signal
//                            to "visited a new area" without real GPS (removed
//                            per product decision — see NavScreen's history).
// Progress starts from DATA.missions' own curated `prog`/`done` values (so the
// UI doesn't visually regress from what was already shown), then only moves
// forward from real actions. Reaching a mission's `total` awards its `reward`
// once via WattsContext, exactly like a real reward system instead of a toast
// that claimed one and changed nothing.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DATA } from '../data/data';
import { useWatts } from './WattsContext';

const STORAGE_KEY = 'rota_missions_v1';

type MissionsState = {
  counts: Record<string, number>;
  completed: string[]; // mission ids already awarded
  visitedAreas: string[];
};

function initialState(): MissionsState {
  const counts: Record<string, number> = {};
  const completed: string[] = [];
  for (const m of DATA.missions) {
    counts[m.id] = m.prog;
    if (m.done || m.prog >= m.total) completed.push(m.id);
  }
  return { counts, completed, visitedAreas: [] };
}

type MissionsContextValue = {
  counts: Record<string, number>;
  completed: string[];
  recordRating: () => void;
  recordPhoto: () => void;
  recordReport: () => void;
  recordAreaVisit: (area: string) => void;
};

const MissionsContext = createContext<MissionsContextValue | null>(null);

export function MissionsProvider({ children }: { children: React.ReactNode }) {
  const { addWatts } = useWatts();
  const [state, setState] = useState<MissionsState>(initialState);
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

  // Bumps one mission's count by 1, and if that completes it for the first
  // time, awards the reward — a single place all four "record*" actions
  // funnel through so the award-once logic only lives here.
  const bump = useCallback(
    (missionId: string) => {
      setState((s) => {
        const mission = DATA.missions.find((m) => m.id === missionId);
        if (!mission || s.completed.includes(missionId)) return s;
        const nextCount = Math.min(mission.total, (s.counts[missionId] ?? 0) + 1);
        const justCompleted = nextCount >= mission.total;
        if (justCompleted) addWatts(mission.reward);
        return {
          ...s,
          counts: { ...s.counts, [missionId]: nextCount },
          completed: justCompleted ? [...s.completed, missionId] : s.completed,
        };
      });
    },
    [addWatts]
  );

  const value = useMemo<MissionsContextValue>(
    () => ({
      counts: state.counts,
      completed: state.completed,
      recordRating: () => bump('m2'),
      recordPhoto: () => bump('m1'),
      recordReport: () => bump('m3'),
      recordAreaVisit: (area: string) => {
        if (state.visitedAreas.includes(area)) return;
        setState((s) => (s.visitedAreas.includes(area) ? s : { ...s, visitedAreas: [...s.visitedAreas, area] }));
        bump('m4');
      },
    }),
    [state.counts, state.completed, state.visitedAreas, bump]
  );

  return <MissionsContext.Provider value={value}>{children}</MissionsContext.Provider>;
}

export function useMissions() {
  const ctx = useContext(MissionsContext);
  if (!ctx) throw new Error('useMissions must be used within MissionsProvider');
  return ctx;
}
