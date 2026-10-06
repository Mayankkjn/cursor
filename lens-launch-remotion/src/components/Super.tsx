import React from 'react';
import { clamp01 } from '../lib/anim';
import { EASE } from '../theme';

/**
 * A single line of on-screen type that rises out of a mask (in) and lifts away (out).
 * `inP`/`outP` are linear 0..1 progresses; easing is applied here.
 */
export const Super: React.FC<{
  inP: number;
  outP?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  tracking?: boolean; // letter-spacing settles in with the rise
}> = ({ inP, outP = 0, children, style, tracking }) => {
  const i = EASE.settle(clamp01(inP));
  const o = EASE.exit(clamp01(outP));
  if (i <= 0 || o >= 1) return null;
  return (
    <div style={{ overflow: 'hidden', paddingBottom: '0.14em', marginBottom: '-0.14em', ...style }}>
      <div
        style={{
          transform: `translateY(${(1 - i) * 100 - o * 60}%)`,
          opacity: Math.min(i * 1.4, 1) * (1 - o),
          letterSpacing: tracking ? `${(1 - i) * 0.06 - 0.025}em` : undefined,
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </div>
    </div>
  );
};
