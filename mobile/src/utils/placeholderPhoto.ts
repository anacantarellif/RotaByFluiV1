// Real (stock) photography for stations/guides, deterministic by id — the app
// has no actual photos of these fictional/composite São Paulo charging points,
// so there's nothing real to bundle. picsum.photos' seeded endpoint returns the
// same photo for the same seed every time (not a random shuffle on every
// render), which is what makes it usable here: a given station always shows
// the same "real" photo instead of a different stock image each time its ficha
// opens. Requires network — every call site using this falls back to the flat
// placeholder box if the image fails to load (offline, first run before the
// request resolves, etc.), never a broken-image icon.
export function photoUrl(seed: string, width = 400, height = 300): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}
