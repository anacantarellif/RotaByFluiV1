// skeletons.jsx — loading states. Exports: Skeleton, MapSkeleton, ListSkeleton,
// StationSkeleton, Spinner, useDelay
//
// Every async surface in the app shows a shimmer placeholder shaped like the
// content that is about to arrive (never a bare spinner on a blank screen), so
// the layout does not jump when data lands. Durations come from
// ROTA_CONFIG.latency and all shimmer respects prefers-reduced-motion.

const React = window.React;
const { useState, useEffect } = React;

// Returns false for `ms`, then true — the hook every screen uses to fake fetch.
// Pass `dep` (a key that changes when the query changes) to replay the load:
//   const ready = useDelay(latency.list, view + '|' + filterSignature)
function useDelay(ms, dep) {
  const [done, setDone] = useState(!ms);
  useEffect(() => {
    if (!ms) { setDone(true); return; }
    setDone(false);
    const t = setTimeout(() => setDone(true), ms);
    return () => clearTimeout(t);
  }, [ms, dep]);
  return done;
}

function Skeleton({ w = '100%', h = 14, r = 8, style }) {
  return <div className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function Spinner({ size = 18, color = 'currentColor' }) {
  return <span className="spinner" style={{ width: size, height: size, borderColor: color, borderTopColor: 'transparent' }} role="status" aria-label="Carregando" />;
}

function MapSkeleton() {
  return (
    <div className="map-sk" role="status" aria-live="polite" aria-label="Carregando o mapa">
      <div className="map-sk-grid" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => <span key={'h' + i} className="ln h" style={{ top: `${12 + i * 19}%` }} />)}
        {Array.from({ length: 4 }).map((_, i) => <span key={'v' + i} className="ln v" style={{ left: `${14 + i * 24}%` }} />)}
        {[[28, 22], [64, 34], [42, 58], [72, 70], [22, 78]].map(([l, t], i) => (
          <span key={'p' + i} className="dot" style={{ left: l + '%', top: t + '%', animationDelay: i * 0.12 + 's' }} />
        ))}
      </div>
      <div className="map-sk-tag"><Spinner size={15} color="var(--primary)" /> Carregando pontos próximos…</div>
    </div>
  );
}

function ListSkeleton({ rows = 4 }) {
  return (
    <div role="status" aria-live="polite" aria-label="Carregando a lista de pontos">
      <Skeleton w="46%" h={12} style={{ marginBottom: 14 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 14, marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
          <Skeleton w={44} h={44} r={14} />
          <div style={{ flex: 1 }}>
            <Skeleton w={i % 2 ? '54%' : '68%'} h={15} style={{ marginBottom: 8 }} />
            <Skeleton w="38%" h={11} />
          </div>
          <Skeleton w={38} h={22} r={7} />
        </div>
      ))}
    </div>
  );
}

function StationSkeleton() {
  return (
    <div style={{ padding: '0 18px' }} role="status" aria-live="polite" aria-label="Carregando a ficha do ponto">
      <Skeleton h={170} r={20} style={{ marginBottom: 14 }} />
      <Skeleton w="62%" h={24} style={{ marginBottom: 9 }} />
      <Skeleton w="40%" h={13} style={{ marginBottom: 18 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[72, 88, 64].map((w, i) => <Skeleton key={i} w={w} h={30} r={100} />)}
      </div>
      <Skeleton h={13} style={{ marginBottom: 8 }} />
      <Skeleton h={13} style={{ marginBottom: 8 }} />
      <Skeleton w="72%" h={13} />
    </div>
  );
}

Object.assign(window, { Skeleton, MapSkeleton, ListSkeleton, StationSkeleton, Spinner, useDelay });
