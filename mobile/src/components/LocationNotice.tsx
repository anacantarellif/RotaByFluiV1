// Shown by NavScreen/TripScreen instead of the map when real GPS isn't available
// (permission denied, or location services off). New — not in the source
// prototype, which only ever animated a simulated position. Per the product
// decision: a real driver should see a clear notice + a way to still get where
// they're going (external Maps/Waze), not a silently-faked position. The
// "modo de demonstração" option exists only so the app can be tried/demoed
// without actually being at the route's location — it's explicitly labeled as a
// simulation, never presented as real.
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../state/ToastContext';
import { Icon } from './icons/Icon';
import { GoogleGlyph, WazeGlyph } from './icons/BrandGlyphs';
import { gmapsUrl, wazeUrl, openExternalUrl } from '../utils/externalNav';
import { LiveLocationStatus } from '../hooks/useLiveLocation';

export function LocationNotice({
  status,
  destinationName,
  destinationLat,
  destinationLng,
  onRetry,
  onDemoMode,
}: {
  status: Exclude<LiveLocationStatus, 'granted'>;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  onRetry: () => void;
  onDemoMode: () => void;
}) {
  const { colors, font, space } = useTheme();
  const { pushToast } = useToast();

  const checking = status === 'checking';
  const heading = checking
    ? 'Buscando sua localização…'
    : status === 'denied'
      ? 'Permissão de localização necessária'
      : 'Sem sinal de GPS';
  const body = checking
    ? 'Um instante enquanto confirmamos onde você está.'
    : status === 'denied'
      ? `Para acompanhar sua posição real até ${destinationName} dentro do app, o Rota precisa da permissão de localização.`
      : `Não conseguimos um sinal de GPS agora. Verifique se a localização está ativada no aparelho para navegar até ${destinationName} dentro do app.`;

  const openExternal = async (app: 'gmaps' | 'waze') => {
    const url = app === 'gmaps' ? gmapsUrl(destinationLat, destinationLng) : wazeUrl(destinationLat, destinationLng);
    const appName = app === 'gmaps' ? 'Google Maps' : 'Waze';
    const opened = await openExternalUrl(url);
    pushToast(opened ? `Abrindo no ${appName}…` : `${appName} não está instalado`, opened ? 'nav' : 'alert');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <View
        style={{
          width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.goldSoft, marginBottom: 18,
        }}
      >
        <Icon name={checking ? 'crosshair' : 'alert'} size={28} color={colors.goldInk} />
      </View>

      <Text
        accessibilityRole="header"
        style={{ fontFamily: font.display, fontSize: 22, fontWeight: '600', color: colors.ink, textAlign: 'center', marginBottom: 8 }}
      >
        {heading}
      </Text>
      <Text style={{ fontSize: 14.5, lineHeight: 21, color: colors.inkSoft, textAlign: 'center', maxWidth: 320, marginBottom: 26 }}>
        {body}
      </Text>

      {!checking && (
        <>
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Tentar novamente"
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, width: '100%', maxWidth: 340,
              borderRadius: 999, paddingVertical: 15, backgroundColor: colors.primary, marginBottom: 12,
            }}
          >
            <Icon name="crosshair" size={18} color={colors.primaryInk} />
            <Text style={{ fontFamily: font.uiSemibold, fontSize: 15.5, fontWeight: '700', color: colors.primaryInk }}>Tentar novamente</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: 10, width: '100%', maxWidth: 340, marginBottom: 22 }}>
            <Pressable
              onPress={() => openExternal('gmaps')}
              accessibilityRole="button"
              accessibilityLabel="Abrir no Google Maps"
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 48,
                borderRadius: 14, paddingVertical: 12, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line,
              }}
            >
              <GoogleGlyph size={18} />
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink }}>Google Maps</Text>
            </Pressable>
            <Pressable
              onPress={() => openExternal('waze')}
              accessibilityRole="button"
              accessibilityLabel="Abrir no Waze"
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 48,
                borderRadius: 14, paddingVertical: 12, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line,
              }}
            >
              <WazeGlyph size={18} />
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink }}>Waze</Text>
            </Pressable>
          </View>

          <View style={{ width: '100%', maxWidth: 340, height: 1, backgroundColor: colors.line, marginBottom: 18 }} />

          <Pressable
            onPress={onDemoMode}
            accessibilityRole="button"
            accessibilityLabel="Usar modo de demonstração, sem localização real"
            hitSlop={6}
            style={{ alignItems: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.inkFaint, textDecorationLine: 'underline' }}>
              Usar modo de demonstração
            </Text>
            <Text style={{ fontSize: 11.5, color: colors.inkFaint, marginTop: 3, textAlign: 'center' }}>
              Simula o trajeto sem usar sua localização real — só para testes
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
