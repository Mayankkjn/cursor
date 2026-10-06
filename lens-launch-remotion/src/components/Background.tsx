import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C } from '../theme';

/** Product canvas: #f6f6f9 with the map's faint dot grid. */
export const Background: React.FC<{ glow?: number; grid?: number }> = ({ glow = 0, grid = 1 }) => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill
      style={{
        opacity: 0.55 * grid,
        backgroundImage: `radial-gradient(${C.grid} 1.3px, transparent 1.4px)`,
        backgroundSize: '28px 28px',
        backgroundPosition: '14px 14px',
      }}
    />
    {glow > 0 && (
      <AbsoluteFill
        style={{
          opacity: glow,
          background: 'radial-gradient(ellipse 60% 55% at 50% 45%, #ffffff 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0) 75%)',
        }}
      />
    )}
  </AbsoluteFill>
);
