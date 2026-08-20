// Ported from project/app/screens-map.jsx — the main map screen: interactive map
// with station pins + community-report pins, search, quick/advanced filters, a
// map/list toggle, and the report/rate/handoff sheets it opens. This is the
// screen the FIAP Stage 2 brief treats as the minimum deliverable ("o app precisa
// mostrar... o mapa interativo com os pontos/filtros/fichas").
//
// The source's `RateSheet` (also defined in screens-map.jsx) is never actually
// rendered by its own `MapScreen` — grepped: zero JSX usage, only exported via
// `Object.assign(window, ...)` for other files that don't call it either. The
// real 3-step rating flow used here is `RateFlow` (rating.jsx, already ported to
// src/components/rating/RateFlow.tsx), so `RateSheet` is dead code in the source
// and is not ported.
//
// Per PORTING_GUIDE.md, `favs`/`onToggleFav`/`pushToast` come from
// useFavorites()/useToast() instead of being threaded through props, `onNavigate`
// is gone (MapsHandoffSheet navigates via useNavigation() itself), and `density`/
// `showReports` read from useTheme() instead of being passed in.
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Icon, IconName, Seal } from '../components/icons/Icon';
import { GeoMapView } from '../components/map/GeoMapView';
import { AMEN, AVAIL, Stars, StationSheet } from '../components/station/Station';
import { EventSheet } from '../components/event/EventSheet';
import { MapsHandoffSheet } from '../components/handoff/MapsHandoff';
import { RateFlow } from '../components/rating/RateFlow';
import { ModalSheet } from '../components/sheets/ModalSheet';
import { ListSkeleton } from '../components/skeletons/Skeletons';
import { useDelay } from '../hooks/useDelay';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../state/ToastContext';
import { useFavorites } from '../state/FavoritesContext';
import { ROTA_CONFIG } from '../config';
import { DATA } from '../data/data';
import { Report, Station } from '../data/types';

// ---- filter data + pure matching logic (ported 1:1 from screens-map.jsx) ----

type Adv = { connectors: string[]; power: number; hours: string; amenities: string[]; minRating: number; seloOnly: boolean };
const EMPTY_ADV: Adv = { connectors: [], power: 0, hours: 'any', amenities: [], minRating: 0, seloOnly: false };

const CONNECTORS = ['CCS2', 'Type 2', 'GB/T'];
const POWER_STEPS = [0, 22, 50, 100, 150];
const RATING_STEPS = [0, 3.5, 4, 4.5];
const HOURS_OPTS: { id: string; label: string }[] = [
  { id: 'any', label: 'Qualquer horário' },
  { id: 'open', label: 'Aberto agora' },
  { id: '24h', label: 'Aberto 24 h' },
  { id: 'late', label: 'Aberto após 22 h' },
];
const AMEN_FILTER = ['coffee', 'food', 'wc', 'parking', 'wifi', 'shield', 'store'] as const;

const QUICK: { id: string; label: string; test: (s: Station) => boolean }[] = [
  { id: 'now', label: 'Livre agora', test: (s) => s.avail === 'ok' },
  { id: 'selo', label: 'Selo Flui', test: (s) => s.selo > 0 },
  { id: 'cover', label: 'Coberto', test: (s) => s.cover },
];

function parseHours(h: string): { open: number; close: number; always: boolean } {
  if (/24/.test(h)) return { open: 0, close: 24, always: true };
  const m = h.match(/(\d{1,2})h\s*[–-]\s*(\d{1,2})h/);
  if (!m) return { open: 0, close: 24, always: true };
  const open = +m[1];
  const closeRaw = +m[2];
  return { open, close: closeRaw === 0 ? 24 : closeRaw, always: false };
}
function hoursTest(st: Station, opt: string, nowHour: number): boolean {
  const { open, close, always } = parseHours(st.hours);
  if (opt === 'any') return true;
  if (opt === '24h') return always;
  if (opt === 'late') return always || close >= 22 || close <= 2;
  if (always) return true;
  return close > open ? nowHour >= open && nowHour < close : nowHour >= open || nowHour < close;
}
function matchAdv(st: Station, adv: Adv, quick: string[], nowHour: number): boolean {
  for (const id of quick) {
    const q = QUICK.find((x) => x.id === id);
    if (q && !q.test(st)) return false;
  }
  if (adv.connectors.length && !adv.connectors.every((c) => st.connectors.includes(c))) return false;
  if (adv.power && st.power < adv.power) return false;
  if (!hoursTest(st, adv.hours, nowHour)) return false;
  if (adv.amenities.length && !adv.amenities.every((a) => st.amenities.includes(a))) return false;
  if (adv.minRating && st.rating < adv.minRating) return false;
  if (adv.seloOnly && !(st.selo > 0)) return false;
  return true;
}
function countAdv(adv: Adv): number {
  return (
    adv.connectors.length +
    (adv.power ? 1 : 0) +
    (adv.hours !== 'any' ? 1 : 0) +
    adv.amenities.length +
    (adv.minRating ? 1 : 0) +
    (adv.seloOnly ? 1 : 0)
  );
}

