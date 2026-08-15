# Rota by Flui — Handoff para Claude Code

Protótipo funcional em React (via Babel standalone, sem build) que serve de
especificação executável para o app React Native da Etapa 2.

**Leia também:** [`MAPS.md`](MAPS.md) (mapa interativo) e
[`LOADING-STATES.md`](LOADING-STATES.md) (estados de carregamento).

---

## 1. Como rodar

Abra `Rota by Flui.html`. Não há build, bundler nem `npm install`: os scripts são
carregados na ordem declarada no `<head>` e cada arquivo publica seus componentes
em `window` no final (`Object.assign(window, { ... })`).

**A ordem de carga importa** — um arquivo só pode usar o que já foi publicado:

```
app/config.jsx      → window.ROTA_CONFIG        (chaves de API, latências)
app/icons.jsx       → Icon, Seal, SeloBadge
app/data.jsx        → DATA                      (dataset mock de São Paulo)
app/skeletons.jsx   → Skeleton, MapSkeleton, ListSkeleton, StationSkeleton, Spinner, useDelay
app/map.jsx         → MapView, MapStatic        (mapa ilustrado legado — ver §4)
app/gmap.jsx        → GeoMapView                (mapa geográfico real)
app/nav.jsx         → NavScreen                 (navegação até um ponto)
app/trip.jsx        → TripScreen                (execução de um roteiro)
app/event-sheet.jsx → EventSheet                (bottom sheet de reporte)
app/maps.jsx        → MapsHandoffSheet, RouteHandoffSheet
app/rating.jsx      → RateFlow                  (avaliação em 3 etapas)
app/station.jsx     → StationPeek, StationDetail, AMEN
app/screens-map.jsx → MapScreen, FilterSheet
app/screens-extra.jsx → Onboarding, RouteScreen, CommunityScreen, ProfileScreen
app/app.jsx         → monta em #root
```

`app/styles.css` concentra todo o design system em CSS custom properties.
`app/car.jsx` + `app/car.css` são a interface Android Auto (arquivo separado).

---

## 2. Design system

Tudo em tokens no `:root` de `app/styles.css`, com override completo em
`[data-theme="dark"]`. **Nunca use hex literal em componente** — sempre
`var(--token)`, senão o tema escuro quebra.

| Grupo | Tokens |
|---|---|
| Marca | `--primary` `--primary-2` `--primary-soft` `--primary-soft-ink` `--gold` `--gold-ink` `--gold-soft` |
| Disponibilidade | `--ok` (livre) `--busy` (cheio) `--off` (fora do ar) |
| Superfície | `--bg` `--surface` `--surface-2` `--surface-3` `--line` `--line-strong` |
| Texto | `--ink` `--ink-soft` `--ink-faint` |
| Mapa | `--map-land` `--map-road` `--map-park` `--map-water` |
| Foco | `--focus` (usado por todo `:focus-visible`) |

Tipografia: `--font-display` (títulos), `--font-ui` (interface, Inter),
`--font-mono` (números/dados), mais a serifada em `.t-serif` para as vozes
editoriais do Guia.

**Selo Flui** é a métrica de qualidade do produto (1–3, no espírito do guia
Michelin): 1 = vale a parada, 2 = vale o desvio, 3 = vale a viagem. Renderizado
por `<Seal>` e agrupado por `<SeloRow n={1..3}>`.

---

## 3. Modelo de dados (`app/data.jsx`)

```js
DATA.user            // motorista logado + carro
DATA.user_geo        // { lat, lng }  ← posição real usada pelo mapa
DATA.user_xy         // { x, y }      ← legado do mapa ilustrado
DATA.map_default     // { lat, lng, zoom } enquadramento inicial

DATA.stations[]      // ponto de recarga
  id, name, area
  lat, lng           // ← posição real (fonte da verdade)
  x, y               // ← legado
  dist, avail: 'ok'|'busy'|'off', selo: 0..3, rating, reviews
  free, total, power, connectors[], price
  hours, quiet, cover, amenities[], tags[], blurb, reviewsList[]

DATA.reports[]       // reportes da comunidade (estilo Waze), com lat/lng
DATA.guides[]        // roteiros curados do Guia Flui, com stops[]
DATA.route           // planejador ponto-a-ponto
```

