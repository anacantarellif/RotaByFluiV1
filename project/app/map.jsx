// map.jsx — stylized São Paulo map + markers. Exports: MapView
const React = window.React;
const { useState, useRef, useMemo, useEffect } = React;
const { Icon, Seal } = window;

const MAP_W = 1000, MAP_H = 1500;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// vertical river path (Pinheiros) and horizontal-ish (Tietê)
const RIVER_V = 'M300 -20 C 360 200, 250 360, 330 540 C 400 700, 280 900, 360 1120 C 410 1280, 330 1420, 380 1540';
const RIVER_H = 'M-20 320 C 220 270, 360 360, 560 320 C 780 280, 900 360, 1040 330';
const PARKS = [
  { cx: 545, cy: 945, rx: 95, ry: 70 },   // Ibirapuera
  { cx: 455, cy: 645, rx: 48, ry: 38 },    // praça
  { cx: 760, cy: 560, rx: 60, ry: 48 },
  { cx: 250, cy: 1080, rx: 55, ry: 70 },
];

function pointNearPath(x, y) {
  // cheap river proximity: sample river center x at given y
  const ry = y;
  const rv = 300 + 60 * Math.sin(ry / 240) + 30 * Math.sin(ry / 90);
  if (Math.abs(x - rv) < 34) return true;
  const rh = 320 + 30 * Math.sin(x / 260);
  if (Math.abs(y - rh) < 30) return true;
  return false;
}
function inPark(x, y) {
  return PARKS.some(p => ((x - p.cx) ** 2) / (p.rx ** 2) + ((y - p.cy) ** 2) / (p.ry ** 2) < 1.05);
}

function buildBlocks() {
  const rnd = mulberry32(7);
  const blocks = [];
  const step = 70;
  for (let gx = -20; gx < MAP_W + 20; gx += step) {
    for (let gy = -20; gy < MAP_H + 20; gy += step) {
      const jx = (rnd() - 0.5) * 10, jy = (rnd() - 0.5) * 10;
      const w = step - 14 + (rnd() - 0.5) * 12;
      const h = step - 14 + (rnd() - 0.5) * 12;
      const x = gx + 7 + jx, y = gy + 7 + jy;
      const cx = x + w / 2, cy = y + h / 2;
      if (pointNearPath(cx, cy) || inPark(cx, cy)) continue;
      // occasionally merge by widening
      blocks.push({ x, y, w: Math.max(20, w), h: Math.max(20, h), shade: rnd() });
    }
  }
  return blocks;
}

const AVENUES = [
  'M-20 470 C 250 430, 520 520, 760 470 C 900 440, 980 470, 1040 450',
  'M120 -20 C 180 300, 380 520, 520 760 C 640 960, 700 1200, 760 1540',
  'M1040 760 C 760 720, 560 800, 360 760 C 200 730, 80 770, -20 750',
  'M820 -20 C 760 280, 600 440, 520 760',
];

function MapStatic() {
  const blocks = useMemo(buildBlocks, []);
  return (
    <svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
      <rect x="-20" y="-20" width={MAP_W + 40} height={MAP_H + 40} fill="var(--map-road)" />
      {/* blocks */}
      <g>
        {blocks.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="5"
            fill={b.shade > 0.82 ? 'var(--map-land-2)' : 'var(--map-land)'} />
        ))}
      </g>
      {/* parks */}
      {PARKS.map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill="var(--map-park)" />
      ))}
      {/* major avenues */}
      <g fill="none" stroke="var(--map-road-major)" strokeLinecap="round">
        {AVENUES.map((d, i) => <path key={i} d={d} strokeWidth="11" />)}
      </g>
      <g fill="none" stroke="var(--map-road-line)" strokeLinecap="round" opacity="0.6">
        {AVENUES.map((d, i) => <path key={i} d={d} strokeWidth="13" strokeDasharray="0 26" />)}
      </g>
      {/* rivers */}
      <g fill="none" stroke="var(--map-water)" strokeLinecap="round">
        <path d={RIVER_V} strokeWidth="34" />
        <path d={RIVER_H} strokeWidth="30" />
      </g>
      {/* marginal roads alongside rivers */}
      <g fill="none" stroke="var(--map-road-major)" strokeLinecap="round" opacity="0.9">
        <path d={RIVER_V} strokeWidth="44" strokeOpacity="0.0" />
      </g>
    </svg>
  );
}

