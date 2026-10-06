import { interpolate, spring, type SpringConfig } from 'remotion';
import { EASE, SPRING } from '../theme';

type EasingFn = (t: number) => number;

/** 0→1 over [start, start+dur], eased and clamped. */
export const prog = (frame: number, start: number, dur: number, easing: EasingFn = EASE.settle) =>
  interpolate(frame, [start, start + dur], [0, 1], { easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** Spring that starts at `start` (absolute frame in the caller's timebase). */
export const springAt = (frame: number, fps: number, start: number, config: Partial<SpringConfig> = SPRING.calm, durationInFrames?: number) =>
  spring({ frame: frame - start, fps, config, durationInFrames });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** Opacity + rise, the default entrance for text and cards. */
export const fadeUp = (p: number, dist = 28): React.CSSProperties => ({
  opacity: p,
  transform: `translateY(${(1 - p) * dist}px)`,
});

/** Visible character count for a typewriter between two frames. */
export const typed = (frame: number, from: number, to: number, length: number) =>
  Math.round(interpolate(frame, [from, to], [0, length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

/** Smooth pulse that peaks on every beat (period in frames), 0..1. */
export const beatPulse = (frame: number, period: number, sharpness = 4) => {
  const phase = ((frame % period) + period) % period / period;
  return Math.pow(1 - phase, sharpness);
};

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
