# Estados de carregamento

Implementados em **`app/skeletons.jsx`** + a seção *LOADING STATES* de
`app/styles.css`.

## Princípio

Nunca um spinner sozinho numa tela em branco. Cada superfície assíncrona mostra
um **placeholder com a forma do conteúdo que vai chegar**, para o layout não
saltar quando os dados carregam. Spinner só dentro de um botão ou ao lado de um
rótulo que diz o que está acontecendo.

## Peças

| Componente | Onde aparece |
|---|---|
| `<Skeleton w h r>` | bloco shimmer genérico |
| `<MapSkeleton>` | mapa, até os tiles/Google responderem — malha de ruas cinza + pinos pulsando + pílula "Carregando pontos próximos…" |
| `<ListSkeleton rows>` | lista de pontos (avatar + duas linhas + tag) |
| `<StationSkeleton>` | ficha do ponto (foto, título, chips, parágrafos) |
| `<Spinner size color>` | dentro de botões e da pílula do mapa |
| `useDelay(ms, dep)` | hook que simula latência |

## `useDelay(ms, dep)`

```js
const ready = useDelay(latency.list, view + '|' + q + '|' + filtros);
```

Retorna `false` por `ms` e depois `true`. O segundo argumento é uma **chave de
consulta**: sempre que ela muda, o carregamento é reproduzido de novo. É isso
que faz o skeleton aparecer a cada troca de filtro ou de aba — e não só uma vez
na montagem.

Durações em `app/config.jsx`:

```js
latency: { map: 900, list: 700, detail: 550 }   // 0 desliga
```

## Onde já está ligado

- **Mapa** — `GeoMapView` mostra `<MapSkeleton>` até o provedor emitir `onReady`
  (evento `idle` no Google; terceiro tile carregado no fallback). Aqui a espera
  é **real**, não simulada.
- **Lista** — `<ListSkeleton>` reexecuta a cada mudança de view, busca ou filtro.
- **Ficha do ponto** — `<StationSkeleton>` enquanto o registro completo "chega".

## Ao plugar a API real

Troque `useDelay` pelo estado de carregamento do seu data layer — a forma é a
mesma:

```js
// antes
const ready = useDelay(latency.list, key);
// depois
const { data, isLoading } = useQuery(['stations', key], fetchStations);
const ready = !isLoading;
```

Os componentes de skeleton continuam iguais.

## Acessibilidade

Todo skeleton carrega `role="status"` + `aria-live="polite"` + um
`aria-label` que diz o que está carregando. Sob `prefers-reduced-motion` o
shimmer é desligado (fundo estático) e o spinner desacelera para 2s.

Em React Native: `accessibilityRole="progressbar"` +
`AccessibilityInfo.isReduceMotionEnabled()`, e `react-content-loader/native`
ou `Animated` para o shimmer.
