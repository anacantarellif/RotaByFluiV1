// Ported from project/app/icons.jsx — line icon set + Flui seal glyph.
import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';

const P: Record<string, string> = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM21 21l-4.3-4.3',
  nav: 'M3 11l18-8-8 18-2-8-8-2Z',
  crosshair: 'M12 3v3M12 18v3M3 12h3M18 12h3 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  layers: 'M12 3 3 8l9 5 9-5-9-5ZM3 14l9 5 9-5M3 11l9 5 9-5',
  sliders: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5 M14 4v4M6 10v4M11 16v4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  x: 'M6 6l12 12M18 6 6 18',
  chevR: 'M9 6l6 6-6 6',
  chevL: 'M15 6l-6 6 6 6',
  chevD: 'M6 9l6 6 6-6',
  chevU: 'M6 15l6-6 6 6',
  heart: 'M2 9.50001C2.00002 8.38721 2.33759 7.30059 2.96813 6.38367C3.59867 5.46675 4.49252 4.76267 5.53161 4.36441C6.5707 3.96615 7.70616 3.89245 8.78801 4.15305C9.86987 4.41365 10.8472 4.99629 11.591 5.82401C11.6434 5.88002 11.7067 5.92468 11.7771 5.95521C11.8474 5.98574 11.9233 6.00149 12 6.00149C12.0767 6.00149 12.1526 5.98574 12.2229 5.95521C12.2933 5.92468 12.3566 5.88002 12.409 5.82401C13.1504 4.99091 14.128 4.40338 15.2116 4.13961C16.2952 3.87585 17.4335 3.94836 18.4749 4.34749C19.5163 4.74663 20.4114 5.45346 21.0411 6.37391C21.6708 7.29436 22.0053 8.38477 22 9.50001C22 11.79 20.5 13.5 19 15L13.508 20.313C13.3217 20.527 13.0919 20.6989 12.834 20.8173C12.5762 20.9357 12.296 20.9979 12.0123 20.9997C11.7285 21.0015 11.4476 20.9428 11.1883 20.8277C10.9289 20.7126 10.697 20.5436 10.508 20.332L5 15C3.5 13.5 2 11.8 2 9.50001Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-6 8-6s8 2 8 6',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20c0-3.3 3-5 7-5s7 1.7 7 5M17 4.5a3.5 3.5 0 0 1 0 7M18 15c2.5.4 4 1.8 4 5',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  coffee: 'M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8ZM17 9h2a2 2 0 0 1 0 6h-1M6 2v2M10 2v2M14 2v2',
  food: 'M5 2v8M5 10a2 2 0 0 0 4 0V2 M7 10v12 M16 2c-2 0-3 2-3 5s1 4 3 4m0-9v20',
  wifi: 'M5 12.5a10 10 0 0 1 14 0M8 16a5 5 0 0 1 8 0M12 20h.01',
  shield: 'M12 3 5 6v5c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3Z',
  parking: 'M5 3h14v18H5zM9 17V8h3.5a2.5 2.5 0 0 1 0 5H9',
  wc: 'M8 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 21v-6H5l1.5-5h3L11 15h-1v6M16 4v17M13 7h6M13 11h6',
  car: 'M5 13l1.5-5h11L19 13M4 17h16v-3l-1-1H5l-1 1v3ZM7 17v2M17 17v2M7 14h.01M17 14h.01',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M10 16h4M9 20h6M12 13v3',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
  flame: 'M12 22c4 0 6-2.7 6-6 0-2.5-1.5-4-2.5-5.5C14.7 9.4 14 8 14 6c-2 1-3 2.5-3.5 4C9 12 8 11 8 9c-1.5 1.5-2 3.5-2 6 0 3.3 2 7 6 7Z',
  camera: 'M4 8h3l1.5-2h7L17 8h3v11H4V8ZM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  share: 'M14 9V5l7 7-7 7v-4C8 12 5 14 4 18c0-7 4-9 10-9Z',
  phone: 'M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  info: 'M12 16v-5M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  check: 'M5 12.5l4.5 4.5L19 7',
  checkCircle: 'M8 12l3 3 5-6M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  plug: 'M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8ZM12 16v5',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19',
  moon: 'M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z',
  msg: 'M4 5h16v11H9l-5 4V5Z',
  thumb: 'M7 11v9H4v-9h3ZM7 11l4-7c1.5 0 2 1 2 2l-1 4h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 14.8 20H7',
  bookmark: 'M6 3h12v18l-6-4-6 4V3Z',
  settings: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z',
  crown: 'M3 7l4 4 5-7 5 7 4-4-2 12H5L3 7Z',
  calendar: 'M5 6h14v15H5zM5 10h14M9 3v4M15 3v4',
  alert: 'M12 4 2 20h20L12 4ZM12 10v4M12 18h.01',
  dollar: 'M12 2v20M16 6a4 4 0 0 0-4-2c-2.2 0-4 1.3-4 3.2 0 4.8 8 2.8 8 7.6 0 1.9-1.8 3.2-4 3.2a4 4 0 0 1-4-2',
  arrowUR: 'M7 17 17 7M9 7h8v8',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  battery: 'M3 8h15v8H3zM21 11v2M6 11v2M9 11v2',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14',
  mountain: 'M3 20h18L14 7l-3 5-2-3-6 11Z',
  store: 'M4 9 5 4h14l1 5M4 9h16M4 9v11h16V9M9 20v-6h6v6',
  leaf: 'M5 19c0-8 6-14 14-14 0 8-6 14-14 14ZM5 19c2-4 5-7 9-9',
  bolt2: 'M11 2 5 13h5l-1 9 7-12h-5l1-8Z',
  edit: 'M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4',
  gift: 'M5 11h14v9H5zM3 8h18v3H3zM12 8V20M12 8C12 5 10 3 8 4S7 8 12 8ZM12 8c0-3 2-5 4-4s1 4-4 4',
  star: 'M12 3l2.6 6.3L21 10l-5 4.3L17.5 21 12 17.3 6.5 21 8 14.3 3 10l6.4-.7L12 3Z',
};