Ao plugar a API real, mantenha **exatamente esses nomes de campo**: os
componentes leem direto do objeto, sem camada de adaptação.

---

## 4. Os dois mapas

- `app/gmap.jsx` → **`<GeoMapView>`**: mapa geográfico real, com marcadores por
  lat/lng. **É o mapa do produto.** Detalhes em [`MAPS.md`](MAPS.md).
- `app/map.jsx` → `<MapView>` / `<MapStatic>`: mapa ilustrado em SVG. Continua no
  projeto porque as telas de **navegação** (`nav.jsx`) e **roteiro** (`trip.jsx`)
  desenham a rota sobre ele em espaço 1000×1500. Ao portar, essas duas telas
  devem passar a usar a polyline do Directions API sobre o mapa real
  (ver `MAPS.md` §5).

---

## 5. Acessibilidade — requisitos a preservar

Já implementado e **não deve regredir** no port:

- Pinos e marcadores são `<button>` reais, focáveis por teclado, com
  `aria-label` descritivo completo ("Pátio Higienópolis, Higienópolis. 150 kW,
  4 de 6 pontos livres, disponível, 3 selos Flui. 1,2 km").
- `aria-label` em todo botão só-ícone; `role="switch"`/`"radio"` nos chips de
  filtro; `aria-pressed` em alternâncias; `role="dialog" aria-modal` nos sheets.
- `aria-live="polite"` em toasts, contadores de resultado e no banner de manobra.
- Foco visível de 3px (`--focus`) em tudo; skip link "Pular para o conteúdo".
- Alvos de toque ≥ 44px (`.chip`, `.iconbtn`, `.fab`, `.navitem`, slider).
- `prefers-reduced-motion` desliga animações e shimmer;
  `prefers-contrast: more` reforça bordas.
- Ícones decorativos com `aria-hidden`; `<Icon label="…">` quando informativo.

Equivalentes React Native: `accessible`, `accessibilityLabel`, `accessibilityRole`,
`accessibilityState`, `AccessibilityInfo.isReduceMotionEnabled()`.

---

## 6. Fluxos implementados

| Fluxo | Arquivo | Entrada |
|---|---|---|
| Onboarding | `screens-extra.jsx` | primeira execução |
| Mapa + filtros | `screens-map.jsx` | aba Mapa |
| Ficha do ponto | `station.jsx` | toque no pino → peek → ficha |
| Navegação até o ponto | `nav.jsx` | "Navegar" na ficha |
| Guia Flui (roteiros) | `screens-extra.jsx` | aba Rota sem destino |
| Executar roteiro | `trip.jsx` | "Iniciar roteiro" |
| Avaliação (3 etapas) | `rating.jsx` | chegada, fim de roteiro, ficha |
| Abrir no Maps/Waze | `maps.jsx` | "Navegar" e fim de roteiro |
| Reportes da comunidade | `event-sheet.jsx` | toque no marcador |

---

## 7. Port para React Native — ordem sugerida

1. **Tokens** → `theme.ts` com os mesmos nomes; `useColorScheme()` para o tema.
2. **Dados** → mesma forma; troque o mock por chamadas de API.
3. **Mapa** → `react-native-maps` com `PROVIDER_GOOGLE` (ver `MAPS.md` §4).
4. **Telas** → uma por arquivo, respeitando a tabela do §6.
5. **Bottom sheets** → `@gorhom/bottom-sheet` (o CSS `.sheet` vira `snapPoints`).
6. **Estados de carregamento** → ver `LOADING-STATES.md`.
7. **Acessibilidade** → checklist do §5, um item por vez.

Convenções a manter: um arquivo por domínio, nunca `const styles` global
compartilhado entre componentes (colisão de nomes), e todo texto em pt-BR.
