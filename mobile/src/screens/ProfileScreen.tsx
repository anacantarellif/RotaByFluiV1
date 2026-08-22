// Ported from project/app/screens-extra.jsx (`ProfileScreen`) — identity header,
// stats, car card, achievements grid, favorites list.
//
// Prop contract vs. the source: the source took `favs` (Set<stationId>) and
// `density` as props from the App-level state. Per PORTING_GUIDE.md, `favs` now
// comes from `useFavorites()` and `density` from `useTheme()` instead of being
// passed down.
//
// The source's "Configurações" button (`<button className="iconbtn"
// aria-label="Configurações"><Icon name="settings"/></button>`) was decorative —
// it had no onClick at all. In the web prototype the matching controls
// (dark mode, densidade, marcadores, reportes da comunidade) lived only in the
// design-tool dev overlay `frames/tweaks-panel.jsx`, which isn't shipped and
// isn't being ported as-is (see PORTING_GUIDE.md task 16 / docs/HANDOFF.md).
// Here the gear button opens a real `SettingsSheet` exposing those same knobs
// through `useTheme()`'s actual setters, so the equivalent functionality still
// ships in-app instead of only existing in the prototyping tool.
import React, { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MarkerStyle, useTheme } from '../theme/ThemeContext';
import { useFavorites } from '../state/FavoritesContext';
import { useCar } from '../state/CarContext';
import { useWatts } from '../state/WattsContext';
import { Icon } from '../components/icons/Icon';
import { AnimatedPressable } from '../components/motion/AnimatedPressable';
import { BrandMark } from '../components/BrandMark';
import { ModalSheet } from '../components/sheets/ModalSheet';
import { DATA } from '../data/data';
import { Density, ThemeMode } from '../theme/tokens';

