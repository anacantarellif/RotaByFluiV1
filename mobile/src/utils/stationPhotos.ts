// Real photography for every station and guide, bundled locally (RN's
// `require()` needs a literal path per asset, so this is a static lookup
// rather than a computed one — see assets/photos/{stations,guides}/*.jpg for
// the source files). Replaces the old placeholderPhoto.ts (picsum.photos
// seeded placeholders) now that every station and guide has a real photo:
// no network fetch, no loading/error states to juggle, and nothing left to
// fall back to a placeholder for.
//
// Typed `number` (Metro's local-asset module id, what `require()` of an
// image always resolves to) rather than RN's `ImageSourcePropType` — every
// photo in this app now renders through expo-image (see the Photo component
// in Station.tsx for why), and `number` is what its `source` prop actually
// expects for a bundled asset.

const STATION_PHOTOS: Record<string, number> = {
  st1: require('../../assets/photos/stations/st1.jpg'),
  st2: require('../../assets/photos/stations/st2.jpg'),
  st3: require('../../assets/photos/stations/st3.jpg'),
  st4: require('../../assets/photos/stations/st4.jpg'),
  st5: require('../../assets/photos/stations/st5.jpg'),
  st6: require('../../assets/photos/stations/st6.jpg'),
  st7: require('../../assets/photos/stations/st7.jpg'),
};

const GUIDE_PHOTOS: Record<string, number> = {
  g1: require('../../assets/photos/guides/g1.jpg'),
  g2: require('../../assets/photos/guides/g2.jpg'),
  g3: require('../../assets/photos/guides/g3.jpg'),
  g4: require('../../assets/photos/guides/g4.jpg'),
};

export function stationPhoto(stationId: string): number {
  return STATION_PHOTOS[stationId];
}

export function guidePhoto(guideId: string): number {
  return GUIDE_PHOTOS[guideId];
}
