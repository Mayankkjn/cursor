import React from 'react';
import { LOGO_COLORS } from '../theme';

// The Whatfix Lens aperture mark, rebuilt as vectors from the supplied 57px PNG:
// a regular octagon whose eight blades are triangles (V_k, V_k+1, C_k), each inset
// by half the gap so blades can animate independently.
type Pt2 = [number, number];
const BLADES = (() => {
  const C = 28.5;
  const R = 28.5 / Math.cos(Math.PI / 8);
  const s = 2 * R * Math.sin(Math.PI / 8);
  const L = 0.78;
  const GAP = 1.15;
  const V: Pt2[] = [...Array(8)].map((_, k) => {
    const a = ((-112.5 + 45 * k) * Math.PI) / 180;
    return [C + R * Math.cos(a), C + R * Math.sin(a)];
  });
  const inset = (pts: Pt2[], d: number[]): Pt2[] => {
    const lines = pts.map((p, i) => {
      const q = pts[(i + 1) % 3];
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const nx = -(q[1] - p[1]) / len;
      const ny = (q[0] - p[0]) / len;
      return { p: [p[0] + nx * d[i], p[1] + ny * d[i]] as Pt2, v: [q[0] - p[0], q[1] - p[1]] as Pt2 };
    });
    return lines.map((l1, i) => {
      const l0 = lines[(i + 2) % 3];
      const den = l0.v[0] * l1.v[1] - l0.v[1] * l1.v[0];
      const t = ((l1.p[0] - l0.p[0]) * l1.v[1] - (l1.p[1] - l0.p[1]) * l1.v[0]) / den;
      return [l0.p[0] + l0.v[0] * t, l0.p[1] + l0.v[1] * t] as Pt2;
    });
  };
  return V.map((a, k) => {
    const b = V[(k + 1) % 8];
    const dx = (b[0] - a[0]) / s;
    const dy = (b[1] - a[1]) / s;
    const c: Pt2 = [b[0] - dy * L * s, b[1] + dx * L * s];
    return { pts: inset([a, b, c], [0, GAP / 2, GAP / 2]), color: LOGO_COLORS[k] };
  });
})();

/** Octagon outline in logo units (viewBox 0..57) — the shape the end-card line traces. */
export const LOGO_OCTAGON: Pt2[] = (() => {
  const C = 28.5;
  const R = 28.5 / Math.cos(Math.PI / 8);
  return [...Array(8)].map((_, k) => {
    const a = ((-112.5 + 45 * k) * Math.PI) / 180;
    return [C + R * Math.cos(a), C + R * Math.sin(a)] as Pt2;
  });
})();

export const LensLogo: React.FC<{
  size: number;
  /** Per-blade reveal 0..1 — omit for a static, fully formed mark. */
  bladeProgress?: (i: number) => number;
  white?: boolean;
  style?: React.CSSProperties;
}> = ({ size, bladeProgress, white, style }) => (
  <svg width={size} height={size} viewBox="-0.5 -0.5 58 58" style={{ display: 'block', overflow: 'visible', ...style }}>
    {BLADES.map((bl, i) => {
      const p = bladeProgress ? bladeProgress(i) : 1;
      const transform = `rotate(${-120 * (1 - p)} 28.5 28.5) translate(28.5 28.5) scale(${0.2 + 0.8 * p}) translate(-28.5 -28.5)`;
      return (
        <polygon
          key={i}
          points={bl.pts.map((q) => q.map((n) => n.toFixed(2)).join(',')).join(' ')}
          fill={white ? '#ffffff' : bl.color}
          opacity={p}
          transform={transform}
        />
      );
    })}
  </svg>
);
