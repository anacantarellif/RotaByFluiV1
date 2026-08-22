// Ported from project/app/screens-extra.jsx (`CommunityScreen`, `MissionCard`,
// `FeedItem`). These sub-components are used only by this screen, so — per
// PORTING_GUIDE.md's "one file per source domain" — they live here instead of a
// separate shared file.
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from '../components/icons/Icon';
import { AnimatedPressable } from '../components/motion/AnimatedPressable';
import { useTheme } from '../theme/ThemeContext';
import { DATA } from '../data/data';
import { FeedItem as FeedItemT, Mission } from '../data/types';
import { useWatts } from '../state/WattsContext';
import { useMissions } from '../state/MissionsContext';

// ---- MissionCard ----

// `m` here is DATA.missions' static title/desc/reward/icon merged with real
// prog/done from MissionsContext (see the map site below) — the static array
// alone used to be the *only* source, so progress never moved no matter what
// the driver actually did.
function MissionCard({ m }: { m: Mission }) {
  const { colors, font, space } = useTheme();
  const pct = Math.round((m.prog / m.total) * 100);
  return (
    <View style={{ minWidth: 230, borderRadius: space.radius, backgroundColor: colors.surface, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14 }}>
        <View
          style={{
            width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
            backgroundColor: m.done ? colors.goldSoft : colors.primarySoft,
          }}
        >
          <Icon name={(m.done ? 'check' : m.icon) as IconName} size={22} color={m.done ? colors.goldInk : colors.primarySoftInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 15, color: colors.ink }}>{m.title}</Text>
          <Text style={{ fontSize: 12, color: colors.inkFaint }}>{m.desc}</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`Progresso da missão ${m.title}`}
          accessibilityValue={{ min: 0, max: m.total, now: m.prog, text: `${m.prog} de ${m.total}` }}
          style={{ height: 8, borderRadius: 5, backgroundColor: colors.surface3, overflow: 'hidden', marginBottom: 7 }}
        >
          <View style={{ width: `${pct}%`, height: '100%', borderRadius: 5, backgroundColor: m.done ? colors.gold : colors.primary }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: colors.inkFaint }}>
            {m.prog}/{m.total}
          </Text>
          <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7, backgroundColor: colors.goldSoft }}>
            <Text style={{ fontFamily: font.mono, fontSize: 11, fontWeight: '600', color: colors.goldInk }}>+{m.reward} Watts</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ---- FeedItem ----

const FEED_VERB: Record<FeedItemT['type'], string> = {
  review: 'avaliou',
  report: 'reportou em',
  badge: '',
  photo: 'compartilhou foto de',
};

function FeedStars({ n }: { n: number }) {
  const { colors } = useTheme();
  const rounded = Math.round(n);
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} name="star" size={12} fill={i < rounded ? colors.gold : 'none'} color={i < rounded ? colors.gold : colors.lineStrong} stroke={1.5} />
      ))}
    </View>
  );
}

