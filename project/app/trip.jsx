// trip.jsx — guided itinerary drive flow (roteiro em viagem). Exports: TripScreen
const React = window.React;
const { useState, useRef, useEffect, useMemo } = React;
const { Icon, Seal, MapStatic, MAP_W, MAP_H } = window;

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
const HIGHWAYS = ['Rod. Ayrton Senna', 'Rod. Carvalho Pinto', 'Rod. dos Tamoios', 'Rod. Castello Branco', 'Rod. Anhanguera', 'Av. dos Estados', 'SP-123', 'Rod. Fernão Dias'];

const CONSUMPTION = 0.34;   // % de bateria por km
const LEG_MS = 6800;        // duração da animação de cada trecho

function fmtKm(km) {
  if (km < 1) return Math.max(50, Math.round(km * 1000 / 50) * 50) + ' m';
  return (km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)) + ' km';
}
function addClock(base, mins) {
  const [h, m] = base.split(':').map(Number);
  let t = (h * 60 + m + Math.round(mins)) % 1440;
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}

function buildGeo(g) {
  const seed = [...g.id].reduce((a, c) => a + c.charCodeAt(0), 11);
  const r = rng(seed);
  const n = g.stops.length;
  const A = { x: 500, y: 830 }, B = { x: 815, y: 140 };
  const stopPts = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    stopPts.push({ x: A.x + (B.x - A.x) * t + (r() - 0.5) * 110, y: A.y + (B.y - A.y) * t + (r() - 0.5) * 60 });
  }
  const legs = stopPts.slice(0, -1).map((p, i) => {
    const q = stopPts[i + 1];
    return [p,
      { x: p.x + (q.x - p.x) * 0.32 + (r() - 0.5) * 44, y: p.y + (q.y - p.y) * 0.18 + (r() - 0.5) * 30 },
      { x: (p.x + q.x) / 2 + (r() - 0.5) * 54, y: (p.y + q.y) / 2 + (r() - 0.5) * 40 },
      { x: p.x + (q.x - p.x) * 0.80 + (r() - 0.5) * 34, y: p.y + (q.y - p.y) * 0.86 + (r() - 0.5) * 26 },
      q];
  });
  const lens = legs.map(pts => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  const km = lens.map(l => Math.max(3, Math.round(g.distance * l / total)));
  const road = legs.map(() => HIGHWAYS[Math.floor(r() * HIGHWAYS.length)]);
  return { stopPts, legs, km, road };
}

function along(pts, f) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const total = cum[cum.length - 1] || 1;
  const d = Math.max(0, Math.min(total, f * total));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const a = pts[i - 1], b = pts[i], seg = (cum[i] - cum[i - 1]) || 1, t = (d - cum[i - 1]) / seg;
  return {
    x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
    heading: Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI,
    vertex: i, cum, total, d,
  };
}
function turnAt(pts, i) {
  if (i < 1 || i > pts.length - 2) return 'straight';
  const a = pts[i - 1], b = pts[i], c = pts[i + 1];
  const v1x = b.x - a.x, v1y = b.y - a.y, v2x = c.x - b.x, v2y = c.y - b.y;
  const cross = v1x * v2y - v1y * v2x, dot = v1x * v2x + v1y * v2y;
  const ang = Math.abs(Math.atan2(cross, dot)) * 180 / Math.PI;
  if (ang < 16) return 'straight';
  return cross > 0 ? 'right' : 'left';
}

/* ---------- sheets ---------- */
function StopSheet({ g, idx, battery, onGo, onStay }) {
  const s = g.stops[idx];
  const last = idx === g.stops.length - 1;
  return (
    <React.Fragment>
      <div className="sheet-scrim" />
      <div className="sheet" style={{ paddingBottom: 18 }} role="dialog" aria-modal="true" aria-label={`Parada: ${s.name}`}>
        <div className="grab" />
        <div style={{ padding: '6px 18px 0' }}>
          <div className="kv">
            <div className="t-eyebrow">Parada {idx + 1} de {g.stops.length}</div>
            <span className="tag"><Icon name="battery" size={12} color="var(--ok)" style={{ verticalAlign: '-2px', marginRight: 4 }} />{battery}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 12px' }}>
            <span className="trip-ring"><Icon name={s.icon || 'flag'} size={30} color="var(--primary)" /></span>
          </div>
          <h3 className="t-display" style={{ fontSize: 24, margin: 0, textAlign: 'center' }}>{s.name}</h3>
          <p className="t-soft" style={{ fontSize: 13.5, margin: '4px 0 0', textAlign: 'center' }}>{s.sub}</p>
          {s.todo && (
            <div className="trip-note">
              <Icon name="info" size={17} color="var(--ink-faint)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.45 }}>{s.todo}</div>
            </div>
          )}
          {s.dur && <div className="t-faint" style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 600, marginTop: 10 }}>Tempo sugerido pelo Guia · {s.dur}</div>}
          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 16 }} onClick={onGo}>
            {last ? <React.Fragment><Icon name="checkCircle" size={18} /> Encerrar roteiro</React.Fragment>
              : <React.Fragment><Icon name="nav" size={18} /> Seguir para a próxima parada</React.Fragment>}
          </button>
          {!last && <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={onStay}>Ficar mais um pouco</button>}
        </div>
      </div>
    </React.Fragment>
  );
}

