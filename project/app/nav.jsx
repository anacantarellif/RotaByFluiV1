// nav.jsx — turn-by-turn navigation screen. Exports: NavScreen
const React = window.React;
const { useState, useRef, useEffect, useMemo } = React;
const { Icon, Seal, MapStatic, MAP_W, MAP_H } = window;

/* ---------- geometry helpers ---------- */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const dist2 = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

// Build a street-like polyline (a few doglegs) from start to end, deterministic per seed.
function buildRoute(start, end, seed) {
  const r = rng(seed);
  const dx = end.x - start.x, dy = end.y - start.y;
  const j = () => (r() - 0.5) * 26;
  const pts = [
    { x: start.x, y: start.y },
    { x: start.x + dx * (0.30 + r() * 0.12) + j(), y: start.y + dy * 0.10 + j() },
    { x: start.x + dx * (0.46 + r() * 0.10) + j(), y: start.y + dy * (0.55 + r() * 0.10) + j() },
    { x: start.x + dx * (0.82 + r() * 0.08) + j(), y: start.y + dy * (0.84 + r() * 0.06) + j() },
    { x: end.x, y: end.y },
  ];
  return pts;
}

function cumLengths(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + dist2(pts[i - 1], pts[i]);
  return cum;
}

// position + heading at a given travelled distance d
function locateAt(pts, cum, d) {
  const total = cum[cum.length - 1];
  d = Math.max(0, Math.min(total, d));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const segStart = pts[i - 1], segEnd = pts[i];
  const segLen = cum[i] - cum[i - 1] || 1;
  const f = (d - cum[i - 1]) / segLen;
  const x = segStart.x + (segEnd.x - segStart.x) * f;
  const y = segStart.y + (segEnd.y - segStart.y) * f;
  const vx = segEnd.x - segStart.x, vy = segEnd.y - segStart.y;
  const heading = Math.atan2(vx, -vy) * 180 / Math.PI; // 0 = up, 90 = right
  return { x, y, heading, seg: i };
}

// turn type at interior vertex i (1..n-2): 'left' | 'right' | 'straight'
function turnAt(pts, i) {
  const a = pts[i - 1], b = pts[i], c = pts[i + 1];
  const v1x = b.x - a.x, v1y = b.y - a.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const cross = v1x * v2y - v1y * v2x;       // y-down screen: >0 = right
  const dot = v1x * v2x + v1y * v2y;
  const ang = Math.abs(Math.atan2(cross, dot)) * 180 / Math.PI;
  if (ang < 18) return 'straight';
  return cross > 0 ? 'right' : 'left';
}

const STREETS = ['Av. Paulista', 'R. da Consolação', 'Av. Rebouças', 'R. Augusta', 'Av. Faria Lima',
  'R. Teodoro Sampaio', 'Av. Pacaembu', 'R. Cardeal Arcoverde', 'Av. Sumaré', 'R. Oscar Freire',
  'Av. Nove de Julho', 'R. Haddock Lobo', 'Av. Brasil'];

const TURN_PATH = {
  straight: 'M12 21V6M12 6l-5 5M12 6l5 5',
  left: 'M17 21v-6a5 5 0 0 0-5-5H7M7 10l4-4M7 10l4 4',
  right: 'M7 21v-6a5 5 0 0 1 5-5h5M17 10l-4-4M17 10l-4 4',
};
function TurnArrow({ type, size = 34, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={TURN_PATH[type] || TURN_PATH.straight} />
    </svg>
  );
}

const TURN_LABEL = { left: 'Vire à esquerda', right: 'Vire à direita', straight: 'Siga em frente' };

function fmtMeters(m) {
  if (m >= 1000) return (m / 1000).toFixed(1).replace('.', ',') + ' km';
  return Math.max(10, Math.round(m / 10) * 10) + ' m';
}
function addClock(base, mins) {
  const [h, m] = base.split(':').map(Number);
  let t = h * 60 + m + Math.round(mins);
  t %= 1440;
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}

