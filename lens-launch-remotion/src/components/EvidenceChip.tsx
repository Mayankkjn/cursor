import React from 'react';
import type { Orientation } from '../data/process';
import { clamp01 } from '../lib/anim';
import { C, FONT } from '../theme';

export type ChipTone = 'neutral' | 'rework' | 'accent';

const TONES: Record<ChipTone, { tile: string; icon: string; value: string; bg: string; border: string }> = {
  neutral: { tile: '#f2f3f8', icon: C.iconInk, value: C.ink, bg: '#ffffff', border: C.panelBorder },
  rework: { tile: C.reworkSoft, icon: C.rework, value: C.reworkInk, bg: '#ffffff', border: C.panelBorder },
  accent: { tile: '#ffffff', icon: C.accent, value: C.accentInk, bg: C.accentSoft, border: '#f3c9a8' },
};

/** One piece of evidence behind the score: icon, a big number, what it measures. */
export const EvidenceChip: React.FC<{
  o: Orientation;
  icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }>;
  value: string;
  label: string;
  tone?: ChipTone;
  progress: number; // spring 0..~1.05 (a hint of overshoot)
}> = ({ o, icon: Icon, value, label, tone = 'neutral', progress }) => {
  const h = o === 'h';
  const t = TONES[tone];
  const p = Math.max(0, progress);
  return (
    <div
      style={{
        fontFamily: FONT,
        display: 'flex',
        alignItems: 'center',
        gap: h ? 22 : 26,
        background: t.bg,
        border: `1.5px solid ${t.border}`,
        borderRadius: h ? 20 : 24,
        padding: h ? '18px 26px' : '22px 30px',
        boxShadow: '0 4px 16px rgba(24,26,51,0.06)',
        opacity: clamp01(p * 1.6),
        transform: `translateX(${(1 - p) * 60}px) scale(${0.96 + 0.04 * p})`,
        transformOrigin: 'left center',
      }}
    >
      <div style={{ width: h ? 60 : 72, height: h ? 60 : 72, borderRadius: h ? 16 : 20, background: t.tile, border: tone === 'accent' ? '1.5px solid #f3c9a8' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={h ? 28 : 34} color={t.icon} strokeWidth={2.2} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: h ? 16 : 18, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: h ? 42 : 52, fontWeight: 800, letterSpacing: '-0.025em', color: t.value, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        <span style={{ fontSize: h ? 22 : 27, fontWeight: 550, color: C.ink2 }}>{label}</span>
      </div>
    </div>
  );
};