export function ProfileScreen() {
  const { colors, font, space } = useTheme();
  const insets = useSafeAreaInsets();
  const { favs } = useFavorites();
  const { car, setCarId } = useCar();
  const { watts } = useWatts();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [carPickerOpen, setCarPickerOpen] = useState(false);

  const u = DATA.user;
  const favStations = DATA.stations.filter((s) => favs.has(s.id));
  const earnedCount = DATA.badges.filter((b) => b.earned).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: space.pad, paddingTop: Math.max(insets.top, 24) + 14, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* top bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <BrandMark size={22} />
          <AnimatedPressable
            onPress={() => setSettingsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Configurações"
            hitSlop={6}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="settings" size={20} color={colors.ink} />
          </AnimatedPressable>
        </View>

        {/* identity */}
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 18 }}>
          <View>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: colors.surface3,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessible
              accessibilityRole="image"
              accessibilityLabel={`Avatar de ${u.name}`}
            >
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.primarySoftInk }}>{u.initials}</Text>
            </View>
            <View
              style={{
                position: 'absolute',
                bottom: -6,
                left: '50%',
                marginLeft: -22,
                paddingVertical: 3,
                paddingHorizontal: 9,
                borderRadius: 100,
                backgroundColor: colors.goldSoft,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.goldInk }}>Nv {u.level}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: 26, fontWeight: '600', color: colors.ink }}>
              {u.name}
            </Text>
            <Text style={{ fontSize: 14, color: colors.inkSoft }}>
              {u.title} · {u.handle}
            </Text>
            <Text style={{ fontFamily: font.mono, fontSize: 13, fontWeight: '600', color: colors.primary, marginTop: 4 }}>
              {watts.toLocaleString('pt-BR')} Watts
            </Text>
          </View>
        </View>

        {/* stats */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            backgroundColor: colors.surface,
            borderRadius: space.radius,
            padding: 16,
            marginBottom: 16,
          }}
        >
          {(
            [
              [u.contributions, 'contrib.'],
              [u.reviews, 'avaliações'],
              [u.photos, 'fotos'],
              [u.reports, 'reportes'],
            ] as [number, string][]
          ).map(([n, l], i) => (
            <React.Fragment key={l}>
              {i > 0 && <View style={{ width: 1, backgroundColor: colors.line }} />}
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: font.display, fontSize: 22, fontWeight: '600', color: colors.ink }}>{n}</Text>
                <Text style={{ fontSize: 11, color: colors.inkFaint, marginTop: 2 }}>{l}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* car */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            backgroundColor: colors.surface,
            borderRadius: space.radius,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="car" size={26} color={colors.primarySoftInk} />
          </View>
          <View style={{ flex: 1 }}>
            {/* Real selected car (useCar()) instead of the source's hardcoded `u.car`
                string + hardcoded spec line — every route/trip/charge-time estimate in
                the app reads this same car, so the profile has to reflect it for real. */}
            <Text style={{ fontWeight: '700', fontSize: 16, color: colors.ink }}>
              {car.brand} {car.model}
            </Text>
            <Text style={{ fontFamily: font.mono, fontSize: 12, color: colors.inkFaint }}>
              {car.battery} kWh · {car.connector} · {car.range} km
            </Text>
          </View>
          <AnimatedPressable
            onPress={() => setCarPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Trocar carro"
            hitSlop={6}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minHeight: 44,
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: 100,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Icon name="edit" size={14} color={colors.inkSoft} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkSoft }}>Trocar</Text>
          </AnimatedPressable>
        </View>

        {/* achievements */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.inkFaint }}>
            Conquistas
          </Text>
          <Text style={{ fontSize: 12, color: colors.inkFaint }}>
            {earnedCount}/{DATA.badges.length}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
          {DATA.badges.map((b) => (
            <View
              key={b.id}
              style={{ width: '22%', alignItems: 'center', gap: 6 }}
              accessible
              accessibilityLabel={`Conquista: ${b.name}, ${b.earned ? 'desbloqueada' : 'bloqueada'}`}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: b.earned ? colors.goldSoft : colors.surface2,
                  borderWidth: b.earned ? 1.5 : 1,
                  borderColor: b.earned ? colors.gold : colors.line,
                }}
              >
                <Icon name={b.icon} size={24} color={b.earned ? colors.goldInk : colors.inkFaint} />
              </View>
              <Text
                style={{ fontSize: 10.5, fontWeight: '600', color: b.earned ? colors.ink : colors.inkFaint, textAlign: 'center', lineHeight: 13 }}
              >
                {b.name}
              </Text>
            </View>
          ))}
        </View>

        {/* favorites */}
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.inkFaint, marginBottom: 12 }}>
          Favoritos ({favStations.length})
        </Text>
        {favStations.length === 0 ? (
          <View
            style={{
              alignItems: 'center',
              padding: 18,
              borderRadius: space.radius,
              backgroundColor: colors.surface,
            }}
          >
            <Icon name="heart" size={26} color={colors.inkFaint} />
            <Text style={{ fontSize: 14, color: colors.inkSoft, marginTop: 8, textAlign: 'center' }}>
              Toque no ♥ de um ponto para salvar aqui.
            </Text>
          </View>
        ) : (
          favStations.map((s) => (
            <View
              key={s.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: colors.surface,
                borderRadius: space.radius,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <View
                style={{ width: 50, height: 50, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`Foto do ponto ${s.name}`}
              >
                <Text style={{ fontSize: 9, color: colors.inkFaint, textTransform: 'uppercase' }}>foto</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: colors.ink }}>{s.name}</Text>
                <Text style={{ fontSize: 12, color: colors.inkFaint }}>
                  {s.area} · {s.dist}
                </Text>
              </View>
              <Icon name="heart" size={20} fill={colors.off} color={colors.off} />
            </View>
          ))
        )}
      </ScrollView>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CarPickerSheet
        open={carPickerOpen}
        selectedId={car.id}
        onClose={() => setCarPickerOpen(false)}
        onPick={(id) => {
          setCarId(id);
          setCarPickerOpen(false);
        }}
      />
    </View>
  );
}

// ---- car picker (new — the source's "Trocar" button was decorative; this is what
// makes DATA.cars actually reachable after onboarding, so a driver can correct or
// change their car and have every route/charge-time estimate follow) ----

