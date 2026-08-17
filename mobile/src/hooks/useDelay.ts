import { useEffect, useState } from 'react';

// Ported from project/app/skeletons.jsx. Returns false for `ms`, then true — every
// screen uses this to fake a fetch until a real data layer replaces it (see
// docs/LOADING-STATES.md). Pass `dep` (a key that changes when the query changes)
// to replay the loading state, e.g. useDelay(latency.list, view + '|' + filters).
export function useDelay(ms: number, dep: unknown) {
  const [done, setDone] = useState(!ms);
  useEffect(() => {
    if (!ms) {
      setDone(true);
      return;
    }
    setDone(false);
    const t = setTimeout(() => setDone(true), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, dep]);
  return done;
}
