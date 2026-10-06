import { Easing } from 'remotion';
import timeline from './timeline.json';

// Colours are lifted directly from the Lens process-map product
// (process-map/styles.css) so the film reads as the same product.
export const C = {
  bg: '#f6f6f9',
  canvas: '#fbfbfd',
  card: '#ffffff',
  cardBorder: '#eaeaf2',
  boxStroke: '#e2e2ed',
  panelBorder: '#ebebf3',
  grid: '#e2e2ed',

  ink: '#2a2e45',
  ink2: '#8b8fa6',
  ink3: '#b2b5c6',
  iconInk: '#5b5e78',
  toolbarInk: '#3d3c52',

  // UI accent: active toggles, AI Summary, primary buttons ("Automate with Seek", "Book a demo")
  accent: '#c74900',
  accentSoft: '#fbe8dc',
  accentInk: '#8a3d00',

  // The one path accent: the fastest ("golden") path
  fastest: '#1f9d5c',
  fastestSoft: '#e4f6ec',
  fastestInk: '#157a45',

  // Most common path: muted
  common: '#9a9fb5',
  commonSoft: '#eef0f6',

  // The one warm warning: rework hotspots
  rework: '#d17d2c',
  reworkSoft: '#fbf0e2',
  reworkInk: '#9a5613',

  edge: '#c7cadd',
} as const;

// Whatfix Lens aperture mark, blade by blade (clockwise from the top-left blade).
export const LOGO_COLORS = ['#fba351', '#f45703', '#f98a20', '#f45703', '#f45703', '#fba351', '#f98a20', '#f98a20'];

export const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// Type scale (px at 1920x1080). The 9:16 cutdown uses the same sizes on a 1080-wide canvas,
// which reads larger on a phone, as social copy should.
export const TYPE = {
  display: 112, // hook headline
  h1: 76, // scene supers, wordmark tagline
  h2: 52,
  kinetic: 132, // OBSERVE → MEASURE
  body: 30,
  ui: 20,
  uiSmall: 16,
  caption: 15,
} as const;

// Calm precision: almost everything settles without overshoot.
export const EASE = {
  settle: Easing.bezier(0.16, 1, 0.3, 1), // expo-out — UI entering, cards, supers
  camera: Easing.bezier(0.65, 0, 0.35, 1), // in-out — push-ins, re-framing, rack focus
  exit: Easing.bezier(0.7, 0, 0.84, 0), // in — elements leaving
  linear: Easing.linear,
};

export const SPRING = {
  calm: { damping: 200, stiffness: 100, mass: 1 }, // critically damped, no overshoot
  chip: { damping: 18, stiffness: 140, mass: 0.8 }, // the one place a hint of overshoot is allowed
  snappy: { damping: 200, stiffness: 260, mass: 0.6 },
} as const;

export const T = timeline;
export const B = timeline.beats;
export type SceneId = (typeof timeline.scenes)[number]['id'];
export const scene = (id: SceneId) => timeline.scenes.find((s) => s.id === id)!;
