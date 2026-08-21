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
// RN's `rotate` transform doesn't resize the element's own layout box — a 38×38
// square rotated 45° paints a ~54×54 diamond, visually overflowing its own
// unrotated 38×38 box by ~8px on every side. react-native-maps measures a
// Marker's child by that *unrotated layout* box to build its native marker
// bitmap, so anything painted outside it (here, the diamond's bottom tip) gets
// clipped off (reported: "os pins estão com a extremidade inferior cortada").
// Fix: give the rotated shape its own wrapper box sized to its true diagonal
// (side * √2) instead of the unrotated side length, so nothing it paints falls
// outside that box's bounds. `diamondBox` below does that; the crown sits as a
// normal (non-absolute) sibling above it so it's included in Marker's
// measurement too, rather than an absolutely-positioned overlay that would
// reintroduce the same clipping.
//
// That fix alone still left the bottom tip visibly cut off, because
// diamondBox() is the *tightest* box that contains the diamond — its four
// tangent points (top/bottom/left/right) touch the box edge with zero
// margin. The pin bodies used to carry a drop shadow (shadowOffset pushing it
// down + shadowRadius blur, plus Android's own `elevation` shadow), which
// paints past the shape's edge — exactly the region this box has no room
// for, worst at the bottom where the offset adds to the blur. Marker
// rasterizes to this *measured layout* box, so that shadow got clipped at
// its edge. Padding the box to make room would mean the anchor ({x:0.5,
// y:1}, GeoMapView.tsx) — deliberately kept as the simple bottom-of-shape
// fraction so it stays correct across active/inactive sizes and the crown —
// would need to move to a fraction below 1.0, throwing off exactly where the
// pin points on the map. Fixed that by dropping the shadow — same issue for
// the 'dot' style below (its box is the circle's own exact size, same zero
// margin) and for ReportPin.
//
// Still reported cut off after BOTH of those fixes, despite the JS layout
// math being correct on paper — which points at a third, more fundamental
// cause: Android's view-flattening. RN can strip a purely-layout wrapper
// View (no background/border/other visual property of its own — exactly
// what the `box`-sized View below is) out of the *native* view tree it hands
// to renderers, even though it's still present in the JS/React tree. If
// react-native-maps' Android snapshot code measures that flattened native
// tree rather than React's layout tree, the wrapper's carefully-computed
// diamondBox() size could simply not exist by the time the bitmap is
// captured — silently reverting to the rotated shape's own unrotated
// `side × side` box (the original bug) no matter how correct the JS-side fix
// looks. `collapsable={false}` on that wrapper (and ReportPin's) forces RN to
// keep it as a real, independently measurable native node instead of
// optimizing it away.
function diamondBox(side: number) {
  return Math.ceil(side * Math.SQRT2);
}

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
  // Status color (ok/busy/off) always stays on the pin's outline — an earlier
  // version swapped it for gold whenever the station had a Selo Flui, which
  // hid a busy/off status behind the badge color. The crown above already
  // signals "has a selo"; the border's job is purely the live status.
  const borderColor = colors[AVAIL_COLOR_KEY[st.avail]];
  const side = active ? 42 : 38;
  const box = diamondBox(side);

  if (markerStyle === 'dot') {
    // `.rota[data-markers="dot"] .pin .body`: same outline-on-surface styling,
    // just a plain circle instead of the rotated balloon — circles don't
    // overflow their own bounding box, so no wrapper box needed here.
    return (
      <View style={{ alignItems: 'center' }} collapsable={false}>
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
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center' }} collapsable={false}>
      {st.selo > 0 && (
        <View style={{ marginBottom: 2 }}>
          <Seal size={16} />
        </View>
      )}
      <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }} collapsable={false}>
        <View
          style={{
            width: side, height: side,
            borderTopLeftRadius: side / 2, borderTopRightRadius: side / 2, borderBottomRightRadius: 4, borderBottomLeftRadius: side / 2,
            backgroundColor: colors.surface, borderWidth: 2.5, borderColor,
            alignItems: 'center', justifyContent: 'center',
            transform: [{ rotate: '45deg' }],
          }}
        >
          <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '700', transform: [{ rotate: '-45deg' }] }}>{st.power}</Text>
        </View>
      </View>
    </View>
  );
}

export function ReportPin({ r }: { r: Report }) {
  const { colors } = useTheme();
  const color = colors[r.colorToken];
  const side = 30;
  const box = diamondBox(side);
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }} collapsable={false}>
      <View
        style={{
          width: side, height: side,
          borderTopLeftRadius: side / 2, borderTopRightRadius: side / 2, borderBottomRightRadius: 2, borderBottomLeftRadius: side / 2,
          backgroundColor: colors.surface,
          alignItems: 'center', justifyContent: 'center',
          transform: [{ rotate: '45deg' }],
        }}
      >
        <View style={{ transform: [{ rotate: '-45deg' }] }}>
          <Icon name={r.icon} size={15} color={color} />
        </View>
      </View>
    </View>
  );
}
