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

// Exact shape from project/app/styles.css `.pin .body` / `.report .bubble`: a
// square rotated 45° with three rounded corners and one near-sharp corner —
// the classic CSS "map balloon" trick (`border-radius: 50% 50% 4px 50%` then
// `rotate(45deg)`), outlined in the state color on a plain surface background
// (not filled solid), content counter-rotated back upright inside. RN has no
// percentage border-radius, so the corners are pre-computed for each fixed
// size below. An earlier version of this file used a filled rounded-badge +
// separate triangle instead — visually a different mark from the design
// reference, not just smaller — this replaces it with the actual shape.
//
// Sized somewhat larger than a stock Google Maps pin (~24-28px) so Flui's own
// points read as clearly distinct from the basemap's own POI icons, while
// keeping the reference's proportions and outline styling.
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
  const borderColor = st.selo > 0 ? colors.gold : availColor;

  if (markerStyle === 'dot') {
    // `.rota[data-markers="dot"] .pin .body`: same outline-on-surface styling,
    // just a plain circle instead of the rotated balloon.
    return (
      <View style={{ alignItems: 'center' }}>
        {st.selo > 0 && (
          <View style={{ marginBottom: -4 }}>
            <Seal size={16} />
          </View>
        )}
        <View
          style={{
            width: active ? 31 : 26, height: active ? 31 : 26, borderRadius: 16,
            backgroundColor: colors.surface, borderWidth: 3, borderColor,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 6,
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      {st.selo > 0 && (
        <View style={{ marginBottom: 2 }}>
          <Seal size={16} />
        </View>
      )}
      <View
        style={{
          width: 38, height: 38,
          borderTopLeftRadius: 19, borderTopRightRadius: 19, borderBottomRightRadius: 4, borderBottomLeftRadius: 19,
          backgroundColor: colors.surface, borderWidth: 2.5, borderColor,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6,
          transform: [{ rotate: '45deg' }, { scale: active ? 1.18 : 1 }],
        }}
      >
        <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '700', transform: [{ rotate: '-45deg' }] }}>{st.power}</Text>
      </View>
    </View>
  );
}

export function ReportPin({ r }: { r: Report }) {
  const { colors } = useTheme();
  const color = colors[r.colorToken];
  return (
    <View
      style={{
        width: 30, height: 30,
        borderTopLeftRadius: 15, borderTopRightRadius: 15, borderBottomRightRadius: 2, borderBottomLeftRadius: 15,
        backgroundColor: colors.surface,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 5,
        transform: [{ rotate: '45deg' }],
      }}
    >
      <View style={{ transform: [{ rotate: '-45deg' }] }}>
        <Icon name={r.icon} size={15} color={color} />
      </View>
    </View>
  );
}
