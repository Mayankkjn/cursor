import React from 'react';

/**
 * One route, drawn on along its length. `glow` adds the soft halo used only for the
 * fastest ("golden") path; `comet` sends a short bright pulse down the line.
 */
export const PathHighlight: React.FC<{
  d: string;
  color: string;
  width: number;
  draw: number; // 0..1 how much of the route is drawn
  opacity?: number;
  glow?: number; // 0..1
  comet?: number; // 0..1 position of the travelling pulse, undefined = none
  cometColor?: string;
}> = ({ d, color, width, draw, opacity = 1, glow = 0, comet, cometColor = '#ffffff' }) => {
  if (draw <= 0.001 || opacity <= 0.001) return null;
  const dash = { pathLength: 1, strokeDasharray: '1 2', strokeDashoffset: 1 - draw };
  return (
    <g opacity={opacity} style={{ pointerEvents: 'none' }}>
      {glow > 0 && (
        <path d={d} fill="none" stroke={color} strokeWidth={width + 14} strokeLinecap="round" strokeLinejoin="round" opacity={0.22 * glow} filter="url(#glow-blur)" {...dash} />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" {...dash} />
      {comet !== undefined && comet > 0 && comet < 1 && (
        <>
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={width + 16}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="0.06 2"
            strokeDashoffset={0.06 - comet * 1.06}
            opacity={0.45}
            filter="url(#glow-blur)"
          />
          <path d={d} fill="none" stroke={cometColor} strokeWidth={Math.max(2, width - 2)} strokeLinecap="round" pathLength={1} strokeDasharray="0.05 2" strokeDashoffset={0.05 - comet * 1.05} opacity={0.9} />
        </>
      )}
    </g>
  );
};