// ---- shared Chip (quick filters, FilterSheet toggles) ----

function Chip({
  label,
  icon,
  iconElement,
  active,
  onPress,
  role = 'button',
  a11yLabel,
}: {
  label: string;
  icon?: IconName;
  /** Custom leading icon (e.g. the Selo Flui badge) in place of a plain Icon glyph. */
  iconElement?: React.ReactNode;
  active?: boolean;
  onPress: () => void;
  role?: 'button' | 'switch' | 'radio';
  a11yLabel?: string;
}) {
  const { colors, font } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === 'button' ? undefined : { checked: !!active }}
      accessibilityLabel={a11yLabel ?? label}
      hitSlop={4}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 36,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 100,
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: 1.5,
        borderColor: active ? colors.primary : colors.line,
      }}
    >
      {iconElement ?? (icon && <Icon name={icon} size={14} color={active ? '#fff' : colors.primary} />)}
      <Text style={{ fontFamily: font.uiSemibold, fontSize: 12.5, color: active ? '#fff' : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

// ---- FilterSheet ----
//
// The source's "Potência mínima" control is a discrete 5-step `<input type=range>`
// with a scale legend under it. RN has no native range-slider primitive (the
// battery slider elsewhere in the app needed a hand-built PanResponder/gesture
// track), and for 5 fixed steps a row of selectable chips communicates the exact
// same discrete choice with less code and better built-in accessibility (each
// step is its own `role="radio"` element instead of one `adjustable` slider) — so
// that's what this uses instead of reimplementing a drag track.
function FilterSheet({
  adv,
  quick,
  nowHour,
  stations,
  onClose,
  onApply,
}: {
  adv: Adv;
  quick: string[];
  nowHour: number;
  stations: Station[];
  onClose: () => void;
  onApply: (v: Adv) => void;
}) {
  const { colors, font, space } = useTheme();
  const [local, setLocal] = useState<Adv>(adv);
  const set = (patch: Partial<Adv>) => setLocal((l) => ({ ...l, ...patch }));
  const toggleConnector = (c: string) =>
    setLocal((l) => ({ ...l, connectors: l.connectors.includes(c) ? l.connectors.filter((x) => x !== c) : [...l.connectors, c] }));
  const toggleAmenity = (a: string) =>
    setLocal((l) => ({ ...l, amenities: l.amenities.includes(a) ? l.amenities.filter((x) => x !== a) : [...l.amenities, a] }));
  const live = stations.filter((s) => matchAdv(s, local, quick, nowHour)).length;

  return (
    <ModalSheet open onClose={onClose} snapPoints={['86%']} label="Filtros de busca">
      <View style={{ paddingHorizontal: space.pad, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.inkFaint }}>
              Filtros
            </Text>
            <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: 23, marginTop: 2, color: colors.ink }}>
              Refinar busca
            </Text>
          </View>
          <Pressable
            onPress={() => setLocal(EMPTY_ADV)}
            accessibilityRole="button"
            accessibilityLabel="Limpar filtros"
            hitSlop={6}
            style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 100, backgroundColor: colors.surface2 }}
          >
            <Text style={{ fontFamily: font.uiSemibold, fontSize: 13, color: colors.ink }}>Limpar</Text>
          </Pressable>
        </View>

        <FilterSection title="Avaliação">
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}
            accessibilityRole="radiogroup"
            accessibilityLabel="Nota mínima"
          >
            {RATING_STEPS.map((r) => (
              <Chip
                key={r}
                label={r === 0 ? 'Qualquer nota' : `${r.toFixed(1).replace('.', ',')}+`}
                icon={r === 0 ? undefined : 'star'}
                active={local.minRating === r}
                role="radio"
                a11yLabel={r === 0 ? 'Qualquer nota' : `Nota ${r.toFixed(1).replace('.', ',')} ou mais`}
                onPress={() => set({ minRating: r })}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip
              label="Selo Flui"
              iconElement={<Seal size={14} />}
              active={local.seloOnly}
              role="switch"
              a11yLabel="Somente pontos com Selo Flui"
              onPress={() => set({ seloOnly: !local.seloOnly })}
            />
          </View>
        </FilterSection>

        <FilterSection title="Tipo de conector">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CONNECTORS.map((c) => (
              <Chip key={c} label={c} icon="plug" active={local.connectors.includes(c)} role="switch" onPress={() => toggleConnector(c)} />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Potência mínima">
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            accessibilityRole="radiogroup"
            accessibilityLabel="Potência mínima em quilowatts"
          >
            {POWER_STEPS.map((p) => (
              <Chip
                key={p}
                label={p === 0 ? 'Todas' : `${p}+ kW`}
                active={local.power === p}
                role="radio"
                a11yLabel={p === 0 ? 'Qualquer potência' : `${p} quilowatts ou mais`}
                onPress={() => set({ power: p })}
              />
            ))}
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 8, color: colors.inkFaint }}>
            {local.power === 0 ? 'Qualquer potência' : `A partir de ${local.power} kW`}
          </Text>
        </FilterSection>

        <FilterSection title="Horário de funcionamento">
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            accessibilityRole="radiogroup"
            accessibilityLabel="Horário de funcionamento"
          >
            {HOURS_OPTS.map((h) => (
              <Chip
                key={h.id}
                label={h.label}
                icon={h.id !== 'any' ? 'clock' : undefined}
                active={local.hours === h.id}
                role="radio"
                onPress={() => set({ hours: h.id })}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Comodidades" last>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {AMEN_FILTER.map((a) => {
              const [icon, label] = AMEN[a];
              return (
                <Chip key={a} label={label} icon={icon} active={local.amenities.includes(a)} role="switch" onPress={() => toggleAmenity(a)} />
              );
            })}
          </View>
        </FilterSection>

        <Pressable
          onPress={() => onApply(local)}
          accessibilityRole="button"
          style={{
            marginTop: 4,
            marginBottom: 8,
            minHeight: 50,
            borderRadius: 100,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ fontFamily: font.uiSemibold, fontSize: 16, color: colors.primaryInk }}>
            Ver {live} {live === 1 ? 'ponto' : 'pontos'}
          </Text>
        </Pressable>
      </View>
    </ModalSheet>
  );
}

function FilterSection({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: last ? 8 : 22 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: colors.inkFaint,
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

// ---- ReportSheet ("+" fab: report a situation at/near a station) ----

const REPORT_TYPES: { id: string; icon: IconName; colorToken: 'ok' | 'busy' | 'off' | 'primary'; label: string }[] = [
  { id: 'livre', icon: 'check', colorToken: 'ok', label: 'Pontos livres' },
  { id: 'fila', icon: 'users', colorToken: 'busy', label: 'Fila / lotado' },
  { id: 'quebrado', icon: 'alert', colorToken: 'off', label: 'Fora do ar' },
  { id: 'preco', icon: 'dollar', colorToken: 'primary', label: 'Preço mudou' },
  { id: 'bloqueada', icon: 'car', colorToken: 'busy', label: 'Vaga bloqueada' },
  { id: 'foto', icon: 'camera', colorToken: 'primary', label: 'Adicionar foto' },
];

function ReportSheet({
  st,
  onClose,
  onDone,
}: {
  st?: Station;
  onClose: () => void;
  onDone: (r: (typeof REPORT_TYPES)[number]) => void;
}) {
  const { colors, font, space } = useTheme();
  const [sel, setSel] = useState<string | null>(null);

  return (
    <ModalSheet open onClose={onClose} label="Reportar situação">
      <View style={{ paddingHorizontal: space.pad, paddingTop: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.inkFaint, marginBottom: 4 }}>
          Reporte da comunidade
        </Text>
        <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: 23, marginBottom: 4, color: colors.ink }}>
          O que está rolando?
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 18, color: colors.inkSoft }}>
          {st ? st.name : 'Ponto próximo'} · ajude quem vem depois
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Tipo de reporte">
          {REPORT_TYPES.map((r) => {
            const on = sel === r.id;
            const c = colors[r.colorToken];
            return (
              <Pressable
                key={r.id}
                onPress={() => setSel(r.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={r.label}
                style={{
                  width: '31%',
                  minHeight: 90,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: 12,
                  borderRadius: space.radiusSm,
                  backgroundColor: on ? colors.primarySoft : colors.surface,
                  borderWidth: on ? 2 : 1.5,
                  borderColor: on ? colors.primary : colors.line,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: colors.surface2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={r.icon} size={20} color={c} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', textAlign: 'center', color: colors.ink }}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => sel && onDone(REPORT_TYPES.find((r) => r.id === sel)!)}
          disabled={!sel}
          accessibilityRole="button"
          accessibilityState={{ disabled: !sel }}
          style={{
            marginTop: 18,
            marginBottom: 8,
            minHeight: 50,
            borderRadius: 100,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            opacity: sel ? 1 : 0.5,
          }}
        >
          <Text style={{ fontFamily: font.uiSemibold, fontSize: 16, color: colors.primaryInk }}>Enviar reporte · +40 Watts</Text>
        </Pressable>
      </View>
    </ModalSheet>
  );
}

// ---- list view row + empty state ----

function ListRow({ st, onOpen }: { st: Station; onOpen: (st: Station) => void }) {
  const { colors, font, space } = useTheme();
  const avColor = colors[st.avail];
  return (
    <Pressable
      onPress={() => onOpen(st)}
      accessibilityRole="button"
      accessibilityLabel={`${st.name}, ${AVAIL[st.avail]}, ${st.free} de ${st.total} livres, ${st.dist}`}
      style={{
        flexDirection: 'row',
        gap: 12,
        padding: 12,
        marginBottom: 10,
        borderRadius: space.radius,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: 'center',
      }}
    >
      <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: colors.inkFaint }}>foto</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {st.selo > 0 && <Seal size={14} />}
          <Text numberOfLines={1} style={{ fontFamily: font.display, fontSize: 17, color: colors.inkSoft, flexShrink: 1 }}>
            {st.name}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 }}>
          <Stars n={st.rating} size={11} label={false} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{st.rating.toFixed(1)}</Text>
          <Text style={{ fontSize: 11, color: colors.inkFaint }}>· {st.dist}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: avColor }} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: avColor }}>
            {st.free}/{st.total} livres
          </Text>
          <Text
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              fontWeight: '700',
              color: colors.primary,
              backgroundColor: colors.primarySoft,
              paddingVertical: 3,
              paddingHorizontal: 8,
              borderRadius: 100,
              overflow: 'hidden',
            }}
          >
            {st.power} kW
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyResults({ onClear }: { onClear: () => void }) {
  const { colors, font, space } = useTheme();
  return (
    <View
      accessibilityRole="text"
      style={{ padding: 22, borderRadius: space.radius, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center' }}
    >
      <Icon name="search" size={30} color={colors.inkFaint} />
      <Text style={{ fontFamily: font.display, fontSize: 18, marginTop: 10, marginBottom: 4, color: colors.ink }}>
        Nenhum ponto com esses filtros
      </Text>
      <Text style={{ fontSize: 13.5, marginBottom: 14, color: colors.inkSoft, textAlign: 'center' }}>
        Tente ampliar a potência ou remover comodidades.
      </Text>
      <Pressable
        onPress={onClear}
        accessibilityRole="button"
        style={{ minHeight: 44, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 100, backgroundColor: colors.primary }}
      >
        <Text style={{ fontFamily: font.uiSemibold, fontSize: 14, color: colors.primaryInk }}>Limpar filtros</Text>
      </Pressable>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ink }}>{label}</Text>
    </View>
  );
}

