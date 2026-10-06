import React, { useMemo } from 'react';
import { interpolate } from 'remotion';
import { beatPulse, clamp01 } from '../lib/anim';
import { rng } from '../lib/geometry';
import { B, C, EASE, FONT, T } from '../theme';

// "Same process. 100 ways to run it." — the word itself, a hundred times over.
const COUNT = 100;

type Item = { x: number; y: number; size: number; vx: number; vy: number; rot: number; rework: boolean; tone: number };

export const buildSwarm = (W: number, H: number): Item[] => {
  const r = rng(W > H ? 21 : 33);
  const items: Item[] = [];
  while (items.length < COUNT) {
    const x = 40 + r() * (W - 80);
    const y = 40 + r() * (H - 80);
    // keep the headline zone quieter so the type stays legible
    const dx = (x - W / 2) / (W * 0.36);
    const dy = (y - H / 2) / (H * 0.2);
    if (dx * dx + dy * dy < 1 && r() < 0.85) continue;
    const i = items.length;
    items.push({
      x,
      y,
      size: 16 + Math.pow(r(), 1.8) * 44,
      vx: (r() - 0.5) * 0.9,
      vy: (r() - 0.5) * 0.6,
      rot: r() < 0.14 ? (r() < 0.5 ? -90 : 90) : 0,
      rework: i % 8 === 3,
      tone: r(),
    });
  }
  return items;
};

/** Visible count follows the on-screen counter (1 → 100, expo-out). */
export const swarmCount = (f: number) =>
  Math.round(interpolate(f, [B.hookCounterFrom, B.hookCounterTo], [1, COUNT], { easing: EASE.settle, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

export const Swarm: React.FC<{
  f: number;
  W: number;
  H: number;
  dim?: number; // 0..1 fade toward the background
  converge?: number; // 0..1 everything flies into the centre (staggered)
  target?: { x: number; y: number };
}> = ({ f, W, H, dim = 0, converge = 0, target }) => {
  const items = useMemo(() => buildSwarm(W, H), [W, H]);
  const n = swarmCount(f);
  const pulse = beatPulse(f, T.beatFrames, 3);
  const tgt = target ?? { x: W / 2, y: H / 2 };
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT, overflow: 'hidden' }}>
      {items.map((it, i) => {
        if (i >= n) return null;
        const born = B.hookCounterFrom + (i / COUNT) * 20;
        const age = Math.max(0, Math.min(f, B.demoResolveFrom) - born);
        const pop = EASE.settle(clamp01((f - born) / 8));
        const c = EASE.camera(clamp01(converge * 1.6 - (i / COUNT) * 0.6));
        const x = it.x + it.vx * age;
        const y = it.y + it.vy * age;
        const px = x + (tgt.x - x) * c;
        const py = y + (tgt.y - y) * c;
        const op = (it.rework ? 0.95 : 0.3 + 0.45 * it.tone) * pop * (1 - 0.7 * dim) * (1 - c);
        if (op <= 0.01) return null;
        const sc = (0.7 + 0.3 * pop) * (1 - 0.8 * c) * (it.rework ? 1 + 0.12 * pulse : 1);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: px,
              top: py,
              transform: `translate(-50%, -50%) rotate(${it.rot}deg) scale(${sc})`,
              fontSize: it.size,
              fontWeight: it.rework ? 750 : 650,
              letterSpacing: '-0.02em',
              color: it.rework ? C.rework : it.tone > 0.75 ? C.ink2 : C.ink3,
              opacity: op,
              whiteSpace: 'nowrap',
            }}
          >
            {it.rework ? 'rework ↻' : 'process'}
          </div>
        );
      })}
    </div>
  );
};
