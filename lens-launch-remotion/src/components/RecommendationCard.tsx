import React from 'react';
import type { Orientation } from '../data/process';
import { clamp01, fadeUp } from '../lib/anim';
import { C, FONT } from '../theme';
import { Bolt, Check, Users } from './Icons';

const ROWS = [
  { icon: Bolt, strong: '40% faster', rest: 'than the process average' },
  { icon: Check, strong: 'Zero rework', rest: 'on this path' },
  { icon: Users, strong: 'Already used', rest: 'by 1 in 3 users' },
];

export const RecommendationCard: React.FC<{
  o: Orientation;
  progress: number; // 0..1 card entrance; rows stagger inside it
  style?: React.CSSProperties;
}> = ({ o, progress, style }) => {
  const h = o === 'h';
  return (
    <div
      style={{
        fontFamily: FONT,
        background: '#ffffff',
        border: `1px solid ${C.panelBorder}`,
        borderRadius: h ? 20 : 26,
        boxShadow: '0 4px 16px rgba(24,26,51,0.07), 0 22px 60px rgba(24,26,51,0.10)',
        padding: h ? '26px 30px 24px' : '30px 36px 30px',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: C.fastest }} />
      <div style={{ fontSize: h ? 14 : 18, fontWeight: 750, letterSpacing: '0.14em', color: C.fastestInk, marginBottom: 10 }}>RECOMMENDATION</div>
      <div style={{ fontSize: h ? 40 : 50, fontWeight: 800, color: C.ink, letterSpacing: '-0.02em', marginBottom: h ? 16 : 20 }}>
        Standardize <span style={{ color: C.fastest }}>Path B</span>
      </div>
      {ROWS.map((r, i) => {
        const p = clamp01(progress * 2.2 - 0.6 - i * 0.28);
        const Icon = r.icon;
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: h ? '11px 0' : '14px 0',
              borderTop: `1px solid ${C.panelBorder}`,
              fontSize: h ? 23 : 29,
              color: C.ink2,
              fontWeight: 500,
              ...fadeUp(p, 10),
            }}
          >
            <span style={{ width: h ? 34 : 42, height: h ? 34 : 42, borderRadius: 10, background: C.fastestSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={h ? 18 : 22} color={C.fastest} strokeWidth={2.4} />
            </span>
            <span style={{ color: C.ink, fontWeight: 750 }}>{r.strong}</span>
            {r.rest}
          </div>
        );
      })}
    </div>
  );
};
