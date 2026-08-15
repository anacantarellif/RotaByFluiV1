// maps.jsx — Google Maps handoff. Exports: MapsHandoffSheet, gmapsUrl
const React = window.React;
const { useState } = React;
const { Icon, Seal } = window;

// real São Paulo coordinates per station id (map x/y is the stylised canvas; these are the true ones)
const GEO = {
  st1: [-23.5416, -46.6614], st2: [-23.5747, -46.6893], st3: [-23.5874, -46.6576],
  st4: [-23.5729, -46.6969], st5: [-23.6106, -46.6947], st6: [-23.5614, -46.6559],
  st7: [-23.5545, -46.6890],
};
const DEFAULT_GEO = [-23.5613, -46.6565];

function coordsFor(dest) {
  if (dest && dest.lat != null && dest.lng != null) return [dest.lat, dest.lng];
  return GEO[dest && dest.id] || DEFAULT_GEO;
}

// Google Maps Directions deep link (universal, no API key needed)
function gmapsUrl(dest, mode = 'driving') {
  const [lat, lng] = coordsFor(dest);
  const q = new URLSearchParams({
    api: '1',
    destination: `${lat},${lng}`,
    travelmode: mode,
    dir_action: 'navigate',
  });
  if (dest && dest.name) q.set('destination_place_id', '');
  return `https://www.google.com/maps/dir/?${q.toString()}`.replace('&destination_place_id=', '');
}
function wazeUrl(dest) {
  const [lat, lng] = coordsFor(dest);
  return `https://waze.com/ul?ll=${lat}%2C${lng}&navigate=yes`;
}
// static preview of the destination inside Google Maps' own tiles (embed, keyless fallback shown if blocked)
function gmapsEmbed(dest) {
  const [lat, lng] = coordsFor(dest);
  return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
}

// real coordinates for the curated itineraries (in stop order)
const GUIDE_GEO = {
  g1: [[-23.5505, -46.6333], [-22.9583, -45.5497], [-23.0265, -45.5556], [-22.7397, -45.5911], [-22.7583, -45.5225]],
  g2: [[-23.5505, -46.6333], [-23.6247, -45.4128], [-23.3706, -44.8378], [-23.3897, -44.9236], [-23.4336, -45.0714]],
  g3: [[-23.5505, -46.6333], [-23.5289, -47.0847], [-23.5361, -47.1069], [-23.5505, -46.6333]],
  g4: [[-23.5505, -46.6333], [-23.7789, -46.3061], [-23.7822, -46.3003], [-23.7789, -46.3061]],
};

const APPS = [
  { id: 'gmaps', name: 'Google Maps', sub: 'Trânsito em tempo real', badge: 'Recomendado' },
  { id: 'rota', name: 'Navegar no Rota', sub: 'Com as paradas do guia' },
  { id: 'waze', name: 'Waze', sub: 'Alertas da comunidade' },
];

