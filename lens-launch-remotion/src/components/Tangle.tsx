import React, { useMemo } from 'react';
import { LAYOUT, type Orientation } from '../data/process';
import { beatPulse, clamp01 } from '../lib/anim';
import { mix, polyD, resample, rng, smoothSample, type Pt } from '../lib/geometry';
import { C, EASE, T } from '../theme';

// Dozens of overlapping, looping variants of the same process — the "100 ways".
const COUNT = 46;
const LOOPS = 12;

type Strand = { pts: Pt[]; target: 'fastest' | 'common' | 'ghost'; tone: number };

const build = (o: Orientation): { strands: Strand[]; loops: { c: Pt; r: number; a0: number }[] } => {
  const r = rng(o === 'h' ? 7 : 11);
  const S = LAYOUT[o].pos.start;
  const E = LAYOUT[o].pos.end;
  const strands: Strand[] = [];
  for (let i = 0; i < COUNT; i++) {
    const ctrl: Pt[] = [S];
    const backtrack = r() < 0.4 ? 2 + Math.floor(r() * 4) : -1;
    for (let j = 1; j <= 7; j++) {
      const t = j / 8;
      const spread = Math.pow(Math.sin(Math.PI * t), 0.55);
      if (o === 'h') {
        let x = S.x + (E.x - S.x) * t + (r() - 0.5) * 280;
        if (j === backtrack) x -= 260 + r() * 160;
        const y = Math.max(120, Math.min(1040, S.y + (r() - 0.5) * 2 * 470 * spread));
        ctrl.push({ x, y });
      } else {
        let y = S.y + (E.y - S.y) * t + (r() - 0.5) * 220;
        if (j === backtrack) y -= 220 + r() * 140;
        const x = Math.max(50, Math.min(1030, S.x + (r() - 0.5) * 2 * 480 * spread));
        ctrl.push({ x, y });
      }
    }
    ctrl.push(E);
    const target = i % 3 === 0 ? 'fastest' : i % 3 === 1 ? 'common' : 'ghost';
    strands.push({ pts: smoothSample(ctrl, 8, 0.9), target, tone: r() });
  }
  const loops = [...Array(LOOPS)].map((_, k) => {
    const s = strands[(k * 5 + 2) % COUNT];
    const c = s.pts[16 + Math.floor(r() * 32)];
    return { c, r: 26 + r() * 18, a0: r() * Math.PI * 2 };
  });
  return { strands, loops };
};

const arc = (c: Pt, r: number, a0: number) => {
  const a1 = a0 + (Math.PI * 2 * 300) / 360;
  const p0 = { x: c.x + r * Math.cos(a0), y: c.y + r * Math.sin(a0) };
  const p1 = { x: c.x + r * Math.cos(a1), y: c.y + r * Math.sin(a1) };
  return `M${p0.x.toFixed(1)},${p0.y.toFixed(1)} A${r},${r} 0 1 1 ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
};

export const Tangle: React.FC<{
  o: Orientation;
  frame: number; // absolute
  draw: number; // 0..1 overall draw-on (staggered per strand)
  resolve: number; // 0..1 overall convergence onto the real routes (staggered)
  targets: { fastest: Pt[]; common: Pt[] }; // route polylines to converge onto
  loopTarget: Pt; // where the rework loops gather (the Verification loop)
  opacity?: number;
}> = ({ o, frame, draw, resolve, targets, loopTarget, opacity = 1 }) => {
  const { strands, loops } = useMemo(() => build(o), [o]);
  const n = strands[0].pts.length;
  const tf = useMemo(() => resample(targets.fastest, n), [targets.fastest, n]);
  const tc = useMemo(() => resample(targets.common, n), [targets.common, n]);
  const pulse = beatPulse(frame, T.beatFrames, 3);
  const W = o === 'h' ? 1920 : 1080;
  const H = o === 'h' ? 1080 : 1920;

  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity }}>
      <defs>
        <marker id="tangle-rework" viewBox="0 0 10 10" refX="7" refY="5" markerWidth={13} markerHeight={13} markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0,0.8 L9,5 L0,9.2 z" fill={C.rework} />
        </marker>
      </defs>
      {strands.map((s, i) => {
        const d0 = clamp01(draw * 1.6 - (i / COUNT) * 0.6);
        const rs = EASE.camera(clamp01(resolve * 1.5 - (i / COUNT) * 0.5));
        const target = s.target === 'fastest' ? tf : s.target === 'common' ? tc : null;
        const pts = target ? s.pts.map((p, k) => mix(p, target[k], rs)) : s.pts;
        const op = s.target === 'ghost' ? (0.75 - 0.3 * s.tone) * (1 - rs) : (0.75 - 0.3 * s.tone) * (1 - rs * rs);
        if (d0 <= 0 || op <= 0.01) return null;
        return (
          <path
            key={i}
            d={polyD(pts)}
            fill="none"
            stroke={s.tone > 0.7 ? C.ink2 : C.ink3}
            strokeWidth={s.tone > 0.7 ? 2 : 1.6}
            opacity={op}
            pathLength={1}
            strokeDasharray="1 2"
            strokeDashoffset={1 - d0}
          />
        );
      })}
      {loops.map((l, k) => {
        const appear = clamp01(draw * 2 - 0.5 - k * 0.06);
        const rs = EASE.camera(clamp01(resolve * 1.3 - k * 0.03));
        const c = mix(l.c, loopTarget, rs);
        const r = l.r * (1 - 0.5 * rs);
        const op = appear * (0.5 + 0.5 * pulse) * (1 - rs);
        if (op <= 0.01) return null;
        return (
          <g key={k} opacity={op}>
            <circle cx={c.x} cy={c.y} r={r + 10 + 6 * pulse} fill={C.rework} opacity={0.08 + 0.14 * pulse} />
            <path d={arc(c, r * (1 + 0.1 * pulse), l.a0 + frame * 0.025)} fill="none" stroke={C.rework} strokeWidth={3.6} strokeLinecap="round" markerEnd="url(#tangle-rework)" />
          </g>
        );
      })}
    </svg>
  );
};