/* ---------- screen ---------- */
function NavScreen({ dest, onExit, onArrive, pushToast, startBattery = 62 }) {
  const D = window.DATA;
  const start = D.user_xy;
  const seed = (dest.id || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 7);

  const pts = useMemo(() => buildRoute(start, dest, seed), [dest.id]);
  const cum = useMemo(() => cumLengths(pts), [pts]);
  const totalUnits = cum[cum.length - 1];

  // headline distance/time from the station's own label, so it matches the rest of the app
  const km = parseFloat(String(dest.dist || '2,0').replace(',', '.')) || 2;
  const totalMeters = km * 1000;
  const totalMin = Math.max(2, Math.round(km / 22 * 60));
  const arriveBattery = Math.max(8, startBattery - Math.round(km * 1.6));

  // maneuvers: interior vertices + arrival
  const maneuvers = useMemo(() => {
    const r = rng(seed + 3);
    const list = [];
    for (let i = 1; i < pts.length - 1; i++) {
      list.push({ at: cum[i], type: turnAt(pts, i), street: STREETS[Math.floor(r() * STREETS.length)] });
    }
    list.push({ at: cum[cum.length - 1], type: 'arrive', street: dest.name });
    return list;
  }, [pts]);

  const departStreet = useMemo(() => STREETS[Math.floor(rng(seed + 1)() * STREETS.length)], [pts]);

  const [d, setD] = useState(0);              // travelled distance in map units
  const [arrived, setArrived] = useState(false);
  const [rating, setRating] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [follow, setFollow] = useState(true);
  const raf = useRef(0);
  const mapRef = useRef(null);
  const [size, setSize] = useState({ w: 392, h: 620 });

  useEffect(() => {
    if (mapRef.current) {
      const r = mapRef.current.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    }
  }, []);

  // animate along the route
  useEffect(() => {
    if (arrived) return;
    const durMs = Math.min(30000, Math.max(13000, totalUnits * 70));
    const t0 = Date.now();
    raf.current = setInterval(() => {
      const f = (Date.now() - t0) / durMs;
      setD(Math.min(totalUnits, f * totalUnits));
      if (f >= 1) { clearInterval(raf.current); setArrived(true); }
    }, 80);
    return () => clearInterval(raf.current);
  }, [totalUnits, arrived]);

  const here = locateAt(pts, cum, d);
  const fracDone = totalUnits ? d / totalUnits : 0;

  // next maneuver = first whose distance-along is ahead of us
  const nextIdx = Math.max(0, maneuvers.findIndex(m => m.at > d + 0.5));
  const nextMan = maneuvers[nextIdx === -1 ? maneuvers.length - 1 : nextIdx] || maneuvers[maneuvers.length - 1];
  const afterMan = maneuvers[(nextIdx === -1 ? maneuvers.length - 1 : nextIdx) + 1];
  const metersToNext = Math.round((nextMan.at - d) / totalUnits * totalMeters);
  const remainMin = Math.max(0, Math.round((1 - fracDone) * totalMin));
  const remainMeters = Math.round((1 - fracDone) * totalMeters);

  // camera: keep the car at ~68% down, north-up
  const offX = follow ? size.w / 2 - here.x : size.w / 2 - (start.x + dest.x) / 2;
  const offY = follow ? size.h * 0.66 - here.y : size.h / 2 - (start.y + dest.y) / 2;

  const staticMap = useMemo(() => <MapStatic />, []);
  const routePath = useMemo(() => 'M' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L '), [pts]);

  const isFirst = nextMan.type !== 'arrive' && metersToNext > totalMeters * 0.55;
  const showArrive = arrived || nextMan.type === 'arrive';

  return (
    <div className="nav-screen" role="region" aria-label={`Navegação até ${dest.name}`}>
      <div className="nav-mapwrap" ref={mapRef}>
        <div className="nav-canvas" style={{ width: MAP_W, height: MAP_H, transform: `translate(${offX}px, ${offY}px)` }}>
          {staticMap}
          <svg className="nav-route" width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
            <path d={routePath} className="route-casing" />
            <path d={routePath} className="route-line" />
            <path d={routePath} className="route-done" style={{ strokeDasharray: `${d} ${totalUnits}` }} />
          </svg>

          {/* destination flag */}
          <div className="nav-dest" style={{ left: dest.x, top: dest.y }}>
            <div className="flag">
              {dest.selo > 0 ? <span className="seal" style={{ color: 'var(--gold)' }}><Seal size={18} /></span> : <Icon name="flag" size={17} color="#fff" />}
            </div>
            <div className="stem" />
          </div>

          {/* moving car / heading */}
          <div className="nav-car" style={{ left: here.x, top: here.y, transform: `translate(-50%,-50%) rotate(${here.heading}deg)` }}>
            <div className="beam" />
            <div className="dot" />
          </div>
        </div>
      </div>

      {/* top maneuver banner */}
      {!rating && <div className="nav-top" aria-live="polite" aria-atomic="true">
        <div className="nav-maneuver">
          <div className="arrow">
            {showArrive
              ? <Icon name="flag" size={32} color="#fff" />
              : <TurnArrow type={nextMan.type} size={36} />}
          </div>
          <div className="mtext">
            <div className="dist">{showArrive ? 'Chegou' : fmtMeters(metersToNext)}</div>
            <div className="instr">
              {showArrive
                ? <span className="street">{dest.name}</span>
                : isFirst
                  ? <>Siga por <span className="street">{departStreet}</span></>
                  : <>{TURN_LABEL[nextMan.type]} · <span className="street">{nextMan.street}</span></>}
            </div>
          </div>
        </div>
        {afterMan && !showArrive && (
          <div className="nav-then">
            <span className="lbl">Depois</span>
            {afterMan.type === 'arrive' ? <Icon name="flag" size={15} color="var(--ink-soft)" /> : <TurnArrow type={afterMan.type} size={17} color="var(--ink-soft)" />}
            <span className="st">{afterMan.type === 'arrive' ? dest.name : afterMan.street}</span>
          </div>
        )}
      </div>}

      {/* re-center */}
      {!arrived && (
        <button className="nav-recenter" onClick={() => setFollow(f => !f)} aria-label={follow ? 'Desativar seguir automático' : 'Voltar a seguir minha posição'} aria-pressed={follow}>
          <Icon name="crosshair" size={20} color={follow ? 'var(--primary)' : 'var(--ink-soft)'} />
        </button>
      )}

      {/* bottom panel */}
      {!arrived && !rating ? (
        <div className="nav-panel">
          <div className="nav-eta">
            <div className="big"><b>{remainMin}</b> min</div>
            <div className="sub">{fmtMeters(remainMeters)} · chega {addClock('9:30', remainMin)}</div>
          </div>
          <div className="nav-battery"><Icon name="battery" size={16} color="var(--ok)" /> {arriveBattery}%</div>
          <button className="nav-end" onClick={onExit} aria-label="Encerrar navegação"><Icon name="x" size={22} color="#fff" /></button>
        </div>
      ) : rating ? null : (
        <div className="nav-arrive page-enter">
          <div className="badge"><Icon name="checkCircle" size={30} color="#fff" /></div>
          <div className="t-eyebrow" style={{ color: 'var(--ok)' }}>Você chegou</div>
          <h2 className="t-display" style={{ fontSize: 24, margin: '2px 0 2px' }}>{dest.name}</h2>
          <p className="t-soft" style={{ fontSize: 13.5, margin: '0 0 16px' }}>{dest.area ? dest.area + ' · ' : ''}{dest.free != null ? `${dest.free}/${dest.total} pontos livres agora` : 'Boa recarga!'}</p>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => onArrive && onArrive(dest)}><Icon name="zap" size={18} /> Iniciar recarga</button>
          <button className="btn btn-outline btn-block" style={{ marginTop: 10 }} onClick={() => setRating(true)}>
            <Icon name="star" size={17} /> Avaliar este ponto
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={onExit}>Concluir</button>
        </div>
      )}
      {rating && (
        <window.RateFlow target={dest} kind="station" pushToast={pushToast}
          onClose={() => setRating(false)}
          onDone={(r) => { setRating(false); pushToast(`Avaliação publicada · +${r.watts} Watts`, 'check'); onExit(); }} />
      )}
    </div>
  );
}

window.NavScreen = NavScreen;
