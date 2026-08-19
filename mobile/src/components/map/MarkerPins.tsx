// Shared marker markup for GeoMapView — ported from project/app/gmap.jsx
// (StationPin, ReportPin, pinLabel).
//
// These render as *children* of a react-native-maps <Marker> — the interactive
// element. Nesting a second touchable (Pressable/TouchableOpacity) inside a
// Marker's children is a known react-native-maps footgun: on Android the marker
// content gets rasterized into a native bitmap overlay, so taps landing on the
// inner touchable often don't reach it reliably (reported as "a ficha do ponto
// não abre" — tapping a pin felt unresponsive). These are now plain, non-touchable
// Views; the single source of truth for "pin tapped" is the <Marker onPress>
// in GeoMapView.tsx, which fires the OS-level marker tap directly.
import React from 'react';
import { View, Text } from 'react-native';
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

// Sizing: deliberately larger than a stock Google Maps pin (~24-28px tall) so
// Flui's own points of interest read as clearly distinct from the basemap's own
// POI icons at a glance — a explicit ask, not just a visual preference.
export function StationPin({
  st,
  active,
  markerStyle = 'pin',
}: {
  st: Station;
  active?: boolean;
  markerStyle?: 'pin' | 'dot';
}) {
  const { colors } = useTheme();
  const availColor = colors[AVAIL_COLOR_KEY[st.avail]];

  if (markerStyle === 'dot') {
    return (
      <View
        style={{
          width: active ? 30 : 24,
          height: active ? 30 : 24,
          borderRadius: 15,
          backgroundColor: availColor,
          borderWidth: 3,
          borderColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {st.selo > 0 && (
          <View style={{ position: 'absolute', top: -14 }}>
            <Seal size={16} />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', minWidth: 48, justifyContent: 'flex-end' }}>
      {st.selo > 0 && (
        <View style={{ marginBottom: -8, zIndex: 1 }}>
          <Seal size={20} />
        </View>
      )}
      <View
        style={{
          minWidth: active ? 56 : 48,
          height: active ? 56 : 48,
          paddingHorizontal: 8,
          borderRadius: 16,
          backgroundColor: availColor,
          borderWidth: 3,
          borderColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.28,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 2 },
          elevation: 5,
          transform: [{ scale: active ? 1.12 : 1 }],
        }}
      >
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{st.power}</Text>
      </View>
      <View
        style={{
          width: 0, height: 0, marginTop: -1,
          borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 8,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: availColor,
        }}
      />
    </View>
  );
}

export function ReportPin({ r }: { r: Report }) {
  const { colors } = useTheme();
  const color = colors[r.colorToken];
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: color,
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
        }}
      >
        <Icon name={r.icon} size={19} color={color} />
      </View>
      <View
        style={{
          width: 0, height: 0, alignSelf: 'center', marginTop: -1,
          borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color,
        }}
      />
    </View>
  );
}
