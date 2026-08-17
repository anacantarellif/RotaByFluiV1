// Shared marker markup for GeoMapView — ported from project/app/gmap.jsx
// (StationPin, ReportPin, pinLabel). Kept as plain Views so both the map marker
// and any legacy static-map usage render identically.
import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Icon, Seal } from '../icons/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { Station, Report } from '../../data/types';

const AVAIL_TXT: Record<string, string> = { ok: 'disponível', busy: 'movimentado', off: 'indisponível' };

export function pinLabel(st: Station) {
  return (
    `${st.name}, ${st.area}. ${st.power} kW, ${st.free} de ${st.total} pontos livres, ${AVAIL_TXT[st.avail]}` +
    (st.selo > 0 ? `, ${st.selo} ${st.selo === 1 ? 'selo' : 'selos'} Flui` : '') +
    `. ${st.dist}`
  );
}

const AVAIL_COLOR_KEY: Record<string, 'ok' | 'busy' | 'off'> = { ok: 'ok', busy: 'busy', off: 'off' };

export function StationPin({
  st,
  active,
  onPress,
  markerStyle = 'pin',
}: {
  st: Station;
  active?: boolean;
  onPress: (st: Station) => void;
  markerStyle?: 'pin' | 'dot';
}) {
  const { colors } = useTheme();
  const availColor = colors[AVAIL_COLOR_KEY[st.avail]];

  if (markerStyle === 'dot') {
    return (
      <Pressable
        onPress={() => onPress(st)}
        accessibilityRole="button"
        accessibilityLabel={pinLabel(st)}
        accessibilityState={{ selected: !!active }}
        hitSlop={10}
        style={{
          width: active ? 22 : 16,
          height: active ? 22 : 16,
          borderRadius: 11,
          backgroundColor: availColor,
          borderWidth: 2,
          borderColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {st.selo > 0 && (
          <View style={{ position: 'absolute', top: -10 }}>
            <Seal size={12} />
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(st)}
      accessibilityRole="button"
      accessibilityLabel={pinLabel(st)}
      accessibilityState={{ selected: !!active }}
      hitSlop={6}
      style={{ alignItems: 'center', minWidth: 44, minHeight: 44, justifyContent: 'flex-end' }}
    >
      {st.selo > 0 && (
        <View style={{ marginBottom: -6, zIndex: 1 }}>
          <Seal size={16} />
        </View>
      )}
      <View
        style={{
          minWidth: active ? 42 : 36,
          height: active ? 42 : 36,
          paddingHorizontal: 6,
          borderRadius: 12,
          backgroundColor: availColor,
          borderWidth: 2.5,
          borderColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
          transform: [{ scale: active ? 1.12 : 1 }],
        }}
      >
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{st.power}</Text>
      </View>
      <View
        style={{
          width: 0, height: 0, marginTop: -1,
          borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: availColor,
        }}
      />
    </Pressable>
  );
}

export function ReportPin({ r, onPress }: { r: Report; onPress?: (r: Report) => void }) {
  const { colors } = useTheme();
  const color = colors[r.colorToken];
  const inner = (
    <>
      <View
        style={{
          width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1.5, borderColor: color,
          shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 3, elevation: 3,
        }}
      >
        <Icon name={r.icon} size={15} color={color} />
      </View>
      <View
        style={{
          width: 0, height: 0, alignSelf: 'center', marginTop: -1,
          borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 5,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color,
        }}
      />
    </>
  );
  if (!onPress) return <View style={{ alignItems: 'center' }}>{inner}</View>;
  return (
    <Pressable
      onPress={() => onPress(r)}
      accessibilityRole="button"
      accessibilityLabel={`Reporte da comunidade: ${r.label}, há ${r.when}. Toque para ver detalhes`}
      hitSlop={8}
      style={{ alignItems: 'center', minWidth: 44, minHeight: 44, justifyContent: 'center' }}
    >
      {inner}
    </Pressable>
  );
}