// filled icons supplied as artwork (own viewBox, painted with fill not stroke)
const FILLED: Record<string, { vb: string; d: string }> = {
  route: { vb: '0 0 22 22', d: 'M8.25 19.25V6.25625L6.78333 7.7L5.5 6.41667L9.16667 2.75L12.8333 6.41667L11.55 7.72292L10.0833 6.25625V12.2375C10.6181 11.7639 11.2215 11.424 11.8937 11.2177C12.566 11.0115 13.2382 10.9083 13.9104 10.9083C14.0785 10.9083 14.2389 10.916 14.3917 10.9313C14.5444 10.9465 14.6896 10.9694 14.8271 11L13.3833 9.53333L14.6667 8.25L18.3333 11.9167L14.6667 15.5833L13.3833 14.3L14.8271 12.8333C14.659 12.8028 14.491 12.776 14.3229 12.7531C14.1549 12.7302 13.9868 12.7188 13.8187 12.7188C12.9937 12.7188 12.2337 12.9517 11.5385 13.4177C10.8434 13.8837 10.3583 14.6056 10.0833 15.5833V19.25H8.25Z' },
};

export type IconName = keyof typeof P | keyof typeof FILLED;

export function Icon({
  name,
  size = 22,
  stroke = 2,
  fill = 'none',
  color = 'currentColor',
  style,
  label,
}: {
  name: string;
  size?: number;
  stroke?: number;
  fill?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  const { colors } = useTheme();
  const resolvedColor = color === 'currentColor' ? colors.ink : color;
  const art = FILLED[name];
  const a11yProps = label
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label }
    : { accessible: false, importantForAccessibility: 'no-hide-descendants' as const };

  if (art) {
    return (
      <View style={style} {...a11yProps}>
        <Svg width={size} height={size} viewBox={art.vb}>
          <Path d={art.d} fill={resolvedColor} />
        </Svg>
      </View>
    );
  }

  const d = P[name];
  if (!d) return null;
  return (
    <View style={style} {...a11yProps}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill === 'none' ? 'none' : resolvedColor}>
        <Path
          d={d}
          fill={fill === 'none' ? 'none' : resolvedColor}
          stroke={resolvedColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

// Flui seal — award-star badge (supplied artwork)
export function Seal({
  size = 16,
  filled = true,
  color,
  boltColor,
  label,
}: {
  size?: number;
  filled?: boolean;
  color?: string;
  boltColor?: string;
  label?: string;
}) {
  const { colors } = useTheme();
  const c = color ?? colors.gold;
  const bolt = boltColor ?? colors.surface;
  const a11yProps = label
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label }
    : { accessible: false, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <View {...a11yProps}>
      <Svg width={size} height={size} viewBox="0 0 27 27" fill="none">
        <Path
          d="M14.8627 24.8277C13.9777 25.6995 12.5585 25.7047 11.667 24.8397L9.99827 23.2204C9.57176 22.8065 9.00082 22.575 8.40651 22.575H6.19392C4.93156 22.575 3.90821 21.5517 3.90821 20.2893V18.0968C3.90821 17.4906 3.6674 16.9092 3.23874 16.4805L1.61612 14.8579C0.723495 13.9653 0.723495 12.5181 1.61612 11.6254L3.23874 10.0028C3.6674 9.57415 3.90821 8.99277 3.90821 8.38656V6.19405C3.90821 4.93168 4.93156 3.90833 6.19393 3.90833H8.39141C8.99468 3.90833 9.57348 3.66984 10.0016 3.24486L11.6484 1.61027C12.5444 0.720949 13.9916 0.72635 14.8809 1.62233L16.4794 3.2328C16.9085 3.66516 17.4925 3.90833 18.1017 3.90833H20.2892C21.5515 3.90833 22.5749 4.93168 22.5749 6.19405V8.38656C22.5749 8.99277 22.8157 9.57415 23.2443 10.0028L24.867 11.6254C25.7596 12.5181 25.7596 13.9653 24.867 14.8579L23.2443 16.4805C22.8157 16.9092 22.5749 17.4906 22.5749 18.0968V20.2893C22.5749 21.5517 21.5515 22.575 20.2892 22.575H18.0865C17.4863 22.575 16.9102 22.8111 16.4826 23.2323L14.8627 24.8277Z"
          fill={filled ? c : 'none'}
          stroke={filled ? 'none' : c}
          strokeWidth={filled ? 0 : 1.6}
        />
        <Path
          d="M12.9012 14.7002V19.0752L17.3248 11.7836H14.1651V7.40857L9.74146 14.7002H12.9012Z"
          fill={filled ? bolt : c}
        />
      </Svg>
    </View>
  );
}

// Renders `level` seals in a row (1-3), used next to the Selo Flui rating.
export function SeloRow({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: n }).map((_, i) => (
        <Seal key={i} size={size} />
      ))}
    </View>
  );
}

// Pill badge: seal row + label, e.g. "Selo Flui · Destaque".
export function SeloBadge({ level = 1, label }: { level?: number; label?: string }) {
  const { colors, font } = useTheme();
  const txt = label ?? (level >= 3 ? 'Selo Flui · Excelência' : level === 2 ? 'Selo Flui · Destaque' : 'Selo Flui');
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: colors.goldSoft,
      }}
    >
      <SeloRow n={level} size={13} />
      <Text style={{ fontFamily: font.uiSemibold, fontSize: 12.5, color: colors.goldInk }}>{txt}</Text>
    </View>
  );
}
