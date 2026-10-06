import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Soundtrack } from './components/Soundtrack';
import { KDemo } from './kinetic/KDemo';
import { KHook } from './kinetic/KHook';
import { KMorph } from './kinetic/KMorph';
import { KProof } from './kinetic/KProof';
import { type LaunchProps, SCENES } from './LensLaunch';
import { VerticalCut } from './LensLaunchVertical';
import { EndScene } from './scenes/EndScene';
import { C, scene } from './theme';

const KEnd: React.FC<{ ctaUrl: string }> = ({ ctaUrl }) => <EndScene ctaUrl={ctaUrl} kinetic />;

/**
 * Kinetic-typography cut: type is the picture. Same timeline, same beats, same score and
 * SFX stems as the UI cut — every word lands on a VO syllable, a click or a beat.
 */
export const KINETIC_SCENES: typeof SCENES = [
  { id: 'hook', name: '1 · HOOK (type)', Comp: KHook },
  { id: 'demo', name: '2 · DEMO (type)', Comp: KDemo },
  { id: 'morph', name: '3 · MORPH (type)', Comp: KMorph },
  { id: 'proof', name: '4 · PROOF (type)', Comp: KProof },
  { id: 'end', name: '5 · END (type)', Comp: KEnd },
];

export const LensKinetic: React.FC<LaunchProps> = ({ ctaUrl, withAudio, voSrc }) => (
  <AbsoluteFill style={{ background: C.bg }}>
    {KINETIC_SCENES.map(({ id, name, Comp }) => {
      const s = scene(id);
      return (
        <Sequence key={id} from={s.from} durationInFrames={s.to - s.from} name={name}>
          <Comp ctaUrl={ctaUrl} />
        </Sequence>
      );
    })}
    {withAudio && <Soundtrack voSrc={voSrc} />}
  </AbsoluteFill>
);

export const LensKineticVertical: React.FC<LaunchProps> = (props) => <VerticalCut {...props} scenes={KINETIC_SCENES} />;
