import React from 'react';
import type { Orientation } from '../data/process';
import { C, FONT } from '../theme';
import { Sparkle } from './Icons';

type Seg = { t: string; k?: 'strong' | 'fastest' | 'rework' };
export const SUMMARY: Seg[] = [
  { t: 'The most common path is ' },
  { t: '25% slower', k: 'strong' },
  { t: ' than ' },
  { t: 'Path B', k: 'fastest' },
  { t: '. ' },
  { t: 'Approval', k: 'strong' },
  { t: ' is the biggest time sink, and ' },
  { t: '38% of users repeat verification', k: 'rework' },
  { t: '.' },
];
export const SUMMARY_LENGTH = SUMMARY.reduce((n, s) => n + s.t.length, 0);
/** Character index where a segment starts — used to sync map badges to the typing. */
export const summaryIndexOf = (text: string) => {
  let n = 0;
  for (const s of SUMMARY) {
    if (s.t === text) return n;
    n += s.t.length;
  }
  return 0;
};

const segStyle = (k: Seg['k']): React.CSSProperties => {
  switch (k) {
    case 'strong':
      return { fontWeight: 750, color: C.ink };
    case 'fastest':
      return { fontWeight: 700, color: C.fastestInk, background: C.fastestSoft, borderRadius: 8, padding: '0 5px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' };
    case 'rework':
      return { fontWeight: 650, color: C.reworkInk, background: C.reworkSoft, borderRadius: 8, padding: '0 4px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' };
    default:
      return {};
  }
};

export const AISummaryPanel: React.FC<{
  o: Orientation;
  chars: number; // typed characters
  frame: number;
  style?: React.CSSProperties;
}> = ({ o, chars, frame, style }) => {
  const h = o === 'h';
  let left = chars;
  const caretOn = chars < SUMMARY_LENGTH ? true : Math.floor(frame / 12) % 2 === 0;
  return (
    <div
      style={{
        fontFamily: FONT,
        background: '#ffffff',
        border: `1px solid ${C.panelBorder}`,
        borderRadius: h ? 20 : 26,
        boxShadow: '0 4px 16px rgba(24,26,51,0.07), 0 18px 50px rgba(24,26,51,0.08)',
        padding: h ? '26px 30px 30px' : '30px 36px 34px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: h ? 18 : 20 }}>
        <div style={{ width: h ? 34 : 42, height: h ? 34 : 42, borderRadius: 10, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkle size={h ? 19 : 24} color="#fff" strokeWidth={2.2} />
        </div>
        <span style={{ fontSize: h ? 20 : 26, fontWeight: 750, color: C.ink }}>AI Summary</span>
        <span style={{ fontSize: h ? 16 : 20, fontWeight: 500, color: C.ink2 }}>· Purchase to bind</span>
      </div>
      <div style={{ fontSize: h ? 27 : 33, lineHeight: 1.55, color: '#4a4e66', fontWeight: 500, minHeight: h ? 168 : 205 }}>
        {SUMMARY.map((s, i) => {
          if (left <= 0) return null;
          const shown = s.t.slice(0, left);
          left -= s.t.length;
          return (
            <span key={i} style={segStyle(s.k)}>
              {shown}
            </span>
          );
        })}
        <span style={{ display: 'inline-block', width: 3, height: '1.05em', marginLeft: 3, verticalAlign: '-0.15em', background: C.accent, opacity: caretOn ? 1 : 0 }} />
      </div>
    </div>
  );
};
