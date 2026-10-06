import React from 'react';
import type { Orientation } from '../data/process';
import { clamp01, prog } from '../lib/anim';
import { C, EASE, FONT, TYPE } from '../theme';

export const LOOP_WORDS = ['OBSERVE', 'UNDERSTAND', 'DECIDE', 'AUTOMATE', 'MEASURE'];

/**
 * OBSERVE → UNDERSTAND → DECIDE → AUTOMATE → MEASURE.
 * One big word per beat (rises out of a mask, tracking tightens), with the full loop
 * underneath lighting up step by step and closing back on itself at the end.
 */
export const KineticLoop: React.FC<{ o: Orientation; frame: number; wordFrames: number[]; closeFrame: number; appear?: number }> = ({ o, frame, wordFrames, closeFrame, appear = 1 }) => {
  const h = o === 'h';
  const active = wordFrames.filter((w) => frame >= w).length - 1;
  const rowY = h ? 735 : 1180;
  const close = prog(frame, closeFrame, 13, EASE.settle);

  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT, opacity: appear }}>
      {/* big word */}
      {LOOP_WORDS.map((w, i) => {
        const inP = clamp01((frame - wordFrames[i]) / 10);
        const outP = i < LOOP_WORDS.length - 1 ? clamp01((frame - wordFrames[i + 1]) / 8) : 0;
        if (inP <= 0 || outP >= 1) return null;
        const ei = EASE.settle(inP);
        const eo = EASE.exit(outP);
        return (
          <div key={w} style={{ position: 'absolute', left: 0, right: 0, top: h ? 380 : 760, height: TYPE.kinetic * 1.25, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                fontSize: h ? TYPE.kinetic : 112,
                fontWeight: 800,
                letterSpacing: `${(1 - ei) * 0.12 - 0.03}em`,
                color: w === 'AUTOMATE' ? C.accent : C.ink,
                transform: `translateY(${(1 - ei) * 100 - eo * 70}%)`,
                opacity: (1 - eo) * Math.min(1, ei * 1.5),
                lineHeight: 1.2,
              }}
            >
              {w}
            </div>
          </div>
        );
      })}

      {/* the loop, lighting up */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: rowY, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: h ? 22 : 12 }}>
        {LOOP_WORDS.map((w, i) => {
          const lit = clamp01((frame - wordFrames[i]) / 6);
          const seen = clamp01((frame - wordFrames[0] + 6) / 10);
          return (
            <React.Fragment key={w}>
              {i > 0 && <span style={{ color: lit > 0 ? C.fastest : C.ink3, fontSize: h ? 26 : 20, fontWeight: 700, opacity: seen }}>→</span>}
              <span style={{ position: 'relative', fontSize: h ? 24 : 19, fontWeight: 750, letterSpacing: '0.14em', color: lit > 0.5 ? (i === active ? C.ink : C.ink2) : C.ink3, opacity: seen }}>
                {w}
                <span
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: -18,
                    width: 8,
                    height: 8,
                    marginLeft: -4,
                    borderRadius: 8,
                    background: C.fastest,
                    transform: `scale(${i === active ? 1 : lit * 0.6})`,
                    opacity: lit,
                  }}
                />
              </span>
            </React.Fragment>
          );
        })}
      </div>
      {/* loop closes: MEASURE feeds back into OBSERVE */}
      {close > 0 && (
        <svg width={h ? 1920 : 1080} height={h ? 1080 : 1920} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <marker id="loop-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth={14} markerHeight={14} markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0,0.8 L9,5 L0,9.2 z" fill={C.fastest} />
            </marker>
          </defs>
          <path
            d={h ? `M1400,${rowY + 46} C1400,${rowY + 118} 508,${rowY + 118} 508,${rowY + 50}` : `M930,${rowY + 44} C930,${rowY + 110} 150,${rowY + 110} 150,${rowY + 48}`}
            fill="none"
            stroke={C.fastest}
            strokeWidth={3}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1 2"
            strokeDashoffset={1 - close}
            markerEnd={close > 0.95 ? 'url(#loop-arrow)' : undefined}
          />
        </svg>
      )}
    </div>
  );
};
