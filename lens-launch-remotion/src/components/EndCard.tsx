import React from 'react';
import type { Orientation } from '../data/process';
import { clamp01, prog } from '../lib/anim';
import { B, C, EASE, FONT } from '../theme';
import { Arrow } from './Icons';
import { LOGO_OCTAGON, LensLogo } from './LensLogo';
import { Super } from './Super';

const LAYOUT = {
  h: { logo: { cx: 542, cy: 400, size: 172 }, wordmark: { left: 670, top: 400, size: 132 }, tagline: 590, cta: 735, hook: 958, lineFrom: [-40, 860] },
  v: { logo: { cx: 540, cy: 610, size: 232 }, wordmark: { left: 0, top: 860, size: 118 }, tagline: 1010, cta: 1240, hook: 1640, lineFrom: [-40, 1560] },
} as const;

/** END 45–60s: the golden path draws a line that resolves into the Whatfix Lens mark, then the CTA. */
export const EndCard: React.FC<{ o: Orientation; frame: number; ctaUrl: string }> = ({ o, frame: f, ctaUrl }) => {
  const h = o === 'h';
  const Lay = LAYOUT[o];
  const { cx, cy, size } = Lay.logo;
  const k = size / 58;
  const oct = LOGO_OCTAGON.map(([x, y]) => [cx + (x - 28.5) * k, cy + (y - 28.5) * k]);
  const [sx, sy] = Lay.lineFrom;
  const d = h
    ? `M${sx},${sy} C${260},${sy} ${300},${cy + 260} ${oct[5][0] - 140},${oct[5][1] + 40} S${oct[5][0]},${oct[5][1]} ${oct[5][0]},${oct[5][1]} ` +
      [6, 7, 0, 1, 2, 3, 4, 5].map((i) => `L${oct[i][0].toFixed(1)},${oct[i][1].toFixed(1)}`).join(' ')
    : `M${sx},${sy} C${220},${sy} ${120},${cy + 420} ${oct[5][0] - 60},${oct[5][1] + 150} S${oct[5][0]},${oct[5][1]} ${oct[5][0]},${oct[5][1]} ` +
      [6, 7, 0, 1, 2, 3, 4, 5].map((i) => `L${oct[i][0].toFixed(1)},${oct[i][1].toFixed(1)}`).join(' ');

  const draw = prog(f, B.endLineFrom, B.endLineTo - B.endLineFrom, EASE.camera);
  const lineOut = prog(f, B.endLogoResolve + 6, 22);
  const blade = (i: number) => prog(f, B.endLogoResolve + i * 2, 18, EASE.settle);
  const flash = prog(f, B.endChord - 4, 8) * (1 - prog(f, B.endChord + 4, 30));
  const word = prog(f, B.endWordmark, 22, EASE.settle);
  const cta = prog(f, B.endCta, 20);
  const hookP = prog(f, B.endHook, 24);
  const wordStyle: React.CSSProperties = { fontSize: Lay.wordmark.size, fontWeight: 800, letterSpacing: '-0.045em', color: C.ink, lineHeight: 1, whiteSpace: 'nowrap' };

  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      {/* the golden path, resolving into the mark */}
      <svg width={h ? 1920 : 1080} height={h ? 1080 : 1920} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: 1 - lineOut }}>
        <defs>
          <filter id="end-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        <path d={d} fill="none" stroke={C.fastest} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" opacity={0.25} filter="url(#end-glow)" pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - draw} />
        <path d={d} fill="none" stroke={C.fastest} strokeWidth={h ? 6 : 7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - draw} />
      </svg>
      <div style={{ position: 'absolute', left: cx - size * 1.4, top: cy - size * 1.4, width: size * 2.8, height: size * 2.8, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,87,3,0.28) 0%, rgba(244,87,3,0) 65%)', opacity: flash }} />
      <div style={{ position: 'absolute', left: cx - size / 2, top: cy - size / 2 }}>
        <LensLogo size={size} bladeProgress={blade} />
      </div>

      {/* wordmark */}
      <div
        style={{
          position: 'absolute',
          ...(h ? { left: Lay.wordmark.left, top: Lay.wordmark.top, transform: 'translateY(-52%)' } : { left: 0, right: 0, top: Lay.wordmark.top, display: 'flex', justifyContent: 'center' }),
          clipPath: `inset(-20% ${(1 - word) * 100}% -20% 0)`,
        }}
      >
        <div style={{ ...wordStyle, transform: `translateX(${(1 - word) * -24}px)` }}>
          Whatfix <span style={{ color: '#f45703' }}>Lens</span>
        </div>
      </div>

      {/* tagline */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: Lay.tagline, display: 'flex', justifyContent: 'center' }}>
        <Super inP={prog(f, B.endTagline, 20, (t) => t)} style={{ fontSize: h ? 66 : 60, fontWeight: 750, letterSpacing: '-0.03em', color: C.ink }} tracking>
          Know what to <span style={{ color: C.accent }}>automate</span> next.
        </Super>
      </div>

      {/* CTA */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: Lay.cta,
          display: 'flex',
          flexDirection: h ? 'row' : 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: h ? 34 : 30,
          opacity: cta,
          transform: `translateY(${(1 - cta) * 20}px)`,
        }}
      >
        <div
          style={{
            height: h ? 78 : 96,
            padding: h ? '0 40px' : '0 52px',
            borderRadius: h ? 18 : 22,
            background: C.accent,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: h ? 29 : 36,
            fontWeight: 750,
            boxShadow: '0 14px 34px rgba(199,73,0,0.30)',
          }}
        >
          Book a demo <Arrow size={h ? 28 : 34} color="#fff" strokeWidth={2.6} />
        </div>
        <div style={{ fontSize: h ? 28 : 34, fontWeight: 650, color: C.ink2, letterSpacing: '-0.01em' }}>{ctaUrl}</div>
      </div>

      {/* final hook, small */}
      <div
        style={{
          position: 'absolute',
          left: h ? 0 : 90,
          right: h ? 0 : 90,
          top: Lay.hook,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          textAlign: 'center',
          opacity: hookP,
          transform: `translateY(${(1 - hookP) * 12}px)`,
          fontSize: h ? 24 : 32,
          fontWeight: 600,
          color: C.ink2,
          lineHeight: 1.35,
        }}
      >
        {h && <span style={{ width: 9, height: 9, borderRadius: 9, background: C.fastest, opacity: clamp01(hookP * 2) }} />}
        Discovery only matters when it leads to a decision.
      </div>
    </div>
  );
};
