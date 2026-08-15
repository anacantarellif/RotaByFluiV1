# Mapa interativo — arquitetura e integração

O mapa vive em **`app/gmap.jsx`** e é exposto por um único componente,
**`<GeoMapView>`**. Ele tem dois provedores intercambiáveis com a mesma API,
os mesmos marcadores e os mesmos callbacks.

---

## 1. Por que dois provedores

| Provedor | Quando roda | Para quê |
|---|---|---|
| `google` | há `ROTA_CONFIG.googleMapsApiKey` | **caminho de produção** — Google Maps JavaScript API |
| `tiles` | não há chave (padrão) | protótipo demonstrável sem conta de billing |

A troca é automática e invisível: o mesmo componente, os mesmos pinos, o mesmo
comportamento. O fallback existe só para que o protótipo abra em qualquer
máquina sem configuração — **não** é uma alternativa de produto.

```js
// app/config.jsx
window.ROTA_CONFIG = { googleMapsApiKey: '' };  // ← cole a chave aqui
```

Com a chave preenchida, `GeoMapView` carrega a Maps JS API, aplica o estilo
`GMAP_STYLE_LIGHT` / `GMAP_STYLE_DARK` (paleta Rota) e passa a desenhar sobre o
Google. Se o carregamento falhar (chave inválida, offline, quota), cai
graciosamente no provedor de tiles em vez de mostrar tela cinza.

---

## 2. API do componente

```jsx
<GeoMapView
  stations={visible}        // array já filtrado; marcadores por lat/lng
  active={activeStationId}  // id do pino destacado
  onPin={(station) => {}}   // toque num ponto de recarga
  onReport={(report) => {}} // toque num reporte da comunidade
  showReports={true}
  recenterSignal={n}        // incremente para recentrar no motorista
/>
```

Sem prop de centro/zoom: o enquadramento inicial vem de `DATA.map_default` e o
usuário controla o resto. `recenterSignal` é um contador — mudar o valor dispara
o recentramento (padrão já usado pelo botão de bússola).

---

## 3. Como os marcadores funcionam

Os dois provedores renderizam **o mesmo JSX** (`StationPin`, `ReportPin`), então
o visual não diverge:

- **tiles** — os pinos são filhos absolutos de `.geo-markers`, posicionados por
  projeção Web Mercator (`project(lat, lng, z)` menos a origem do viewport).
- **google** — um único `OverlayView` cria um `<div>` no pane
  `overlayMouseTarget`; os pinos são renderizados nele via
  `ReactDOM.createPortal`, posicionados por `fromLatLngToDivPixel`.

Um só `OverlayView` para todos os marcadores (em vez de um por pino) mantém o
custo baixo e o React dono da árvore.

**Marcadores diferenciados** (requisito da entrega) — classes em `.pin`:

| Estado | Classe | Cor |
|---|---|---|
| Livre | `.ok` | `--ok` |
| Movimentado | `.busy` | `--busy` |
| Fora do ar | `.off` | `--off` |
| Com Selo Flui | `.selo` | coroa dourada com 1–3 selos |
| Selecionado | `.active` | elevação + escala |

O número dentro do pino é a potência em kW. Reportes da comunidade usam
`.report` (balão + rabicho na cor do tipo de evento).

---

## 4. Equivalente em React Native

```bash
npm i react-native-maps
```

```jsx
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';

<MapView
  provider={PROVIDER_GOOGLE}
  customMapStyle={dark ? GMAP_STYLE_DARK : GMAP_STYLE_LIGHT}  // reaproveite o array
  initialRegion={{
    latitude: DATA.map_default.lat,
    longitude: DATA.map_default.lng,
    latitudeDelta: 0.09, longitudeDelta: 0.09,
  }}
  showsUserLocation
>
  {stations.map(st => (
    <Marker
      key={st.id}
      coordinate={{ latitude: st.lat, longitude: st.lng }}
      onPress={() => onPin(st)}
      accessibilityLabel={pinLabel(st)}   // mesma função de gmap.jsx
    >
      <StationPinNative st={st} active={active === st.id} />
    </Marker>
  ))}
</MapView>
```

Um `<Marker>` com filho aceita qualquer view como pino — porte `StationPin`
para RN mantendo as mesmas cores por `avail` e a coroa de selos.

Chaves nativas (não use `ROTA_CONFIG` no app RN):

- **Android** — `android/app/src/main/AndroidManifest.xml`:
  `<meta-data android:name="com.google.android.geo.API_KEY" android:value="…"/>`
- **iOS** — `AppDelegate.m`: `[GMSServices provideAPIKey:@"…"]`

Restrinja a chave por package name / bundle id no Google Cloud Console e
habilite: *Maps SDK for Android*, *Maps SDK for iOS*, *Directions API*,
*Places API*.

---

## 5. O que ainda é simulado

| Item | Hoje | Para produção |
|---|---|---|
| Traçado da rota | polyline sintética em `nav.jsx` / `trip.jsx` sobre o mapa ilustrado | **Directions API** → decodifique `overview_polyline` e desenhe com `<Polyline>` |
| Manobras | geradas por heurística de ângulo entre vértices | `legs[].steps[].maneuver` + `html_instructions` do Directions |
| Distância / ETA | strings fixas em `DATA.stations[].dist` | `legs[].distance.value` e `legs[].duration_in_traffic` |
| Posição do carro | animada por `requestAnimationFrame` | `Geolocation.watchPosition` |
| Disponibilidade | campos `free` / `total` mockados | WebSocket ou polling do operador (OCPI) |
| Busca por endereço | filtro local por nome/bairro | **Places Autocomplete** |

A ordem recomendada de substituição é: Directions (rota real) → Geolocation
(posição real) → disponibilidade ao vivo → Places.

---

## 6. Atribuição

O provedor de tiles usa OpenStreetMap via CARTO e **exige** o crédito visível
(`.geo-credit`, canto inferior direito). Ao migrar para o Google, remova esse
crédito — o logo do Google já vem no próprio mapa e é obrigatório mantê-lo.