function GoogleGlyph({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#34A853" />
      <path d="M12 2C8.13 2 5 5.13 5 9c0 1.53.6 3.16 1.5 4.75L12 6h7c-1.1-2.35-3.72-4-7-4z" fill="#4285F4" />
      <path d="M5 9c0 1.53.6 3.16 1.5 4.75L12 6H5.6C5.22 6.9 5 7.92 5 9z" fill="#FBBC04" />
      <path d="M12 6l5.5 7.75C18.4 12.16 19 10.53 19 9c0-1.08-.22-2.1-.6-3H12z" fill="#EA4335" />
      <circle cx="12" cy="9" r="2.6" fill="#fff" />
    </svg>
  );
}
function WazeGlyph({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3c4.4 0 8 3.1 8 7 0 4.3-3.9 7.4-8.6 7.4-.9 0-1.7-.1-2.5-.3-.8.8-2 1.4-3.4 1.6.5-.8.8-1.7.9-2.6C4.6 14.8 4 12.9 4 10c0-3.9 3.6-7 8-7z" fill="#33CCFF" />
      <circle cx="9.4" cy="9.6" r="1.1" fill="#fff" />
      <circle cx="14.6" cy="9.6" r="1.1" fill="#fff" />
      <path d="M9.2 13c.7.7 1.7 1.1 2.8 1.1s2.1-.4 2.8-1.1" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function MapsHandoffSheet({ dest, onClose, onRotaNav, pushToast }) {
  const [pick, setPick] = useState('gmaps');
  const [remember, setRemember] = useState(false);
  const [lat, lng] = coordsFor(dest);

  const go = () => {
    if (pick === 'rota') { onClose(); onRotaNav(dest); return; }
    const url = pick === 'gmaps' ? gmapsUrl(dest) : wazeUrl(dest);
    window.open(url, '_blank', 'noopener');
    onClose();
    pushToast(pick === 'gmaps' ? 'Abrindo no Google Maps…' : 'Abrindo no Waze…', 'nav');
  };

  return (
    <React.Fragment>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet" style={{ paddingBottom: 18 }} role="dialog" aria-modal="true" aria-label={`Como navegar até ${dest.name}`}>
        <div className="grab" />
        <div style={{ padding: '4px 18px 0' }}>
          <div className="t-eyebrow">Navegar até</div>
          <div className="kv" style={{ marginTop: 2, marginBottom: 12 }}>
            <h3 className="t-display" style={{ fontSize: 22, margin: 0, minWidth: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dest.name}</h3>
            {dest.selo > 0 && <span className="seal" style={{ width: 16, height: 16, color: 'var(--gold)', flexShrink: 0 }}><Seal size={16} /></span>}
          </div>

          <div className="gmaps-preview">
            <iframe src={gmapsEmbed(dest)} title={`Mapa do Google com a localização de ${dest.name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            <div className="gmaps-fallback" aria-hidden="true">
              <GoogleGlyph size={22} /> <span>Prévia do Google Maps</span>
            </div>
          </div>
          <div className="t-faint gmaps-coords">
            <Icon name="target" size={12} /> {lat.toFixed(4)}, {lng.toFixed(4)}
            {dest.area ? ' · ' + dest.area : ''}
          </div>

          <div className="app-list" role="radiogroup" aria-label="Escolha o aplicativo de navegação">
            {APPS.map(a => {
              const on = pick === a.id;
              return (
                <button key={a.id} className={`app-row ${on ? 'on' : ''}`} role="radio" aria-checked={on} onClick={() => setPick(a.id)}>
                  <span className="glyph">
                    {a.id === 'gmaps' ? <GoogleGlyph /> : a.id === 'waze' ? <WazeGlyph /> : <Icon name="nav" size={22} color="var(--primary)" />}
                  </span>
                  <span className="txt">
                    <span className="nm">{a.name}{a.badge && <span className="rec">{a.badge}</span>}</span>
                    <span className="sb">{a.sub}</span>
                  </span>
                  <span className="radio" aria-hidden="true">{on && <span className="ind" />}</span>
                </button>
              );
            })}
          </div>

          <button className="remember" onClick={() => setRemember(r => !r)} role="switch" aria-checked={remember}>
            <span className="box" aria-hidden="true">{remember && <Icon name="check" size={13} color="#fff" />}</span>
            Sempre abrir no {APPS.find(a => a.id === pick).name}
          </button>

          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 14 }} onClick={go}>
            <Icon name="nav" size={18} /> {pick === 'rota' ? 'Iniciar no Rota' : `Abrir no ${APPS.find(a => a.id === pick).name}`}
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </React.Fragment>
  );
}

// Google Maps multi-stop route: origin + waypoints + destination
function gmapsRouteUrl(guide) {
  const pts = GUIDE_GEO[guide.id];
  if (!pts || pts.length < 2) return gmapsUrl({ name: guide.title });
  const fmt = (p) => `${p[0]},${p[1]}`;
  const q = new URLSearchParams({ api: '1', origin: fmt(pts[0]), destination: fmt(pts[pts.length - 1]), travelmode: 'driving' });
  const mid = pts.slice(1, -1);
  if (mid.length) q.set('waypoints', mid.map(fmt).join('|'));
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}
function wazeRouteUrl(guide) {
  const pts = GUIDE_GEO[guide.id];
  const last = pts ? pts[pts.length - 1] : DEFAULT_GEO;
  return `https://waze.com/ul?ll=${last[0]}%2C${last[1]}&navigate=yes`;
}
function gmapsRouteEmbed(guide) {
  const pts = GUIDE_GEO[guide.id];
  if (!pts) return gmapsEmbed({});
  const o = pts[0], d = pts[pts.length - 1];
  return `https://maps.google.com/maps?saddr=${o[0]},${o[1]}&daddr=${d[0]},${d[1]}&output=embed`;
}

// Handoff for a WHOLE itinerary (all stops as waypoints)
function RouteHandoffSheet({ guide, onClose, pushToast }) {
  const [pick, setPick] = useState('gmaps');
  const stops = GUIDE_GEO[guide.id] || [];
  const go = () => {
    window.open(pick === 'gmaps' ? gmapsRouteUrl(guide) : wazeRouteUrl(guide), '_blank', 'noopener');
    onClose();
    pushToast(pick === 'gmaps' ? 'Roteiro aberto no Google Maps' : 'Destino aberto no Waze', 'nav');
  };
  return (
    <React.Fragment>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet" style={{ paddingBottom: 18 }} role="dialog" aria-modal="true" aria-label={`Abrir o roteiro ${guide.title} em outro app`}>
        <div className="grab" />
        <div style={{ padding: '4px 18px 0' }}>
          <div className="t-eyebrow">Levar o roteiro para</div>
          <h3 className="t-display" style={{ fontSize: 22, margin: '2px 0 12px' }}>{guide.title}</h3>

          <div className="gmaps-preview">
            <iframe src={gmapsRouteEmbed(guide)} title={`Trajeto do roteiro ${guide.title} no Google Maps`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            <div className="gmaps-fallback" aria-hidden="true"><GoogleGlyph size={22} /> <span>Prévia do trajeto</span></div>
          </div>

          <div className="route-stops-note">
            <Icon name="route" size={15} color="var(--primary)" />
            <span><b>{guide.stops.length} paradas</b> vão como pontos de passagem · {guide.distance} km</span>
          </div>

          <div className="app-list" role="radiogroup" aria-label="Escolha o aplicativo">
            {[{ id: 'gmaps', name: 'Google Maps', sub: `Todas as ${guide.stops.length} paradas do guia`, badge: 'Completo' },
              { id: 'waze', name: 'Waze', sub: 'Vai direto ao destino final' }].map(a => {
              const on = pick === a.id;
              return (
                <button key={a.id} className={`app-row ${on ? 'on' : ''}`} role="radio" aria-checked={on} onClick={() => setPick(a.id)}>
                  <span className="glyph">{a.id === 'gmaps' ? <GoogleGlyph /> : <WazeGlyph />}</span>
                  <span className="txt">
                    <span className="nm">{a.name}{a.badge && <span className="rec">{a.badge}</span>}</span>
                    <span className="sb">{a.sub}</span>
                  </span>
                  <span className="radio" aria-hidden="true">{on && <span className="ind" />}</span>
                </button>
              );
            })}
          </div>

          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 14 }} onClick={go}>
            <Icon name="nav" size={18} /> Abrir no {pick === 'gmaps' ? 'Google Maps' : 'Waze'}
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { MapsHandoffSheet, RouteHandoffSheet, gmapsUrl, wazeUrl, gmapsRouteUrl });