function ChargeSheet({ g, idx, from, onGo }) {
  const s = g.stops[idx];
  const target = 85;
  const [pct, setPct] = useState(from);
  useEffect(() => {
    const id = setInterval(() => setPct(p => (p >= target ? (clearInterval(id), target) : p + 1)), 90);
    return () => clearInterval(id);
  }, []);
  const full = pct >= target;
  return (
    <React.Fragment>
      <div className="sheet-scrim" />
      <div className="sheet" style={{ paddingBottom: 18 }}>
        <div className="grab" />
        <div style={{ padding: '6px 18px 0' }}>
          <div className="kv">
            <div className="t-eyebrow" style={{ color: 'var(--primary)' }}>Parada de recarga · {idx + 1} de {g.stops.length}</div>
            {s.selo > 0 && <span className="seal" style={{ width: 16, height: 16, color: 'var(--gold)' }}><Seal size={16} /></span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 10px' }}>
            <span className="trip-ring charging"><Icon name="zap" size={30} color="var(--primary)" /></span>
          </div>
          <h3 className="t-display" style={{ fontSize: 23, margin: 0, textAlign: 'center' }}>{s.name}</h3>
          <p className="t-soft" style={{ fontSize: 13, margin: '4px 0 14px', textAlign: 'center' }}>{s.power ? s.power + ' kW · ' : ''}{full ? 'Pronto para seguir' : 'Recarregando agora'}</p>

          <div className="trip-batt" role="progressbar" aria-valuenow={pct} aria-valuemin={from} aria-valuemax={target} aria-label="Progresso da recarga"><div className="fill" style={{ width: pct + '%' }} /></div>
          <div className="kv" style={{ marginTop: 7 }}>
            <span className="t-faint" style={{ fontSize: 12, fontWeight: 600 }}>{from}% na chegada</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 17, color: full ? 'var(--ok)' : 'var(--primary)' }}>{pct}%</span>
          </div>

          {s.todo && (
            <div className="trip-note charge">
              <Icon name={s.icon || 'coffee'} size={17} color="var(--primary-soft-ink)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.45, color: 'var(--primary-soft-ink)', fontWeight: 600 }}>{s.todo}</div>
              {s.dur && <span className="tag" style={{ background: 'var(--surface)', flexShrink: 0 }}>{s.dur}</span>}
            </div>
          )}

          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 16, opacity: full ? 1 : 0.55 }} disabled={!full} onClick={() => onGo(target)}>
            <Icon name="nav" size={18} /> {full ? 'Retomar viagem' : 'Aguardando recarga…'}
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

function DoneSheet({ g, battery, watts, onExit, onRate, onOpenMaps, pushToast }) {
  const charges = g.stops.filter(s => s.kind === 'charge').length;
  return (
    <React.Fragment>
      <div className="sheet-scrim" />
      <div className="sheet" style={{ paddingBottom: 20 }}>
        <div className="grab" />
        <div style={{ padding: '6px 18px 0', textAlign: 'center' }}>
          <div className="trip-ring done" style={{ margin: '6px auto 12px' }}><Icon name="checkCircle" size={32} color="#fff" /></div>
          <div className="t-eyebrow" style={{ color: 'var(--ok)' }}>Roteiro concluído</div>
          <h3 className="t-display" style={{ fontSize: 25, margin: '3px 0 4px' }}>{g.title}</h3>
          <p className="t-soft" style={{ fontSize: 13.5, margin: '0 0 16px' }}>{g.region}</p>
          <div className="card" style={{ padding: '14px 8px', display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: 16 }}>
            {[[g.distance + ' km', 'rodados'], [charges || '0', charges === 1 ? 'recarga' : 'recargas'], [battery + '%', 'bateria'], ['+' + watts, 'Watts']].map(([v, l], i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ width: 1, background: 'var(--line)' }} />}
                <div style={{ flex: 1 }}>
                  <div className="stat-num" style={{ fontSize: 18, color: l === 'Watts' ? 'var(--primary)' : 'var(--ink)' }}>{v}</div>
                  <div className="t-faint" style={{ fontSize: 10.5, marginTop: 2 }}>{l}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
          <button className="btn btn-primary btn-block btn-lg" onClick={onRate}>
            <Icon name="star" size={18} /> Avaliar este roteiro
          </button>
          <button className="btn btn-outline btn-block" style={{ marginTop: 9 }} onClick={onOpenMaps}>
            <Icon name="nav" size={17} /> Refazer no Google Maps ou Waze
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={onExit}>Voltar ao roteiro</button>
        </div>
      </div>
    </React.Fragment>
  );
}

