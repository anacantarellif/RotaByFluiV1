// Deep links to hand a destination off to an external navigation app. Shared by
// src/components/handoff/MapsHandoff.tsx (the "Navegar até" picker sheet) and
// src/components/LocationNotice.tsx (the GPS-unavailable fallback screen), so both
// build the exact same URLs instead of each rolling their own.
import { Linking } from 'react-native';

export function gmapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function wazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

// Opens a URL for real, checking availability first. Both schemes above are plain
// https:// links so this virtually always succeeds (worst case, the OS opens it in
// a browser) — still checked + caught so a genuinely broken link degrades to a
// caller-controlled fallback (e.g. a toast) instead of a silent no-op.
export async function openExternalUrl(url: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