function FeedItem({ f }: { f: FeedItemT }) {
  const { colors, font } = useTheme();
  const verb = FEED_VERB[f.type];
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <View
        style={{
          width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface3,
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <Text style={{ fontWeight: '800', fontSize: 14, color: colors.primarySoftInk }}>{f.initials}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14, lineHeight: 19.6 }}>
            <Text style={{ fontWeight: '700', color: colors.ink }}>{f.who}</Text>{' '}
            <Text style={{ color: colors.inkSoft }}>
              {verb} {f.station && <Text style={{ fontWeight: '600', color: colors.inkSoft }}>{f.station}</Text>}
            </Text>
          </Text>
          {f.type === 'review' && f.stars != null && <FeedStars n={f.stars} />}
        </View>
        <Text style={{ fontSize: 11, marginTop: 2, marginBottom: 8, color: colors.inkFaint }}>há {f.when}</Text>
        <Text style={{ fontSize: 14, lineHeight: 20.3, color: colors.ink }}>{f.body}</Text>
        {f.photo && (
          <View
            accessibilityRole="image"
            accessibilityLabel="Foto da comunidade"
            style={{
              height: 120, borderRadius: 14, marginTop: 10, backgroundColor: colors.surface2,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <View style={{ backgroundColor: colors.surface, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6 }}>
              <Text style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.inkFaint }}>
                foto da comunidade
              </Text>
            </View>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 }}>
          {/* Source renders these as plain, non-interactive `<span>`s (no onClick at
              all — dead affordances in the prototype, same pattern as the "helpful"
              chip in station.jsx). Kept functionally inert here too, but per the
              porting task's accessibility rule ("curtir"/"comentar" icon buttons need
              labels) they're proper `accessibilityRole="button"` touch targets with
              real labels instead of unlabeled icon+number pairs. */}
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={`Curtir, ${f.likes} curtidas`}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }}
          >
            <Icon name="thumb" size={16} color={colors.inkSoft} />
            <Text style={{ fontSize: 13, color: colors.inkSoft }}>{f.likes}</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={`Comentar, ${f.comments} comentários`}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }}
          >
            <Icon name="msg" size={16} color={colors.inkSoft} />
            <Text style={{ fontSize: 13, color: colors.inkSoft }}>{f.comments}</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Compartilhar publicação"
            hitSlop={8}
            style={{ marginLeft: 'auto', minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="share" size={16} color={colors.inkSoft} />
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

// ---- CommunityScreen ----

type Tab = 'feed' | 'rank';

export function CommunityScreen() {
  const { colors, font, space } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('feed');
  const { watts } = useWatts();
  const { counts, completed } = useMissions();
  const u = { ...DATA.user, watts };
  const missions: Mission[] = DATA.missions.map((m) => ({
    ...m,
    prog: counts[m.id] ?? m.prog,
    done: completed.includes(m.id) || m.done,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: Math.max(insets.top, 24) + 14, paddingBottom: 96 }}>
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontFamily: font.display, fontSize: 30, color: colors.ink }}>Comunidade</Text>
        </View>

        {/* watts banner — source paints a diagonal `primary` → `primary-2` CSS
            gradient; no gradient primitive is available without adding
            expo-linear-gradient (not a current dependency), so this falls back to a
            flat `colors.primary` fill, same simplification already used for the
            source's repeating-gradient photo placeholders (see Station.tsx `Photo`). */}
        <View style={{ padding: 16, marginBottom: 18, borderRadius: space.radius, backgroundColor: colors.primary }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
                Nível {u.level} · {u.title}
              </Text>
              <Text style={{ fontFamily: font.mono, fontSize: 30, fontWeight: '600', marginTop: 4, color: '#fff' }}>
                {u.watts.toLocaleString('pt-BR')} <Text style={{ fontSize: 15 }}>Watts</Text>
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="flame" size={20} color="#fff" fill="#fff" />
                <Text style={{ fontWeight: '800', fontSize: 22, color: '#fff' }}>{u.streak}</Text>
              </View>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>dias seguidos</Text>
            </View>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Progresso para o próximo nível"
            accessibilityValue={{ min: 0, max: u.nextLevel, now: u.watts, text: `${u.watts} de ${u.nextLevel} Watts` }}
            style={{ height: 8, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 14 }}
          >
            <View style={{ width: `${Math.min(100, (u.watts / u.nextLevel) * 100)}%`, height: '100%', borderRadius: 5, backgroundColor: '#fff' }} />
          </View>
          <Text style={{ fontSize: 12, marginTop: 7, color: 'rgba(255,255,255,0.85)' }}>
            {Math.max(0, u.nextLevel - u.watts).toLocaleString('pt-BR')} Watts para o nível {u.level + 1}
          </Text>
        </View>

        {/* missions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.inkFaint }}>
            Missões da semana
          </Text>
          <Text style={{ fontSize: 12, color: colors.inkFaint }}>renova em 3d</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 22 }} contentContainerStyle={{ gap: 12, paddingVertical: 2 }}>
          {missions.map((m) => (
            <MissionCard key={m.id} m={m} />
          ))}
        </ScrollView>

        {/* tabs */}
        <View
          accessibilityRole="tablist"
          style={{ flexDirection: 'row', backgroundColor: colors.surface3, borderRadius: 12, padding: 3, gap: 3, marginBottom: 16 }}
        >
          {/* Source's `.seg button` is visually 38px tall (a genuine a11y gap in the
              prototype); PORTING_GUIDE.md requires ≥44px touch targets, so hitSlop
              pads the touchable area without changing the compact visual size. */}
          <AnimatedPressable
            onPress={() => setTab('feed')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'feed' }}
            hitSlop={{ top: 6, bottom: 6 }}
            style={{
              flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 9,
              backgroundColor: tab === 'feed' ? colors.surface : 'transparent',
            }}
          >
            <Text style={{ fontFamily: font.uiSemibold, fontWeight: '700', fontSize: 13, color: tab === 'feed' ? colors.ink : colors.inkSoft }}>
              Atividade
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => setTab('rank')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'rank' }}
            hitSlop={{ top: 6, bottom: 6 }}
            style={{
              flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 9,
              backgroundColor: tab === 'rank' ? colors.surface : 'transparent',
            }}
          >
            <Text style={{ fontFamily: font.uiSemibold, fontWeight: '700', fontSize: 13, color: tab === 'rank' ? colors.ink : colors.inkSoft }}>
              Ranking
            </Text>
          </AnimatedPressable>
        </View>

        {tab === 'rank' ? (
          <View style={{ paddingHorizontal: 16, borderRadius: space.radius, backgroundColor: colors.surface }}>
            {DATA.leaderboard.map((p, i) => (
              <View
                key={i}
                accessible
                accessibilityLabel={`${p.rank}º lugar, ${p.who}, ${p.watts.toLocaleString('pt-BR')} Watts${p.me ? ', você' : ''}`}
                style={[
                  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
                  p.me && { backgroundColor: colors.primarySoft, marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 14 },
                ]}
              >
                <Text
                  style={{ fontFamily: font.display, fontSize: 18, width: 26, textAlign: 'center', fontWeight: '600', color: i < 3 ? colors.gold : colors.inkFaint }}
                >
                  {p.rank}
                </Text>
                <View
                  style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontWeight: '800', fontSize: 13, color: colors.primarySoftInk }}>{p.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 14, color: colors.ink }}>{p.who}</Text>
                  <Text style={{ fontFamily: font.mono, fontSize: 12, color: colors.inkFaint }}>{p.watts.toLocaleString('pt-BR')} Watts</Text>
                </View>
                <Icon name={p.up ? 'chevU' : 'chevD'} size={18} color={p.up ? colors.ok : colors.inkFaint} />
              </View>
            ))}
          </View>
        ) : (
          <View>
            {DATA.feed.map((f) => (
              <FeedItem key={f.id} f={f} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