/* ---------- screen ---------- */
function TripScreen({ guide, onExit, pushToast }) {
  const g = guide;
  const n = g.stops.length;
  const geo = useMemo(() => buildGeo(g), [g.id]);
  const [leg, setLeg] = useState(0);
  const [f, setF] = useState(0);
  const [phase, setPhase] = useState('driving');   // driving | stop | charge | done
  const [at, setAt] = useState(0);
  const [battery, setBattery] = useState(92);
  const [watts, setWatts] = useState(0);
  const [follow, setFollow] = useState(true);
  const [rating, setRating] = useState(false);
  const [mapsOut, setMapsOut] = useState(false);
  const [size, setSize] = useState({ w: 392, h: 620 });
  const wrap = useRef(null);
  const raf = useRef(0);

  useEffect(() => {
    if (wrap.current) { const r = wrap.current.getBoundingClientRect(); setSize({ w: r.width, h: r.height }); }
  }, []);

  useEffect(() => {
    if (phase !== 'driving') return;
    const t0 = Date.now();
    raf.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / LEG_MS);
      setF(p);
      if (p >= 1) {
        clearInterval(raf.current);
        const next = leg + 1;
        const km = geo.km[leg];
        setBattery(b => Math.max(6, Math.round(b - km * CONSUMPTION)));
        setWatts(w => w + 40);
        setAt(next);
        setPhase(next === n - 1 ? 'done' : (g.stops[next].kind === 'charge' ? 'charge' : 'stop'));
      }
    }, 80);
    return () => clearInterval(raf.current);
  }, [phase, leg]);

  const driving = phase === 'driving';
  const legPts = geo.legs[Math.min(leg, geo.legs.length - 1)];
  const here = driving ? along(legPts, f) : { ...geo.stopPts[at], heading: 0 };
  const legKm = geo.km[Math.min(leg, geo.km.length - 1)];
  const remainKm = legKm * (1 - (driving ? f : 1));
  const remainMin = Math.max(1, Math.round(remainKm / 68 * 60));
  const nextStop = g.stops[Math.min(leg + 1, n - 1)];
  const afterStop = g.stops[leg + 2];

  // maneuver ahead on this leg
  const pos = driving ? along(legPts, f) : null;
  let manType = 'straight', manKm = remainKm, manLabel = geo.road[Math.min(leg, geo.road.length - 1)];
  if (pos) {
    const vi = Math.min(pos.vertex, legPts.length - 2);
    const dToVertex = Math.max(0, pos.cum[vi] - pos.d);
    manType = turnAt(legPts, vi);
    manKm = legKm * (dToVertex / pos.total);
    if (manKm < 0.25 || vi >= legPts.length - 2) { manType = 'arrive'; manKm = remainKm; }
  }

  const offX = follow ? size.w / 2 - here.x : size.w / 2 - 500;
  const offY = follow ? size.h * 0.64 - here.y : size.h / 2 - 480;
  const staticMap = useMemo(() => <MapStatic />, []);

  const fullPath = useMemo(() => geo.legs.map(pts => 'M' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')).join(' '), [geo]);
  const donePath = useMemo(() => {
    const done = geo.legs.slice(0, leg).map(pts => 'M' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L '));
    if (driving && f > 0) {
      const cur = along(legPts, f);
      const upto = legPts.slice(0, cur.vertex).concat([{ x: cur.x, y: cur.y }]);
      done.push('M' + upto.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L '));
    } else if (!driving) {
      done.push('M' + legPts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L '));
    }
    return done.join(' ');
  }, [leg, f, driving, geo]);

  const goNext = () => {
    if (at >= n - 1) { setPhase('done'); return; }
    setLeg(at); setF(0); setPhase('driving');
  };

  return (
    <div className="nav-screen" data-screen-label="Roteiro em viagem">
      <div className="nav-mapwrap" ref={wrap}>
        <div className="nav-canvas" style={{ width: MAP_W, height: MAP_H, transform: `translate(${offX}px, ${offY}px)` }}>
          {staticMap}
          <svg className="nav-route" width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
            <path d={fullPath} className="route-casing" />
            <path d={fullPath} className="route-line" />
            <path d={donePath} className="route-done" />
          </svg>

          {geo.stopPts.map((p, i) => {
            const s = g.stops[i];
            const last = i === n - 1;
            const passed = i <= at;
            if (last) return (
              <div key={i} className="trip-dest" style={{ left: p.x, top: p.y }}>
                <span className="seal" style={{ color: 'var(--gold)' }}><Seal size={17} /></span>
                <div className="flagpin"><Icon name="flag" size={15} color="var(--gold-ink)" /></div>
              </div>
            );
            return (
              <div key={i} className={`trip-stop ${s.kind === 'charge' ? 'charge' : ''} ${passed ? 'passed' : ''}`} style={{ left: p.x, top: p.y }}>
                <Icon name={s.kind === 'charge' ? 'zap' : (s.icon || 'target')} size={13} color={s.kind === 'charge' ? 'var(--primary)' : 'var(--ink-soft)'} />
              </div>
            );
          })}

          <div className="nav-car" style={{ left: here.x, top: here.y, transform: `translate(-50%,-50%) rotate(${here.heading}deg)` }}>
            <div className="beam" />
            <div className="dot" />
          </div>
        </div>
      </div>

      {/* top banner */}
      {!rating && !mapsOut && <div className="nav-top" aria-live="polite" aria-atomic="true">
        <div className="nav-maneuver">
          <div className="arrow">
            {!driving ? <Icon name="target" size={30} color="#fff" /> : manType === 'arrive' ? <Icon name="flag" size={30} color="#fff" /> : <TurnArrow type={manType} size={34} />}
          </div>
          <div className="mtext">
            <div className="dist">{driving ? fmtKm(manKm) : 'Parado'}</div>
            <div className="instr">
              {!driving ? <span className="street">{g.stops[at].name}</span>
                : manType === 'arrive' ? <>Chegando · <span className="street">{nextStop.name}</span></>
                  : <>{TURN_LABEL[manType]} · <span className="street">{manLabel}</span></>}
            </div>
          </div>
        </div>
        {driving && afterStop && (
          <div className="nav-then">
            <span className="lbl">Depois</span>
            <Icon name={afterStop.kind === 'charge' ? 'zap' : (afterStop.icon || 'target')} size={15} color={afterStop.kind === 'charge' ? 'var(--primary)' : 'var(--ink-soft)'} />
            <span className="st">{afterStop.name}</span>
          </div>
        )}
      </div>}

      {driving && (
        <button className="nav-recenter" style={{ bottom: 132 }} onClick={() => setFollow(v => !v)} aria-label={follow ? 'Desativar seguir automático' : 'Voltar a seguir minha posição'} aria-pressed={follow}>
          <Icon name="crosshair" size={20} color={follow ? 'var(--primary)' : 'var(--ink-soft)'} />
        </button>
      )}

      {/* floating trip card */}
      {driving && (
        <div className="trip-card">
          <div className="kv" style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="trip-min"><b>{remainMin}</b> min <span className="t-faint" style={{ fontSize: 13 }}>· {fmtKm(remainKm)}</span></div>
              <div className="trip-sub">chega {addClock('08:00', remainMin)} · {nextStop.name}</div>
            </div>
            <span className="trip-batt-chip"><Icon name="battery" size={14} color="var(--ok)" /> {battery}%</span>
            <button className="trip-x" onClick={onExit} aria-label="Encerrar roteiro"><Icon name="x" size={20} color="var(--ink-soft)" /></button>
          </div>
          <div className="trip-prog" role="img" aria-label={`Etapa ${leg + 1} de ${geo.legs.length}`}>
            {geo.legs.map((_, i) => <span key={i} className={i < leg ? 'on' : i === leg ? 'now' : ''} />)}
          </div>
        </div>
      )}

      {phase === 'stop' && <StopSheet g={g} idx={at} battery={battery} onGo={goNext} onStay={() => pushToast('Sem pressa — o Guia espera por você', 'check')} />}
      {phase === 'charge' && <ChargeSheet g={g} idx={at} from={battery} onGo={(pct) => { setBattery(pct); setWatts(w => w + 120); goNext(); }} />}
      {phase === 'done' && !rating && !mapsOut && <DoneSheet g={g} battery={battery} watts={watts + 200} onExit={onExit} onRate={() => setRating(true)} onOpenMaps={() => setMapsOut(true)} pushToast={pushToast} />}
      {mapsOut && <window.RouteHandoffSheet guide={g} onClose={() => setMapsOut(false)} pushToast={pushToast} />}
      {rating && (
        <window.RateFlow target={g} kind="guide" pushToast={pushToast}
          onClose={() => setRating(false)}
          onDone={(r) => { setRating(false); onExit(); pushToast(`Roteiro avaliado · +${r.watts} Watts`, 'check'); }} />
      )}
    </div>
  );
}

window.TripScreen = TripScreen;
