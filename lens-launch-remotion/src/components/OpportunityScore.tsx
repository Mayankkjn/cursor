import React from 'react';
import type { Orientation } from '../data/process';
import { C, FONT } from '../theme';
import { Bolt } from './Icons';

/** Automation Opportunity card: a 300° gauge that fills as the score counts up to 92/100. */
export const OpportunityScore: React.FC<{
  o: Orientation;
  score: number; // animated value 0..92
  appear: number;
  button: number; // "Automate with Seek" entrance 0..1
  press: number; // 0..1 click press
  ripple: number | null; // 0..1 click ripple
  style?: React.CSSProperties;
}> = ({ o, score, appear, button, press, ripple, style }) => {
  const h = o === 'h';
  const R = h ? 168 : 190;
  const SW = h ? 24 : 26;
  const size = (R + SW) * 2;
  const sweep = 300;
  const start = 90 + (360 - sweep) / 2; // gap at the bottom
  const arcLen = (2 * Math.PI * R * sweep) / 360;
  const pt = (deg: number) => ({ x: size / 2 + R * Math.cos((deg * Math.PI) / 180), y: size / 2 + R * Math.sin((deg * Math.PI) / 180) });
  const a = pt(start);
  const b = pt(start + sweep);
  const d = `M${a.x},${a.y} A${R},${R} 0 1 1 ${b.x},${b.y}`;
  const frac = score / 100;

  return (
    <div
      style={{
        fontFamily: FONT,
        background: '#fff',
        border: `1px solid ${C.panelBorder}`,
        borderRadius: h ? 28 : 34,
        boxShadow: '0 4px 16px rgba(24,26,51,0.07), 0 24px 70px rgba(24,26,51,0.08)',
        padding: h ? '40px 48px 44px' : '44px 52px 48px',
        opacity: appear,
        transform: `translateY(${(1 - appear) * 40}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...style,
      }}
    >
      <div style={{ alignSelf: 'stretch' }}>
        <div style={{ fontSize: h ? 15 : 19, fontWeight: 750, letterSpacing: '0.16em', color: C.accent }}>AUTOMATION CANDIDATE</div>
        <div style={{ fontSize: h ? 50 : 62, fontWeight: 800, letterSpacing: '-0.025em', color: C.ink, marginTop: 8 }}>Customer Verification</div>
        <div style={{ fontSize: h ? 19 : 24, fontWeight: 500, color: C.ink2, marginTop: 4 }}>Purchase to bind · step 3</div>
      </div>
      <div style={{ position: 'relative', width: size, height: size * 0.86, marginTop: h ? 18 : 30 }}>
        <svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }}>
          <defs>
            <linearGradient id="gauge" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#f0863a" />
              <stop offset="1" stopColor={C.accent} />
            </linearGradient>
          </defs>
          <path d={d} fill="none" stroke="#eef0f6" strokeWidth={SW} strokeLinecap="round" />
          <path d={d} fill="none" stroke="url(#gauge)" strokeWidth={SW} strokeLinecap="round" strokeDasharray={`${arcLen * frac} ${arcLen * 2}`} opacity={frac > 0.005 ? 1 : 0} />
        </svg>
        <div style={{ position: 'absolute', left: 0, right: 0, top: size * 0.27, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontSize: h ? 132 : 150, fontWeight: 800, color: C.ink, letterSpacing: '-0.04em', lineHeight: 1 }}>{Math.round(score)}</span>
            <span style={{ fontSize: h ? 38 : 44, fontWeight: 700, color: C.ink3, marginLeft: 6 }}>/100</span>
          </div>
          <div style={{ fontSize: h ? 20 : 25, fontWeight: 650, color: C.ink2, marginTop: 10 }}>Automation Opportunity</div>
        </div>
      </div>
      <div
        style={{
          alignSelf: 'stretch',
          height: h ? 72 : 88,
          marginTop: h ? 22 : 24,
          borderRadius: h ? 16 : 20,
          background: C.accent,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          fontSize: h ? 25 : 30,
          fontWeight: 750,
          opacity: button,
          transform: `translateY(${(1 - button) * 16}px) scale(${1 - 0.04 * press})`,
          boxShadow: `0 10px 28px rgba(199,73,0,${0.18 + 0.2 * button})`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Bolt size={h ? 26 : 32} color="#fff" strokeWidth={2.3} />
        Automate with Seek
        {ripple !== null && (
          <span style={{ position: 'absolute', left: '50%', top: '50%', width: 700, height: 700, margin: -350, borderRadius: 700, background: '#fff', opacity: 0.28 * (1 - ripple), transform: `scale(${0.05 + ripple})` }} />
        )}
      </div>
    </div>
  );
};
