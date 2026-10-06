import React from 'react';
import type { Orientation } from '../data/process';
import { fmt } from '../lib/anim';
import { C, FONT } from '../theme';

// Illustrative impact for Customer Verification: ~2,100 hrs/mo ≈ 485 hrs/week ≈ 12 FTE at 40 h/week.
export const COVERAGE = { automatedPct: 34, hoursPerWeek: 485, fte: 12 };

/** Before → after impact once the step is automated with Seek. */
export const CoverageDashboard: React.FC<{
  o: Orientation;
  appear: number;
  after: number; // 0 = before, 1 = after (toggle + counters)
  style?: React.CSSProperties;
}> = ({ o, appear, after, style }) => {
  const h = o === 'h';
  const tiles = [
    { label: 'of process automated', value: `${Math.round(COVERAGE.automatedPct * after)}%`, bar: (COVERAGE.automatedPct / 100) * after, before: '0%' },
    { label: 'hours saved / week', value: fmt(COVERAGE.hoursPerWeek * after), before: '0' },
    { label: 'FTE capacity freed', value: fmt(COVERAGE.fte * after), before: '0' },
  ];
  return (
    <div
      style={{
        fontFamily: FONT,
        background: '#fff',
        border: `1px solid ${C.panelBorder}`,
        borderRadius: h ? 26 : 32,
        boxShadow: '0 4px 16px rgba(24,26,51,0.07), 0 24px 70px rgba(24,26,51,0.10)',
        padding: h ? '28px 40px 34px' : '34px 40px 40px',
        opacity: appear,
        transform: `translateY(${(1 - appear) * 80}px)`,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: h ? 22 : 26 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: h ? 24 : 30, fontWeight: 800, color: C.ink }}>Automation coverage</span>
          {h && <span style={{ fontSize: 18, fontWeight: 500, color: C.ink2 }}>· Purchase to bind</span>}
        </div>
        <div style={{ display: 'flex', background: '#f2f3f8', borderRadius: 12, padding: 4, fontSize: h ? 16 : 20, fontWeight: 700 }}>
          {['Before', 'After'].map((t, i) => {
            const on = i === 1 ? after > 0.02 : after <= 0.02;
            return (
              <span key={t} style={{ padding: h ? '7px 18px' : '9px 22px', borderRadius: 9, background: on ? '#fff' : 'transparent', color: on ? (i === 1 ? C.fastestInk : C.ink) : C.ink2, boxShadow: on ? '0 1px 3px rgba(24,26,51,0.12)' : 'none' }}>
                {t}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: h ? 'row' : 'column', gap: h ? 22 : 18 }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ flex: 1, background: '#fafafd', border: `1px solid ${C.panelBorder}`, borderRadius: 18, padding: h ? '20px 26px' : '22px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span style={{ fontSize: h ? 56 : 64, fontWeight: 800, letterSpacing: '-0.03em', color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{t.value}</span>
              <span style={{ fontSize: h ? 20 : 25, fontWeight: 600, color: C.ink2 }}>{t.label}</span>
            </div>
            {t.bar !== undefined ? (
              <div style={{ height: 10, borderRadius: 10, background: '#eef0f6', marginTop: 12, overflow: 'hidden' }}>
                <div style={{ width: `${t.bar * 100}%`, height: '100%', borderRadius: 10, background: C.fastest }} />
              </div>
            ) : (
              <div style={{ fontSize: h ? 16 : 20, fontWeight: 600, color: C.fastestInk, marginTop: 10, opacity: after }}>
                ▲ from {t.before} before automation
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
