import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { prog } from '../lib/anim';
import { Background } from '../components/Background';
import { Camera } from '../components/Camera';
import { B, C, EASE, scene } from '../theme';
import { Swarm, swarmCount } from './Swarm';
import { KLine } from './type';

const S = scene('hook');

/** HOOK 0–5s — a hundred copies of "process", rework pulsing on the beat; the question lands on "automate?". */
export const KHook: React.FC = () => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const f = useCurrentFrame() + S.from;
  const big = v ? 128 : 156;
  const n = swarmCount(f);
  const linesOut = B.hookQuestion;

  return (
    <AbsoluteFill>
      <Background grid={0.4} />
      <Camera scale={1 + 0.05 * prog(f, 0, S.to, EASE.camera)}>
        <Swarm f={f} W={W} H={H} dim={prog(f, B.hookQuestion, 18)} />
      </Camera>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse ${v ? '75% 30%' : '48% 34%'} at 50% 50%, rgba(246,246,249,0.97) 40%, rgba(246,246,249,0.7) 65%, rgba(246,246,249,0) 100%)` }} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: v ? 6 : 4, padding: v ? '0 60px' : 0 }}>
        {f < linesOut + 10 ? (
          <>
            <KLine f={f} size={big} exitAt={linesOut} words={[{ t: 'Same', at: B.hookLine1 }, { t: 'process.', at: B.hookLine1 + 8 }]} />
            <KLine
              f={f}
              size={big}
              exitAt={linesOut + 3}
              words={[
                { t: String(n).padStart(3, '\u2007'), at: B.hookLine2 + 10, enter: 'slam', color: C.rework },
                { t: 'ways', at: B.hookLine2 + 14, enter: 'slam', color: C.rework },
                { t: 'to', at: B.hookLine2 + 28 },
                { t: 'run', at: B.hookLine2 + 32 },
                { t: 'it.', at: B.hookLine2 + 36 },
              ]}
            />
          </>
        ) : (
          <>
            <KLine f={f} size={v ? 120 : 132} words={[{ t: 'Which', at: 88 }, { t: 'one', at: 94 }, { t: 'do', at: 100 }, { t: 'you', at: 106 }]} />
            <KLine f={f} size={v ? 170 : 220} tracking="-0.05em" words={[{ t: 'automate?', at: 112, enter: 'slam', color: C.accent }]} />
          </>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
