import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { prog } from '../lib/anim';
import { useOrientation } from '../lib/useOrientation';
import { Background } from '../components/Background';
import { Camera } from '../components/Camera';
import { EndCard } from '../components/EndCard';
import { B, EASE, scene } from '../theme';

const S = scene('end');

/** END 45–60s: logo resolve, "Know what to automate next.", Book a demo, the final line. */
export const EndScene: React.FC<{ ctaUrl: string; kinetic?: boolean }> = ({ ctaUrl, kinetic }) => {
  const o = useOrientation();
  const f = useCurrentFrame() + S.from;
  const push = 1 + 0.03 * prog(f, B.endWordmark, S.to - B.endWordmark, EASE.camera);
  return (
    <AbsoluteFill>
      <Background glow={0.9} grid={0.6} />
      <Camera scale={push}>
        <EndCard o={o} frame={f} ctaUrl={ctaUrl} kinetic={kinetic} />
      </Camera>
    </AbsoluteFill>
  );
};
