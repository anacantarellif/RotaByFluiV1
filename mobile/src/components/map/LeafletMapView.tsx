// Keyless map fallback for Android when no Google Maps API key is configured.
//
// The previous attempt (a `UrlTile` free-tile overlay on top of react-native-maps'
// `PROVIDER_DEFAULT`) still rendered nothing on Android — because `PROVIDER_DEFAULT`
// is *also* backed by the Google Maps Android SDK there (there's no non-Google
// native map engine on Android the way Apple Maps exists on iOS), and that SDK
// doesn't just fail to load tile *imagery* without a valid, billed key — its
// underlying native map object fails to initialize at all, so a tile overlay added
// on top of a broken map view had nothing working to attach to. Reported: identical
// blank grid, no change.
//
// This sidesteps the Google Maps Android SDK entirely: a WebView running Leaflet.js
// (a free, open-source JS map library) against free OpenStreetMap/CARTO tiles — the
// exact same tile source as the previous attempt, but rendered by a real map engine
// that has no Google dependency and no key requirement whatsoever. A WebView is a
// plain HTML renderer; nothing about it touches Google Play Services.
//
// Markers here are simple colored circles (status color, gold ring for Selo Flui)
// instead of the app's custom SVG pin art — Leaflet markers live inside the
// WebView's own HTML/CSS/JS world, so the native <StationPin>/<ReportPin> SVG
// components can't be reused directly here. Same information (status color,
// tap-to-open), simpler look, only on this fallback path.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../../theme/ThemeContext';
import { DATA } from '../../data/data';
import { Station, Report } from '../../data/types';
import { OSM_TILE_DARK, OSM_TILE_LIGHT } from './mapStyles';
import { MapSkeleton } from '../skeletons/Skeletons';

const DELTA_ZOOM = 13;

type StationMsg = { type: 'pin'; id: string };
type ReportMsg = { type: 'report'; id: string };
type ReadyMsg = { type: 'ready' };
type InMsg = StationMsg | ReportMsg | ReadyMsg;

function buildHtml(opts: {
  tileUrl: string;
  center: { lat: number; lng: number };
  userGeo: { lat: number; lng: number };
  stations: Station[];
  reports: Report[];
  activeId?: string | null;
  showReports: boolean;
  colors: { ok: string; busy: string; off: string; primary: string; gold: string; surface: string };
}) {
  const { tileUrl, center, userGeo, stations, reports, activeId, showReports, colors } = opts;
  // Data is serialized as JSON straight into the page — this HTML is generated
  // fresh per render from our own trusted app data (DATA.stations/DATA.reports),
  // never from user input, so there's no injection concern here.
  const stationsJson = JSON.stringify(
    stations.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, avail: s.avail, selo: s.selo, active: s.id === activeId }))
  );
  const reportsJson = JSON.stringify(reports.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, color: r.colorToken })));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${colors.surface}; }
    .attribution { position: absolute; left: 4px; bottom: 4px; z-index: 1000; font-size: 9px; background: rgba(255,255,255,0.75); padding: 1px 5px; border-radius: 4px; color: #333; }
    .rota-dot { border-radius: 50%; border: 3px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
    .rota-user { border-radius: 50%; border: 3px solid #fff; background: ${colors.primary}; box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="attribution">© OpenStreetMap contributors © CARTO</div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${center.lat}, ${center.lng}], ${DELTA_ZOOM});
    L.tileLayer('${tileUrl}', { maxZoom: 19 }).addTo(map);

    var AVAIL_COLOR = { ok: '${colors.ok}', busy: '${colors.busy}', off: '${colors.off}' };

    function post(msg) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }

    var stations = ${stationsJson};
    stations.forEach(function (s) {
      var size = s.active ? 22 : 16;
      var icon = L.divIcon({
        className: '',
        html: '<div class="rota-dot" style="width:' + size + 'px;height:' + size + 'px;background:' + AVAIL_COLOR[s.avail] +
          (s.selo > 0 ? ';box-shadow:0 0 0 2px ${colors.gold}' : '') + '"></div>',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      var m = L.marker([s.lat, s.lng], { icon: icon }).addTo(map);
      m.on('click', function () { post({ type: 'pin', id: s.id }); });
    });

    if (${showReports}) {
      var reports = ${reportsJson};
      reports.forEach(function (r) {
        var icon = L.divIcon({
          className: '',
          html: '<div class="rota-dot" style="width:12px;height:12px;background:' + (AVAIL_COLOR[r.color] || '${colors.primary}') + '"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        var m = L.marker([r.lat, r.lng], { icon: icon }).addTo(map);
        m.on('click', function () { post({ type: 'report', id: r.id }); });
      });
    }

    L.marker([${userGeo.lat}, ${userGeo.lng}], {
      icon: L.divIcon({ className: '', html: '<div class="rota-user" style="width:16px;height:16px"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
      interactive: false,
    }).addTo(map);

    window.__rotaRecenter = function (lat, lng) {
      map.flyTo([lat, lng], 15, { duration: 0.5 });
    };

    map.whenReady(function () { post({ type: 'ready' }); });
  </script>
</body>
</html>`;
}

export function LeafletMapView({
  stations,
  active,
  onPin,
  onReport,
  showReports = true,
  recenterSignal = 0,
}: {
  stations?: Station[];
  active?: string | null;
  onPin: (st: Station) => void;
  onReport?: (r: Report) => void;
  showReports?: boolean;
  recenterSignal?: number;
}) {
  const { mode, colors } = useTheme();
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const list = stations ?? DATA.stations;
  const home = DATA.map_default;
  const userGeo = DATA.user_geo;

  // Rebuilding the whole HTML on every render would reload the WebView (and
  // reset the user's pan/zoom) constantly — only rebuild when the underlying
  // data that actually needs to change on the page does.
  const html = useMemo(
    () =>
      buildHtml({
        tileUrl: mode === 'dark' ? OSM_TILE_DARK : OSM_TILE_LIGHT,
        center: { lat: home.lat, lng: home.lng },
        userGeo,
        stations: list,
        reports: DATA.reports,
        activeId: active,
        showReports,
        colors: { ok: colors.ok, busy: colors.busy, off: colors.off, primary: colors.primary, gold: colors.gold, surface: colors.surface },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, list, active, showReports]
  );

  useEffect(() => {
    if (recenterSignal > 0) {
      webRef.current?.injectJavaScript(`window.__rotaRecenter && window.__rotaRecenter(${userGeo.lat}, ${userGeo.lng}); true;`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterSignal]);

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: InMsg;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') setLoading(false);
    else if (msg.type === 'pin') {
      const st = list.find((s) => s.id === msg.id);
      if (st) onPin(st);
    } else if (msg.type === 'report') {
      const r = DATA.reports.find((x) => x.id === msg.id);
      if (r && onReport) onReport(r);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} accessibilityLabel="Mapa interativo dos pontos de recarga">
      <WebView
        ref={webRef}
        source={{ html }}
        style={StyleSheet.absoluteFill}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        scrollEnabled={false}
        bounces={false}
      />
      {loading && <MapSkeleton />}
    </View>
  );
}
