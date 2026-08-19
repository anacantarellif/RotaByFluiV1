// Field names mirror project/app/data.jsx exactly (see docs/HANDOFF.md §3) so a real
// API layer can be swapped in later without touching component code.

export type Avail = 'ok' | 'busy' | 'off';

export type Car = {
  id: string;
  brand: string;
  model: string;
  battery: number;
  range: number;
  connector: string;
  ackw: number;
  dckw: number;
};

export type Review = {
  who: string;
  when: string;
  stars: number;
  body: string;
  helpful: number;
  car: string;
};

export type Station = {
  id: string;
  name: string;
  area: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  dist: string;
  avail: Avail;
  selo: number;
  rating: number;
  reviews: number;
  free: number;
  total: number;
  power: number;
  connectors: string[];
  price: number;
  hours: string;
  quiet: string;
  cover: boolean;
  amenities: string[];
  tags: string[];
  blurb: string;
  reviewsList: Review[];
};

export type Report = {
  id: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  type: 'fila' | 'quebrado' | 'preco' | 'livre';
  icon: string;
  colorToken: 'ok' | 'busy' | 'off' | 'primary';
  kind: string;
  label: string;
  who: string;
  when: string;
  station: string;
  confirms: number;
  desc: string;
};

export type FeedItem = {
  id: string;
  who: string;
  initials: string;
  when: string;
  type: 'review' | 'report' | 'badge' | 'photo';
  station?: string;
  stars?: number;
  body: string;
  likes: number;
  comments: number;
  photo: boolean;
};

export type Mission = {
  id: string;
  icon: string;
  title: string;
  desc: string;
  reward: number;
  prog: number;
  total: number;
  done?: boolean;
};

export type Badge = {
  id: string;
  icon: string;
  name: string;
  earned: boolean;
};

export type LeaderboardRow = {
  rank: number;
  who: string;
  initials: string;
  watts: number;
  up: boolean;
  me?: boolean;
};

export type RouteStop = {
  kind: 'start' | 'charge' | 'end';
  name: string;
  sub: string;
  battery: number;
  power?: number;
  time?: number;
  selo?: number;
  // Real-world coordinates — see the same field on GuideStop for why.
  lat?: number;
  lng?: number;
};

export type GuideStop = {
  kind: 'start' | 'stop' | 'charge' | 'end';
  name: string;
  sub: string;
  time?: string;
  dur?: string;
  icon?: string;
  power?: number;
  selo?: number;
  todo: string;
  // Real-world coordinates for this stop, so an external-maps handoff
  // (src/utils/externalNav.ts, RouteHandoffSheet) can pass every stop as a real
  // waypoint instead of only the itinerary's final destination. Not in the
  // source (project/app/data.jsx) — added so multi-stop routes actually work.
  lat?: number;
  lng?: number;
};

export type Guide = {
  id: string;
  cat: string;
  kicker: string;
  selo: number;
  title: string;
  region: string;
  cover: string;
  distance: number;
  duration: string;
  recharges: number;
  season: string;
  blurb: string;
  blurbLong: string;
  tags: string[];
  stops: GuideStop[];
};

export type RotaData = {
  user: {
    name: string;
    handle: string;
    initials: string;
    level: number;
    title: string;
    wattsLabel: string;
    watts: number;
    nextLevel: number;
    streak: number;
    contributions: number;
    reviews: number;
    photos: number;
    reports: number;
    car: string;
    favorites: number;
  };
  cars: Car[];
  user_xy: { x: number; y: number };
  user_geo: { lat: number; lng: number };
  map_default: { lat: number; lng: number; zoom: number };
  stations: Station[];
  reports: Report[];
  feed: FeedItem[];
  missions: Mission[];
  badges: Badge[];
  leaderboard: LeaderboardRow[];
  route: {
    from: string;
    to: string;
    distance: number;
    duration: string;
    startBattery: number;
    arriveBattery: number;
    stops: RouteStop[];
  };
  guides: Guide[];
};