// ---- MapScreen ----

export function MapScreen() {
  const { colors, font, showReports } = useTheme();
  const { pushToast } = useToast();
  const { favs, toggleFav } = useFavorites();

  const [active, setActive] = useState<string | null>(null);
  const [detail, setDetail] = useState(false);
  const [report, setReport] = useState<{ st?: Station } | null>(null);
  const [rate, setRate] = useState<{ st: Station } | null>(null);
  const [quick, setQuick] = useState<string[]>([]);
  const [adv, setAdv] = useState<Adv>(EMPTY_ADV);
  const [showFilters, setShowFilters] = useState(false);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'map' | 'list'>('map');
  const [recenter, setRecenter] = useState(0);
  const [event, setEvent] = useState<Report | null>(null);
  const [handoff, setHandoff] = useState<Station | null>(null);

  // Demo clock — matches the source's fixed status-bar time (9:41) used to
  // evaluate "aberto agora" style filters without a real clock dependency.
  const nowHour = 9;
  const listReady = useDelay(ROTA_CONFIG.latency.list, `${view}|${q}|${quick.join()}|${JSON.stringify(adv)}`);

  const toggleQuick = (id: string) => setQuick((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const term = q.trim().toLowerCase();
  const visible = useMemo(
    () =>
      DATA.stations.filter(
        (s) => matchAdv(s, adv, quick, nowHour) && (!term || s.name.toLowerCase().includes(term) || s.area.toLowerCase().includes(term))
      ),
    [adv, quick, term]
  );
  const advCount = countAdv(adv);
  const anyFilter = advCount + quick.length > 0;
  const activeSt = DATA.stations.find((s) => s.id === active) ?? null;
  const clearAll = () => {
    setQuick([]);
    setAdv(EMPTY_ADV);
    setQ('');
  };

  const openPin = (st: Station) => {
    setActive(st.id);
    setDetail(false);
  };
  const openDetail = () => setDetail(true);
  const close = () => {
    setActive(null);
    setDetail(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {view === 'map' ? (
        <GeoMapView
          stations={visible}
          active={active}
          onPin={openPin}
          onReport={(r) => {
            close();
            setEvent(r);
          }}
          showReports={showReports}
          recenterSignal={recenter}
        />
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.bg }}
          contentContainerStyle={{ paddingTop: 190, paddingHorizontal: 16, paddingBottom: 96 }}
        >
          {!listReady ? (
            <ListSkeleton rows={4} />
          ) : (
            <>
              <Text accessibilityLiveRegion="polite" style={{ fontSize: 13, marginBottom: 10, color: colors.inkFaint }}>
                {visible.length} pontos · ordenado por proximidade
              </Text>
              {visible.map((st) => (
                <ListRow key={st.id} st={st} onOpen={openPin} />
              ))}
              {!visible.length && <EmptyResults onClear={clearAll} />}
            </>
          )}
        </ScrollView>
      )}

      {/* top overlay: search + filters */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 14, paddingTop: 10 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 14,
            minHeight: 50,
            borderRadius: 100,
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.line,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Icon name="search" size={20} color={colors.inkFaint} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar em São Paulo"
            placeholderTextColor={colors.inkFaint}
            accessibilityLabel="Buscar ponto de recarga por nome ou bairro"
            autoCorrect={false}
            style={{ flex: 1, minHeight: 44, fontFamily: font.ui, fontSize: 15, color: colors.ink }}
          />
          {!!q && (
            <Pressable onPress={() => setQ('')} accessibilityRole="button" accessibilityLabel="Limpar busca" hitSlop={8}>
              <Icon name="x" size={14} color={colors.inkFaint} />
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: 100, padding: 2 }}>
            <Pressable
              onPress={() => setView('map')}
              accessibilityRole="button"
              accessibilityState={{ selected: view === 'map' }}
              accessibilityLabel="Ver no mapa"
              hitSlop={4}
              style={{ padding: 8, borderRadius: 100, backgroundColor: view === 'map' ? colors.surface : 'transparent' }}
            >
              <Icon name="map" size={16} color={view === 'map' ? colors.primary : colors.inkFaint} />
            </Pressable>
            <Pressable
              onPress={() => setView('list')}
              accessibilityRole="button"
              accessibilityState={{ selected: view === 'list' }}
              accessibilityLabel="Ver em lista"
              hitSlop={4}
              style={{ padding: 8, borderRadius: 100, backgroundColor: view === 'list' ? colors.surface : 'transparent' }}
            >
              <Icon name="layers" size={16} color={view === 'list' ? colors.primary : colors.inkFaint} />
            </Pressable>
          </View>
        </View>

        {/* Backing card for the chips + result-count row: with just the search
            pill above, these floated directly over the map with nothing behind
            them — fine for the chips' own pill backgrounds, but the plain text
            of the "N pontos encontrados / Limpar tudo" row (shown once a filter
            is active) had no backing at all and was hard to read over map
            imagery. Wrapping both in one surface card fixes that and reads as a
            single toolbar instead of loose floating pieces. */}
        <View
          style={{
            marginTop: 12, backgroundColor: colors.surface, borderRadius: 20, padding: 10,
            shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
          }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip
              label={`Filtros${advCount ? ` · ${advCount}` : ''}`}
              icon="filter"
              active={!!advCount}
              onPress={() => setShowFilters(true)}
              a11yLabel={`Abrir filtros${advCount ? `, ${advCount} ativos` : ''}`}
            />
            {QUICK.map((f) => (
              <Chip key={f.id} label={f.label} active={quick.includes(f.id)} role="switch" onPress={() => toggleQuick(f.id)} />
            ))}
          </ScrollView>

          {anyFilter && (
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 10, paddingTop: 10, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: colors.line,
              }}
            >
              <Text accessibilityLiveRegion="polite" style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkFaint }}>
                {visible.length} {visible.length === 1 ? 'ponto encontrado' : 'pontos encontrados'}
              </Text>
              <Pressable onPress={clearAll} accessibilityRole="button" accessibilityLabel="Limpar todos os filtros" hitSlop={6}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.primary }}>Limpar tudo</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {view === 'map' && !visible.length && (
        <View style={{ position: 'absolute', left: 20, right: 20, top: '38%' }} pointerEvents="box-none">
          <EmptyResults onClear={clearAll} />
        </View>
      )}

      {view === 'map' && !active && (
        <View style={{ position: 'absolute', right: 14, bottom: 22, gap: 12 }}>
          <Pressable
            onPress={() => pushToast('Camadas do mapa')}
            accessibilityRole="button"
            accessibilityLabel="Camadas do mapa"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <Icon name="layers" size={20} color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => setRecenter((r) => r + 1)}
            accessibilityRole="button"
            accessibilityLabel="Centralizar na minha localização"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <Icon name="crosshair" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => setReport({})}
            accessibilityRole="button"
            accessibilityLabel="Reportar situação em um ponto"
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Icon name="plus" size={26} color={colors.primaryInk} />
          </Pressable>
        </View>
      )}

      {view === 'map' && !active && (
        <View style={{ position: 'absolute', left: 14, bottom: 26 }}>
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 100,
              backgroundColor: colors.surface,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <LegendItem color={colors.ok} label="Livre" />
            <LegendItem color={colors.busy} label="Cheio" />
            <LegendItem color={colors.off} label="Off" />
          </View>
        </View>
      )}

      {active && activeSt && (
        <StationSheet
          st={activeSt}
          mode={detail ? 'detail' : 'peek'}
          onOpenDetail={openDetail}
          onClose={close}
          onNavigate={(s) => {
            close();
            setHandoff(s);
          }}
          onReport={(s) => setReport({ st: s })}
          onRate={(s) => setRate({ st: s })}
          fav={favs.has(activeSt.id)}
          onFav={(s) => toggleFav(s.id)}
        />
      )}
      {report && (
        <ReportSheet
          st={report.st}
          onClose={() => setReport(null)}
          onDone={(r) => {
            setReport(null);
            pushToast(`Reporte enviado · ${r.label}`, 'check');
          }}
        />
      )}
      {event && <EventSheet report={event} onClose={() => setEvent(null)} />}
      {showFilters && (
        <FilterSheet
          adv={adv}
          quick={quick}
          nowHour={nowHour}
          stations={DATA.stations}
          onClose={() => setShowFilters(false)}
          onApply={(v) => {
            setAdv(v);
            setShowFilters(false);
          }}
        />
      )}
      {rate && (
        <RateFlow
          target={rate.st}
          kind="station"
          onClose={() => setRate(null)}
          onDone={(r) => {
            setRate(null);
            pushToast(r.selo ? `Avaliação + indicação ao Selo Flui · +${r.watts} W` : `Avaliação publicada · +${r.watts} Watts`, 'check');
          }}
        />
      )}
      {handoff && <MapsHandoffSheet dest={handoff} onClose={() => setHandoff(null)} />}
    </View>
  );
}
