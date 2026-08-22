// Ported from project/app/event-sheet.jsx — community report bottom sheet, shown when a
// Waze-style map report marker is tapped (fila/lotado, quebrado/fora do ar, preço mudou,
// pontos livres). Exports: EventSheet
//
// Prop contract vs. the source: the source took `ev`, `onClose`, `pushToast` (see
// project/app/screens-map.jsx `<EventSheet ev={event} onClose={...} pushToast={pushToast} />`).
// Per PORTING_GUIDE.md, `pushToast` is not passed down here — it comes from `useToast()`
// instead, same as every other ported callback prop. `ev` is renamed `report` to match the
// `Report` type name. `onClose` also doubles as the sheet's dismiss handler
// (`ModalSheet`'s backdrop-tap / pan-down-to-close / `open` prop all resolve to it).
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../icons/Icon';
import { ModalSheet } from '../sheets/ModalSheet';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../state/ToastContext';
import { Report } from '../../data/types';

export function EventSheet({
  report,
  onClose,
}: {
  report: Report | null;
  onClose: () => void;
}) {
  const { colors, font } = useTheme();
  const { pushToast } = useToast();
  // Same lifetime as the source's local `useState` — resets only when this component
  // unmounts (i.e. when the parent stops rendering it / `open` goes false), not merely
  // when `report` changes to a different report while still open.
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null);

  if (!report) return null;

  const c = colors[report.colorToken];

  const confirm = () => {
    setVoted('yes');
    pushToast('Reporte confirmado · +20 Watts', 'check');
  };
  const notAnymore = () => {
    setVoted('no');
    pushToast('Reporte marcado como resolvido', 'check');
  };

  return (
    <ModalSheet open onClose={onClose} dynamicSizing label={`Reporte: ${report.label}`}>
      <View style={styles.content}>
        <View style={styles.kv}>
          <View style={styles.kindRow}>
            <View style={[styles.dot, { backgroundColor: c }]} />
            <Text style={[styles.kind, { color: c, fontFamily: font.uiSemibold }]}>{report.kind}</Text>
          </View>
          <Text style={[styles.when, { color: colors.inkFaint, fontFamily: font.uiSemibold }]}>há {report.when}</Text>
        </View>

        <View style={styles.ringWrap}>
          <View style={[styles.ring, { borderColor: c, backgroundColor: colors.surface2 }]}>
            <Icon name={report.icon} size={32} color={c} />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.ink, fontFamily: font.display }]}>{report.label}</Text>
        <Text style={[styles.desc, { color: colors.inkSoft, fontFamily: font.ui }]}>{report.desc}</Text>

        <View style={[styles.box, { backgroundColor: colors.surface2 }]}>
          <View style={[styles.avatar, { backgroundColor: colors.surface3 }]}>
            <Text style={[styles.avatarTxt, { color: colors.primarySoftInk, fontFamily: font.uiSemibold }]}>
              {report.who.slice(0, 1)}
            </Text>
          </View>
          <View style={styles.boxBody}>
            <Text style={[styles.who, { color: colors.ink, fontFamily: font.uiSemibold }]}>{report.who} reportou</Text>
            <Text style={[styles.meta, { color: colors.inkFaint, fontFamily: font.ui }]}>
              {report.station} · confirmado por {report.confirms} pessoas
            </Text>
          </View>
        </View>

        {voted ? (
          // CSS used `color-mix(in srgb, var(--ok) 12%, transparent)` for the "thanks" box
          // background — RN has no color-mix, so approximate with an alpha-suffixed hex on
          // the resolved `ok` token (1F ≈ 12% opacity).
          <View
            style={[styles.thanks, { backgroundColor: `${colors.ok}1F` }]}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            <Icon name="checkCircle" size={18} color={colors.ok} />
            <Text style={[styles.thanksTxt, { color: colors.ink, fontFamily: font.uiSemibold }]}>
              {voted === 'yes' ? 'Obrigado! Confirmação enviada · +20 Watts' : 'Valeu! Vamos revisar esse reporte'}
            </Text>
          </View>
        ) : (
          <>
            <AnimatedPressable
              onPress={confirm}
              accessibilityRole="button"
              accessibilityLabel="Confirmar reporte: continua assim, mais 20 Watts"
              hitSlop={4}
              style={[styles.btn, styles.btnLg, { backgroundColor: colors.primary }]}
            >
              <Icon name="check" size={18} color={colors.primaryInk} />
              <Text style={[styles.btnTxt, { color: colors.primaryInk, fontFamily: font.uiSemibold }]}>
                Continua assim · +20 Watts
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={notAnymore}
              accessibilityRole="button"
              accessibilityLabel="Reportar que a situação não está mais assim"
              hitSlop={4}
              style={[styles.btn, { backgroundColor: colors.surface3, marginTop: 8 }]}
            >
              <Text style={[styles.btnTxt, { color: colors.ink, fontFamily: font.uiSemibold }]}>Não está mais assim</Text>
            </AnimatedPressable>
          </>
        )}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  // The 24 added here on top of ModalSheet's own device-inset reserve was a
  // band-aid from when this sheet used a fixed snapPoint too short to show
  // both buttons at all — now that ModalSheet sizes it to content
  // (`dynamicSizing`), that generous margin left a noticeably oversized gap
  // below "Não está mais assim" instead. A small one is still worth keeping
  // so the button doesn't sit flush against the reserved safe area.
  content: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  kind: { fontSize: 13 },
  when: { fontSize: 12.5 },
  ringWrap: { alignItems: 'center', marginTop: 18, marginBottom: 14 },
  ring: { width: 66, height: 66, borderRadius: 33, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, textAlign: 'center' },
  desc: { fontSize: 13.5, lineHeight: 19.5, marginTop: 6, textAlign: 'center' },
  box: { marginTop: 16, padding: 12, borderRadius: 14, flexDirection: 'row', gap: 11, alignItems: 'center' },
  boxBody: { flex: 1, minWidth: 0 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 12 },
  who: { fontSize: 13 },
  meta: { fontSize: 11.5, marginTop: 2 },
  thanks: { marginTop: 16, padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  thanksTxt: { fontSize: 13.5, textAlign: 'center' },
  btn: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  btnLg: { paddingVertical: 16, paddingHorizontal: 22 },
  btnTxt: { fontSize: 15 },
});
