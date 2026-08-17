// Ported from project/app/screens-extra.jsx (`Onboarding`) — 4-step splash → car
// picker → lifestyle prefs → "ative a localização" flow, shown once before the
// user reaches the Tabs (see RootNavigator.tsx, which owns the AsyncStorage flag).
//
// Prop contract vs. the source: the source's `next()` called `onDone(car)` on the
// last step, and `Pular` called `onDone(car)` immediately (skipping with whatever
// car, if any, was picked so far). RootNavigator's `onDone` is zero-arg (it just
// flips the persisted "onboarded" flag), so this still calls `onDone()` with no
// argument — but unlike the source (which dropped the picked car once `onDone`
// fired, it only ever lived in local state), the pick is now persisted via
// `useCar().setCarId()` the moment the driver taps a car, since every route/trip/
// charge-time calculation in the app (src/utils/evCharging.ts) needs a real
// selected car to work from.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useCar } from '../state/CarContext';
import { Icon, Seal } from '../components/icons/Icon';
import { DATA } from '../data/data';

const STEPS = 4;

const PREFS: [id: string, icon: string, label: string][] = [
  ['fast', 'zap', 'Recarga rápida'],
  ['coffee', 'coffee', 'Café & comida'],
  ['cover', 'shield', 'Coberto & seguro'],
  ['leaf', 'leaf', 'Áreas verdes'],
  ['price', 'dollar', 'Melhor preço'],
  ['quiet', 'clock', 'Sem filas'],
];

const STEP_ANNOUNCE = [
  'Rota, by Flui. O guia das recargas.',
  'Passo 1 de 3. Qual é o seu carro?',
  'Passo 2 de 3. O que importa pra você?',
  'Ative a localização.',
];

