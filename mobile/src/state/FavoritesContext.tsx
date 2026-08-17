// Ported from project/app/app.jsx: `favs` (Set<stationId>) + toggleFav, session-only
// (not persisted in the source — only onboarding uses localStorage there).
import React, { createContext, useContext, useMemo, useState } from 'react';

const FavoritesContext = createContext<{ favs: Set<string>; toggleFav: (id: string) => void } | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favs, setFavs] = useState<Set<string>>(() => new Set(['st1', 'st3', 'st7']));

  const value = useMemo(
    () => ({
      favs,
      toggleFav: (id: string) =>
        setFavs((s) => {
          const n = new Set(s);
          if (n.has(id)) n.delete(id);
          else n.add(id);
          return n;
        }),
    }),
    [favs]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
