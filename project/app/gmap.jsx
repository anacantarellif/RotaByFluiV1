// gmap.jsx — real interactive geographic map for Rota.
//
// TWO PROVIDERS, ONE COMPONENT (<GeoMapView>):
//
//   1. 'google' — the production path. Loads the Google Maps JavaScript API and
//      renders the SAME pin markup through an OverlayView, so the visual language
//      is identical in both providers. Used automatically when an API key is set:
//          window.ROTA_CONFIG = { googleMapsApiKey: 'AIza…' }
//      (see app/config.jsx). This is what ships; docs/MAPS.md explains the
//      react-native-maps equivalent for the React Native build.
//
//   2. 'tiles' — keyless fallback so the prototype is demo-able with no billing
//      account. A small Web-Mercator slippy map (drag to pan, wheel/buttons to
//      zoom) drawing CARTO raster tiles, which match the app's light/dark themes.
//      Same props, same markers, same callbacks as the Google path.
//
// Both providers place markers by REAL latitude/longitude from DATA.stations,
// never by the mock x/y of the old illustrated map.

const React = window.React;
const { useState, useRef, useEffect, useCallback, useMemo } = React;
const { Icon, Seal } = window;

const TILE = 256;
const MIN_Z = 11;
const MAX_Z = 17;

/* ---------- Web Mercator ---------- */
function project(lat, lng, z) {
  const scale = TILE * Math.pow(2, z);
  const x = (lng + 180) / 360 * scale;
  const s = Math.sin(lat * Math.PI / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale;
  return { x, y };
}
function unproject(x, y, z) {
  const scale = TILE * Math.pow(2, z);
  const lng = x / scale * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y / scale;
  const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

const AVAIL_TXT = { ok: 'disponível', busy: 'movimentado', off: 'indisponível' };
function pinLabel(st) {
  return `${st.name}, ${st.area}. ${st.power} kW, ${st.free} de ${st.total} pontos livres, ${AVAIL_TXT[st.avail]}` +
    (st.selo > 0 ? `, ${st.selo} ${st.selo === 1 ? 'selo' : 'selos'} Flui` : '') + `. ${st.dist}`;
}

/* ---------- shared marker markup (identical in both providers) ---------- */
function StationPin({ st, active, onClick }) {
  return (
    <button className={`pin ${st.avail} ${st.selo ? 'selo' : ''} ${active ? 'active' : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick(st); }}
      aria-label={pinLabel(st)} aria-pressed={!!active}>
      {st.selo > 0 && <div className="crown"><Seal size={16} /></div>}
      <div className="body"><span className="glyph">{st.power}</span></div>
    </button>
  );
}
function ReportPin({ r, onClick }) {
  const inner = (
    <React.Fragment>
      <div className="bubble" style={{ color: r.color }}><Icon name={r.icon} size={15} color={r.color} /></div>
      <div className="tail" style={{ borderTopColor: r.color }} />
    </React.Fragment>
  );
  if (!onClick) return <div className="report">{inner}</div>;
  return (
    <button className="report tappable"
      aria-label={`Reporte da comunidade: ${r.label}, há ${r.when}. Toque para ver detalhes`}
      onClick={(e) => { e.stopPropagation(); onClick(r); }}>{inner}</button>
  );
}

/* ============================================================
   PROVIDER 1 — keyless raster-tile map (Web Mercator)
   ============================================================ */
function TileMap({ stations, active, onPin, onReport, showReports, recenterSignal, reports, userGeo, home, onReady }) {
  const wrap = useRef(null);
  const drag = useRef(null);
  const [size, setSize] = useState({ w: 392, h: 700 });
  const [view, setView] = useState({ lat: home.lat, lng: home.lng, z: home.zoom });
  const [tilesLoaded, setTilesLoaded] = useState(0);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); setSize({ w: r.width, h: r.height }); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // recenter on the driver
  useEffect(() => {
    if (recenterSignal) setView(v => ({ ...v, lat: userGeo.lat, lng: userGeo.lng, z: Math.max(v.z, 14) }));
  }, [recenterSignal]);

  const z = Math.round(view.z);
  const centerPx = project(view.lat, view.lng, z);
  const originX = centerPx.x - size.w / 2;
  const originY = centerPx.y - size.h / 2;

  const toScreen = useCallback((lat, lng) => {
    const p = project(lat, lng, z);
    return { left: p.x - originX, top: p.y - originY };
  }, [z, originX, originY]);

  // tile grid covering the viewport (+1 ring for smooth panning)
  const tiles = useMemo(() => {
    const list = [];
    const n = Math.pow(2, z);
    const x0 = Math.floor(originX / TILE) - 1, x1 = Math.floor((originX + size.w) / TILE) + 1;
    const y0 = Math.floor(originY / TILE) - 1, y1 = Math.floor((originY + size.h) / TILE) + 1;
    for (let ty = y0; ty <= y1; ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = x0; tx <= x1; tx++) {
        const wx = ((tx % n) + n) % n;
        list.push({ key: `${z}/${wx}/${ty}`, x: tx, y: ty, wx, left: tx * TILE - originX, top: ty * TILE - originY });
      }
    }
    return list;
  }, [z, originX, originY, size.w, size.h]);

  const dark = document.querySelector('.rota')?.dataset.theme === 'dark';
  const style = dark ? 'dark_all' : 'light_all';
  const tileUrl = (t) => `https://basemaps.cartocdn.com/${style}/${z}/${t.wx}/${t.y}${window.devicePixelRatio > 1 ? '@2x' : ''}.png`;

  useEffect(() => { if (tilesLoaded > 2 && onReady) onReady(); }, [tilesLoaded > 2]);

  const onDown = (e) => {
    const p = e.touches ? e.touches[0] : e;
    drag.current = { sx: p.clientX, sy: p.clientY, lat: view.lat, lng: view.lng, moved: false };
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - drag.current.sx, dy = p.clientY - drag.current.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
    const c = project(drag.current.lat, drag.current.lng, z);
    const next = unproject(c.x - dx, c.y - dy, z);
    setView(v => ({ ...v, lat: Math.max(-85, Math.min(85, next.lat)), lng: next.lng }));
  };
  const onUp = () => { drag.current = null; };
  const zoomBy = (d) => setView(v => ({ ...v, z: Math.max(MIN_Z, Math.min(MAX_Z, v.z + d)) }));
  const onWheel = (e) => { e.preventDefault(); zoomBy(e.deltaY > 0 ? -1 : 1); };

  return (
    <div className="geo-map" ref={wrap}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp} onWheel={onWheel}
      role="application" aria-label="Mapa interativo dos pontos de recarga">
      <div className="geo-tiles">
        {tiles.map(t => (
          <img key={t.key} src={tileUrl(t)} alt="" draggable="false" className="geo-tile"
            style={{ left: t.left, top: t.top }} onLoad={() => setTilesLoaded(n => n + 1)} />
        ))}
      </div>

      <div className="geo-markers">
        {showReports && reports.map(r => {
          const p = toScreen(r.lat, r.lng);
          return <div key={r.id} className="geo-anchor" style={{ left: p.left, top: p.top }}><ReportPin r={r} onClick={onReport} /></div>;
        })}
        {stations.map(st => {
          const p = toScreen(st.lat, st.lng);
          return <div key={st.id} className="geo-anchor" style={{ left: p.left, top: p.top }}><StationPin st={st} active={active === st.id} onClick={onPin} /></div>;
        })}
        <div className="geo-anchor" style={toScreen(userGeo.lat, userGeo.lng)}>
          <div className="userdot" style={{ position: 'static' }}><div className="pulse" /><div className="core" /></div>
        </div>
      </div>

      <div className="geo-zoom">
        <button onClick={() => zoomBy(1)} aria-label="Aproximar o mapa"><Icon name="plus" size={18} /></button>
        <button onClick={() => zoomBy(-1)} aria-label="Afastar o mapa"><Icon name="minus" size={18} /></button>
      </div>
      <div className="geo-credit">© OpenStreetMap · CARTO</div>
    </div>
  );
}

/* ============================================================
   PROVIDER 2 — Google Maps JavaScript API
   ============================================================ */
let gmapsPromise = null;
function loadGoogleMaps(key) {
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve(window.google.maps);
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&language=pt-BR&region=BR`;
    s.async = true;
    s.onload = () => resolve(window.google.maps);
    s.onerror = () => reject(new Error('google-maps-load-failed'));
    document.head.appendChild(s);
  });
  return gmapsPromise;
}

// Muted styling so Google's basemap matches the Rota palette.
const GMAP_STYLE_LIGHT = [
  { elementType: 'geometry', stylers: [{ color: '#F6F1E7' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6A6275' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFDF8' }] },
  { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#DDE9D2' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#FFF8E8' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#F2D9A0' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#BFD8E8' }] },
];
const GMAP_STYLE_DARK = [
  { elementType: 'geometry', stylers: [{ color: '#1A1522' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9A92A3' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#14111B' }] },
  { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1E2A20' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2A2333' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#141E28' }] },
];

function GoogleMap({ stations, active, onPin, onReport, showReports, recenterSignal, reports, userGeo, home, onReady, onFail }) {
  const host = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);      // OverlayView whose div holds our React markers
  const [ready, setReady] = useState(false);
  const [pane, setPane] = useState(null);
  const [, force] = useState(0);

  useEffect(() => {
    let dead = false;
    loadGoogleMaps(window.ROTA_CONFIG.googleMapsApiKey).then((maps) => {
      if (dead || !host.current) return;
      const dark = document.querySelector('.rota')?.dataset.theme === 'dark';
      const map = new maps.Map(host.current, {
        center: { lat: home.lat, lng: home.lng },
        zoom: home.zoom,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        clickableIcons: false,
        styles: dark ? GMAP_STYLE_DARK : GMAP_STYLE_LIGHT,
      });
      mapRef.current = map;

      // One OverlayView hosting a plain DOM node — we render our own HTML pins
      // into it with React, so markers look identical to the fallback provider.
      const overlay = new maps.OverlayView();
      const div = document.createElement('div');
      div.className = 'geo-markers';
      overlay.onAdd = function () { this.getPanes().overlayMouseTarget.appendChild(div); setPane(div); };
      overlay.draw = function () { force(n => n + 1); };
      overlay.onRemove = function () { div.remove(); };
      overlay.setMap(map);
      layerRef.current = overlay;

      maps.event.addListenerOnce(map, 'idle', () => { setReady(true); onReady && onReady(); });
    }).catch(() => onFail && onFail());
    return () => { dead = true; if (layerRef.current) layerRef.current.setMap(null); };
  }, []);

  useEffect(() => {
    if (recenterSignal && mapRef.current) {
      mapRef.current.panTo({ lat: userGeo.lat, lng: userGeo.lng });
      if (mapRef.current.getZoom() < 14) mapRef.current.setZoom(14);
    }
  }, [recenterSignal]);

  // project lat/lng → pixel inside the overlay pane
  const toScreen = (lat, lng) => {
    const ov = layerRef.current;
    if (!ov || !ov.getProjection || !ov.getProjection()) return { left: -9999, top: -9999 };
    const p = ov.getProjection().fromLatLngToDivPixel(new window.google.maps.LatLng(lat, lng));
    return { left: p.x, top: p.y };
  };

  const markers = ready && pane ? window.ReactDOM.createPortal(
    <React.Fragment>
      {showReports && reports.map(r => (
        <div key={r.id} className="geo-anchor" style={toScreen(r.lat, r.lng)}><ReportPin r={r} onClick={onReport} /></div>
      ))}
      {stations.map(st => (
        <div key={st.id} className="geo-anchor" style={toScreen(st.lat, st.lng)}><StationPin st={st} active={active === st.id} onClick={onPin} /></div>
      ))}
      <div className="geo-anchor" style={toScreen(userGeo.lat, userGeo.lng)}>
        <div className="userdot" style={{ position: 'static' }}><div className="pulse" /><div className="core" /></div>
      </div>
    </React.Fragment>, pane) : null;

  return (
    <div className="geo-map" role="application" aria-label="Mapa interativo dos pontos de recarga">
      <div ref={host} className="geo-host" />
      {markers}
      <div className="geo-zoom">
        <button onClick={() => mapRef.current && mapRef.current.setZoom(mapRef.current.getZoom() + 1)} aria-label="Aproximar o mapa"><Icon name="plus" size={18} /></button>
        <button onClick={() => mapRef.current && mapRef.current.setZoom(mapRef.current.getZoom() - 1)} aria-label="Afastar o mapa"><Icon name="minus" size={18} /></button>
      </div>
    </div>
  );
}

/* ============================================================
   PUBLIC COMPONENT
   ============================================================ */
function GeoMapView(props) {
  const D = window.DATA;
  const cfg = window.ROTA_CONFIG || {};
  const wantGoogle = !!cfg.googleMapsApiKey;
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const shared = {
    stations: props.stations || D.stations,
    reports: D.reports,
    userGeo: D.user_geo,
    home: D.map_default,
    active: props.active,
    onPin: props.onPin,
    onReport: props.onReport,
    showReports: props.showReports !== false,
    recenterSignal: props.recenterSignal || 0,
    onReady: () => setLoading(false),
  };

  return (
    <div className="geo-shell">
      {wantGoogle && !failed
        ? <GoogleMap {...shared} onFail={() => { setFailed(true); setLoading(true); }} />
        : <TileMap {...shared} />}
      {loading && <window.MapSkeleton />}
    </div>
  );
}

Object.assign(window, { GeoMapView, StationPin, ReportPin, project, unproject });