const AVAIL_TXT = { ok: 'disponível', busy: 'movimentado', off: 'indisponível' };
function Pin({ st, active, onClick }) {
  const label = `${st.name}, ${st.area}. ${st.power} kW, ${st.free} de ${st.total} pontos livres, ${AVAIL_TXT[st.avail]}` +
    (st.selo > 0 ? `, ${st.selo} ${st.selo === 1 ? 'selo' : 'selos'} Flui` : '') + `. ${st.dist}`;
  return (
    <button className={`pin ${st.avail} ${st.selo ? 'selo' : ''} ${active ? 'active' : ''}`}
      style={{ left: st.x, top: st.y }} onClick={() => onClick(st)}
      aria-label={label} aria-pressed={!!active}>
      {st.selo > 0 && (
        <div className="crown"><Seal size={16} /></div>
      )}
      <div className="body">
        <span className="glyph">{st.power}</span>
      </div>
    </button>
  );
}

function ReportMarker({ r, onClick }) {
  const inner = (
    <React.Fragment>
      <div className="bubble" style={{ color: r.color }}>
        <Icon name={r.icon} size={15} color={r.color} />
      </div>
      <div className="tail" style={{ borderTopColor: r.color }} />
    </React.Fragment>
  );
  if (!onClick) return <div className="report" style={{ left: r.x, top: r.y }}>{inner}</div>;
  return (
    <button className="report tappable" style={{ left: r.x, top: r.y }}
      aria-label={`Reporte da comunidade: ${r.label}, há ${r.when}. Toque para ver detalhes`}
      onClick={(e) => { e.stopPropagation(); onClick(r); }}>{inner}</button>
  );
}

function MapView({ active, onPin, onReport, showReports = true, recenterSignal = 0, stations }) {
  const D = window.DATA;
  const pins = stations || D.stations;
  const VW = 392, VH = 560;
  const center = () => ({ x: VW / 2 - D.user_xy.x, y: VH * 0.46 - D.user_xy.y });
  const [off, setOff] = useState(center);
  const drag = useRef(null);

  useEffect(() => { setOff(center()); }, [recenterSignal]);

  const onDown = (e) => {
    const p = e.touches ? e.touches[0] : e;
    drag.current = { sx: p.clientX, sy: p.clientY, ox: off.x, oy: off.y };
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const p = e.touches ? e.touches[0] : e;
    let nx = drag.current.ox + (p.clientX - drag.current.sx);
    let ny = drag.current.oy + (p.clientY - drag.current.sy);
    nx = Math.min(40, Math.max(VW - MAP_W - 40, nx));
    ny = Math.min(40, Math.max(VH - MAP_H - 40, ny));
    setOff({ x: nx, y: ny });
  };
  const onUp = () => { drag.current = null; };

  return (
    <div className="map-wrap"
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}>
      <div className="map-canvas" style={{ transform: `translate(${off.x}px, ${off.y}px)`, width: MAP_W, height: MAP_H }}>
        <MapStatic />
        {/* report markers */}
        {showReports && D.reports.map(r => <ReportMarker key={r.id} r={r} onClick={onReport} />)}
        {/* station pins */}
        {pins.map(st => (
          <Pin key={st.id} st={st} active={active === st.id} onClick={onPin} />
        ))}
        {/* user location */}
        <div className="userdot" style={{ left: D.user_xy.x, top: D.user_xy.y }}>
          <div className="pulse" />
          <div className="core" />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MapView, MapStatic, MAP_W, MAP_H });