function PulseDot() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    t.setValue(0);
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 2400, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [reducedMotion, t]);

  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 4.5] });
  const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <View style={{ width: 200, height: 200, alignSelf: 'center', marginTop: 10 }}>
      <View
        style={{
          position: 'absolute',
          left: 6,
          right: 6,
          top: 6,
          bottom: 6,
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: colors.line,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 46,
          right: 46,
          top: 46,
          bottom: 46,
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: colors.line,
        }}
      />
      <View style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -13, marginTop: -13 }}>
        {!reducedMotion && (
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: 'rgba(47,119,246,.35)',
              transform: [{ scale }],
              opacity,
            }}
          />
        )}
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: '#2F77F6',
            borderWidth: 3,
            borderColor: colors.surface,
          }}
        />
      </View>
    </View>
  );
}

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { colors, font, space } = useTheme();
  const { car: currentCar, setCarId } = useCar();
  const [step, setStep] = useState(0);
  const [car, setCar] = useState<string | null>(currentCar.id);
  const [prefs, setPrefs] = useState<string[]>(['fast', 'coffee']);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(STEP_ANNOUNCE[step]);
  }, [step]);

  const next = () => {
    if (step < STEPS - 1) setStep(step + 1);
    else onDone();
  };
  const togglePref = (p: string) => setPrefs((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]));
  const selCar = DATA.cars.find((c) => c.id === car);
  const canContinue = !(step === 1 && !car);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        {step > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <Pressable
              onPress={() => setStep(step - 1)}
              accessibilityRole="button"
              accessibilityLabel="Voltar para a etapa anterior"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.surface3,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="chevL" size={20} color={colors.ink} />
            </Pressable>
            <View
              style={{ flex: 1, height: 4, borderRadius: 3, backgroundColor: colors.surface3, overflow: 'hidden' }}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: STEPS - 1, now: step }}
              accessibilityLabel={`Etapa ${step + 1} de ${STEPS}`}
            >
              <View
                style={{
                  width: `${(step / (STEPS - 1)) * 100}%`,
                  height: '100%',
                  borderRadius: 3,
                  backgroundColor: colors.primary,
                }}
              />
            </View>
            <Pressable
              onPress={onDone}
              accessibilityRole="button"
              accessibilityLabel="Pular a introdução e entrar direto no app"
              hitSlop={10}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: colors.inkSoft, fontSize: 13, fontFamily: font.uiSemibold }}>Pular</Text>
            </Pressable>
          </View>
        )}

        {step === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Seal size={84} color={colors.primary} label="Selo Rota" />
            <Text
              accessibilityRole="header"
              style={{ fontFamily: font.display, fontSize: 46, fontWeight: '600', color: colors.ink, marginTop: 24 }}
            >
              Rota
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: colors.inkFaint,
                marginTop: 6,
              }}
            >
              by Flui · O guia das recargas
            </Text>
            <Text
              style={{
                fontFamily: font.display,
                fontStyle: 'italic',
                fontSize: 18,
                lineHeight: 27,
                color: colors.inkSoft,
                marginTop: 22,
                maxWidth: 280,
                textAlign: 'center',
              }}
            >
              Não é só onde carregar. É onde vale a pena parar — avaliado por quem dirige elétrico em São Paulo.
            </Text>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: colors.inkFaint }}>
              Passo 1 de 3
            </Text>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: font.display, fontSize: 30, fontWeight: '600', color: colors.ink, marginTop: 6, marginBottom: 6 }}
            >
              Qual é o seu carro?
            </Text>
            <Text style={{ fontSize: 15, color: colors.inkSoft, marginBottom: 18 }}>
              Recomendamos pontos compatíveis e calculamos a rota pelo seu alcance real.
            </Text>
            <View style={{ gap: 10 }}>
              {DATA.cars.map((c) => {
                const selected = car === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setCar(c.id);
                      setCarId(c.id);
                    }}
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
                        {c.battery} kWh · {c.range} km · {c.connector}
                      </Text>
                    </View>
                    {selected && <Icon name="checkCircle" size={22} color={colors.primary} fill={colors.primarySoft} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: colors.inkFaint }}>
              Passo 2 de 3
            </Text>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: font.display, fontSize: 30, fontWeight: '600', color: colors.ink, marginTop: 6, marginBottom: 6 }}
            >
              O que importa pra você?
            </Text>
            <Text style={{ fontSize: 15, color: colors.inkSoft, marginBottom: 18 }}>
              Personalizamos as recomendações do guia com base no seu estilo.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {PREFS.map(([id, icon, label]) => {
                const checked = prefs.includes(id);
                return (
                  <Pressable
                    key={id}
                    onPress={() => togglePref(id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={label}
                    style={{
                      width: '47%',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 16,
                      borderRadius: space.radiusSm,
                      backgroundColor: checked ? colors.primarySoft : colors.surface,
                      borderWidth: checked ? 2 : 1.5,
                      borderColor: checked ? colors.primary : colors.line,
                    }}
                  >
                    <Icon name={icon} size={24} color={colors.primary} />
                    <Text style={{ fontWeight: '700', fontSize: 14, color: colors.ink }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={{ alignItems: 'center', paddingTop: 20 }}>
            <PulseDot />
            <Text
              accessibilityRole="header"
              style={{ fontFamily: font.display, fontSize: 30, fontWeight: '600', color: colors.ink, marginTop: 18, marginBottom: 6 }}
            >
              Ative a localização
            </Text>
            <Text style={{ fontSize: 15, color: colors.inkSoft, textAlign: 'center', maxWidth: 280 }}>
              Para mostrar os melhores pontos perto de você em São Paulo e calcular distâncias reais.
            </Text>
            {selCar && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 20,
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: 100,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.line,
                }}
              >
                <Icon name="car" size={14} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkSoft }}>
                  {selCar.brand} {selCar.model} · {selCar.connector}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={{ padding: 22, paddingTop: 12 }}>
        <Pressable
          onPress={next}
          disabled={!canContinue}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          accessibilityLabel={step === 0 ? 'Começar' : step === 3 ? 'Ativar localização e entrar no app' : 'Continuar'}
          style={{
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 16,
            borderRadius: 100,
            backgroundColor: colors.primary,
            opacity: canContinue ? 1 : 0.5,
          }}
        >
          <Text style={{ fontFamily: font.uiSemibold, fontSize: 16, fontWeight: '700', color: colors.primaryInk }}>
            {step === 0 ? 'Começar' : step === 3 ? 'Ativar e entrar' : 'Continuar'}
          </Text>
          {step !== 3 && <Icon name="chevR" size={18} color={colors.primaryInk} />}
        </Pressable>
      </View>
    </View>
  );
}
