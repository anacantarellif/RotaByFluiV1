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
import { View } from 'react-native';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';
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

// ReportPin (below) still uses the CSS-style "rotated square" balloon trick
// ported from project/app/styles.css `.report .bubble` — a square rotated 45°
// with three rounded corners and one near-sharp corner, outlined in the
// report's color on a plain surface background. RN's `rotate` transform
// doesn't resize the element's own *measured* layout box, so a naive
// side×side wrapper clips the rotated diamond's overflow; `diamondBox` below
// sizes the wrapper to the shape's true diagonal (side × √2) instead, and
// `collapsable={false}` keeps that wrapper from being optimized out of the
// native view tree react-native-maps measures (Android can otherwise strip a
// purely-layout View with no background/border of its own, silently
// reverting to the original clipping bug). Never reported broken for
// ReportPin specifically, so it's untouched — StationPin (below) moved off
// this trick entirely in favor of a real SVG pin shape (see PinShape), which
// has no rotated/scaled content to overflow its box in the first place.
function diamondBox(side: number) {
  return Math.ceil(side * Math.SQRT2);
}

// Real map-pin silhouette (path from the reference SVG the ponto shape was
// asked to match), replacing the rotated-diamond balloon StationPin used to
// draw. An SVG element's own width/height *is* exactly what's drawn — no
// rotated or scaled content that can overflow its measured box the way the
// diamond trick's `rotate` (and the map's pulse ring's `scale`) repeatedly
// did, so this sidesteps that entire class of clipping bug rather than
// working around it. Filled with the surface color and stroked in the
// station's status color, matching the outline-on-surface look the app's
// other markers already use — same look, real pin shape.
const PIN_PATH =
  'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0';

function PinShape({ size, color, fill }: { size: number; color: string; fill: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PIN_PATH} fill={fill} stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <SvgCircle cx={12} cy={10} r={3} fill={fill} stroke={color} strokeWidth={2} />
    </Svg>
  );
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

  // The crown badge used to be a conditionally-rendered sibling
  // ({st.selo > 0 && <Seal/>}), which means a selo'd station's marker has a
  // taller total layout (crown + gap + pin) than one without — a different
  // tree shape per marker instance, not just different content. Reported
  // clipping correlated exactly with that: every cut pin had a crown, every
  // intact one didn't. react-native-maps' Android SizeReportingShadowNode
  // reports each marker's measured width/height back to the native side
  // after its own layout pass — asymmetric conditional content is exactly
  // the kind of thing that can end up measured inconsistently between
  // instances. Now every station marker (selo or not) renders the *same*
  // tree — the crown slot is always present and always reserves the same
  // space, only its opacity toggles — so there's no per-instance structural
  // difference left for a stale or inconsistent measurement to hide in.
  const CROWN_SIZE = 16;
  const CROWN_GAP = markerStyle === 'dot' ? -4 : 2;

  if (markerStyle === 'dot') {
    // `.rota[data-markers="dot"] .pin .body`: same outline-on-surface styling,
    // just a plain circle instead of the rotated balloon — circles don't
    // overflow their own bounding box, so no wrapper box needed here.
    return (
      <View style={{ alignItems: 'center' }} collapsable={false}>
        <View style={{ marginBottom: CROWN_GAP, opacity: st.selo > 0 ? 1 : 0 }}>
          <Seal size={CROWN_SIZE} />
        </View>
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
      <View style={{ marginBottom: CROWN_GAP, opacity: st.selo > 0 ? 1 : 0 }}>
        <Seal size={CROWN_SIZE} />
      </View>
      <PinShape size={side} color={borderColor} fill={colors.surface} />
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
