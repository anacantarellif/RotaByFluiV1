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
import Svg, { Circle as SvgCircle, G, Path } from 'react-native-svg';
import { Icon } from '../icons/Icon';
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

// Selo Flui badge, inlined from Icon.tsx's <Seal> (its outer ring + bolt
// paths, 27×27 viewBox) instead of rendering that component's own <Svg>.
// Reported: with the crown as a *second*, separate react-native-svg <Svg>
// stacked above the pin's <Svg> in one marker, EVERY station pin got
// clipped to its top arc — including ones without a selo, once an earlier
// fix made the crown slot always present (just opacity-toggled) so every
// pin shared one tree shape. That ruled out "conditional layout" as the
// cause: two separate native <Svg> root views stacked inside one marker is
// what breaks, regardless of visibility — each is its own custom-shadow-node
// native component (react-native-svg's), nested inside react-native-maps'
// own custom SizeReportingShadowNode marker view, and two different
// libraries' custom shadow node types don't appear to compose reliably
// there. A single <Svg> (ReportPin's one <Icon>, or a selo-less pin before
// the crown-always-present change) always rendered fine. Fix: one <Svg> per
// marker, period — crown and pin drawn as two <G> groups inside it instead
// of two separate <Svg> elements.
const CROWN_RING_PATH =
  'M14.8627 24.8277C13.9777 25.6995 12.5585 25.7047 11.667 24.8397L9.99827 23.2204C9.57176 22.8065 9.00082 22.575 8.40651 22.575H6.19392C4.93156 22.575 3.90821 21.5517 3.90821 20.2893V18.0968C3.90821 17.4906 3.6674 16.9092 3.23874 16.4805L1.61612 14.8579C0.723495 13.9653 0.723495 12.5181 1.61612 11.6254L3.23874 10.0028C3.6674 9.57415 3.90821 8.99277 3.90821 8.38656V6.19405C3.90821 4.93168 4.93156 3.90833 6.19393 3.90833H8.39141C8.99468 3.90833 9.57348 3.66984 10.0016 3.24486L11.6484 1.61027C12.5444 0.720949 13.9916 0.72635 14.8809 1.62233L16.4794 3.2328C16.9085 3.66516 17.4925 3.90833 18.1017 3.90833H20.2892C21.5515 3.90833 22.5749 4.93168 22.5749 6.19405V8.38656C22.5749 8.99277 22.8157 9.57415 23.2443 10.0028L24.867 11.6254C25.7596 12.5181 25.7596 13.9653 24.867 14.8579L23.2443 16.4805C22.8157 16.9092 22.5749 17.4906 22.5749 18.0968V20.2893C22.5749 21.5517 21.5515 22.575 20.2892 22.575H18.0865C17.4863 22.575 16.9102 22.8111 16.4826 23.2323L14.8627 24.8277Z';
const CROWN_BOLT_PATH = 'M12.9012 14.7002V19.0752L17.3248 11.7836H14.1651V7.40857L9.74146 14.7002H12.9012Z';
// Crown drawn at 10×10 units centered above a 24-wide pin, with a 1-unit gap.
const CROWN_UNIT = 10;
const CROWN_GAP_UNIT = 1;
const CROWN_SCALE = CROWN_UNIT / 27;
const CROWN_X_OFFSET = (24 - CROWN_UNIT) / 2;

function PinShape({
  size,
  color,
  fill,
  selo,
  goldColor,
}: {
  size: number;
  color: string;
  fill: string;
  selo: boolean;
  goldColor: string;
}) {
  const totalUnits = selo ? CROWN_UNIT + CROWN_GAP_UNIT + 24 : 24;
  const height = (size * totalUnits) / 24;
  const pinY = selo ? CROWN_UNIT + CROWN_GAP_UNIT : 0;

  return (
    <Svg width={size} height={height} viewBox={`0 0 24 ${totalUnits}`}>
      {selo && (
        <G transform={`translate(${CROWN_X_OFFSET}, 0) scale(${CROWN_SCALE})`}>
          <Path d={CROWN_RING_PATH} fill={goldColor} />
          <Path d={CROWN_BOLT_PATH} fill={fill} />
        </G>
      )}
      <G transform={`translate(0, ${pinY})`}>
        <Path d={PIN_PATH} fill={fill} stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <SvgCircle cx={12} cy={10} r={3} fill={fill} stroke={color} strokeWidth={2} />
      </G>
    </Svg>
  );
}

// 'dot' style's crown + circle, merged the same way as PinShape above and
// for the same reason: two separate <Svg> root elements stacked in one
// marker is what broke, not the circle/crown content itself. The circle
// used to be a plain (non-SVG) View, which alone was never reported broken
// — but rebuilding it as one shared <Svg> with the crown removes any doubt
// and keeps both marker styles on the same safe pattern.
function DotShape({ size, color, fill, selo, goldColor }: { size: number; color: string; fill: string; selo: boolean; goldColor: string }) {
  const DOT_UNIT = 24; // arbitrary unit circle diameter, matched to CROWN_UNIT's 24-wide reference
  const totalUnits = selo ? CROWN_UNIT + CROWN_GAP_UNIT + DOT_UNIT : DOT_UNIT;
  const height = (size * totalUnits) / DOT_UNIT;
  const dotY = selo ? CROWN_UNIT + CROWN_GAP_UNIT : 0;
  const r = DOT_UNIT / 2 - 2;

  return (
    <Svg width={size} height={height} viewBox={`0 0 ${DOT_UNIT} ${totalUnits}`}>
      {selo && (
        <G transform={`translate(${CROWN_X_OFFSET}, 0) scale(${CROWN_SCALE})`}>
          <Path d={CROWN_RING_PATH} fill={goldColor} />
          <Path d={CROWN_BOLT_PATH} fill={fill} />
        </G>
      )}
      <SvgCircle cx={DOT_UNIT / 2} cy={dotY + DOT_UNIT / 2} r={r} fill={fill} stroke={color} strokeWidth={3} />
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
  const hasSelo = st.selo > 0;

  if (markerStyle === 'dot') {
    return (
      <View collapsable={false}>
        <DotShape size={active ? 31 : 26} color={borderColor} fill={colors.surface} selo={hasSelo} goldColor={colors.gold} />
      </View>
    );
  }

  return (
    <View collapsable={false}>
      <PinShape size={active ? 42 : 38} color={borderColor} fill={colors.surface} selo={hasSelo} goldColor={colors.gold} />
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
