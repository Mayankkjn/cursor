import React from 'react';
import { AbsoluteFill } from 'remotion';

/**
 * A virtual camera: slow push-ins and re-framing are scale/translate on this layer,
 * and rack focus is a blur on whichever layer is out of focus.
 */
export const Camera: React.FC<{
  scale?: number;
  x?: number;
  y?: number;
  blur?: number;
  opacity?: number;
  origin?: string;
  children: React.ReactNode;
}> = ({ scale = 1, x = 0, y = 0, blur = 0, opacity = 1, origin = '50% 50%', children }) => (
  <AbsoluteFill
    style={{
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      transformOrigin: origin,
      filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
      opacity,
    }}
  >
    {children}
  </AbsoluteFill>
);