function CarPickerSheet({
  open,
  selectedId,
  onClose,
  onPick,
}: {
  open: boolean;
  selectedId: string;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const { colors, font, space } = useTheme();
  if (!open) return null;
  return (
    <ModalSheet open={open} onClose={onClose} snapPoints={['70%']} label="Trocar carro">
      <View style={{ paddingHorizontal: space.pad, paddingTop: 4, gap: 14 }}>
        <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: 22, fontWeight: '600', color: colors.ink }}>
          Qual é o seu carro?
        </Text>
        <View style={{ gap: 10 }}>
          {DATA.cars.map((c) => {
            const selected = c.id === selectedId;
            return (
              <AnimatedPressable
                key={c.id}
                onPress={() => onPick(c.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${c.brand} ${c.model}, ${c.battery} kWh, ${c.range} km de alcance, conector ${c.connector}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  borderRadius: space.radiusSm,
                  backgroundColor: selected ? colors.primarySoft : colors.surface,
                  borderWidth: selected ? 2 : 1.5,
                  borderColor: selected ? colors.primary : colors.line,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: colors.surface2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="car" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 15, color: colors.ink }}>
                    {c.brand} {c.model}
                  </Text>
                  <Text style={{ fontFamily: font.mono, fontSize: 11, color: colors.inkFaint, marginTop: 2 }}>
                    {c.battery} kWh · {c.range} km · {c.connector} · AC {c.ackw} kW / DC {c.dckw} kW
                  </Text>
                </View>
                {selected && <Icon name="checkCircle" size={22} color={colors.primary} fill={colors.primarySoft} />}
              </AnimatedPressable>
            );
          })}
        </View>
      </View>
    </ModalSheet>
  );
}

// ---- settings sheet (real equivalent of the design-tool-only Tweaks panel) ----

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.inkFaint }}>
      {children}
    </Text>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const { colors, font } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{label}</Text>
      <View
        style={{ flexDirection: 'row', backgroundColor: colors.surface3, borderRadius: 12, padding: 3, gap: 3 }}
        accessibilityRole="tablist"
        accessibilityLabel={label}
      >
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <AnimatedPressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              style={{
                flex: 1,
                minHeight: 38,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 9,
                paddingVertical: 8,
                paddingHorizontal: 4,
                backgroundColor: selected ? colors.surface : 'transparent',
              }}
            >
              <Text
                style={{ fontFamily: font.uiSemibold, fontSize: 13, fontWeight: '700', color: selected ? colors.ink : colors.inkSoft }}
                numberOfLines={1}
              >
                {o.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors, font } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 44 }}>
      <Text style={{ fontFamily: font.uiSemibold, fontSize: 14, fontWeight: '700', color: colors.ink, flex: 1 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityLabel={label}
        trackColor={{ false: colors.surface3, true: colors.primary }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { colors, font, space, themePreference, setThemePreference, density, setDensity, markers, setMarkers, showReports, setShowReports } =
    useTheme();

  if (!open) return null;

  return (
    <ModalSheet open={open} onClose={onClose} snapPoints={['64%']} label="Configurações">
      <View style={{ paddingHorizontal: space.pad, paddingTop: 4, gap: 22 }}>
        <Text accessibilityRole="header" style={{ fontFamily: font.display, fontSize: 22, fontWeight: '600', color: colors.ink }}>
          Configurações
        </Text>

        <View style={{ gap: 16 }}>
          <SectionLabel>Aparência</SectionLabel>
          <Segmented<ThemeMode | 'system'>
            label="Tema"
            value={themePreference}
            onChange={setThemePreference}
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Escuro' },
              { value: 'system', label: 'Sistema' },
            ]}
          />
          <Segmented<Density>
            label="Densidade"
            value={density}
            onChange={setDensity}
            options={[
              { value: 'compact', label: 'Compacta' },
              { value: 'regular', label: 'Regular' },
              { value: 'comfy', label: 'Confortável' },
            ]}
          />
        </View>

        <View style={{ gap: 16 }}>
          <SectionLabel>Mapa</SectionLabel>
          <Segmented<MarkerStyle>
            label="Marcadores"
            value={markers}
            onChange={setMarkers}
            options={[
              { value: 'pin', label: 'Pino' },
              { value: 'dot', label: 'Ponto' },
            ]}
          />
          <SwitchRow label="Reportes da comunidade" value={showReports} onChange={setShowReports} />
        </View>
      </View>
    </ModalSheet>
  );
}
