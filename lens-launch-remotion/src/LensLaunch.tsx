import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { z } from 'zod';
import { Soundtrack } from './components/Soundtrack';
import { DemoScene } from './scenes/DemoScene';
import { EndScene } from './scenes/EndScene';
import { HookScene } from './scenes/HookScene';
import { MorphScene } from './scenes/MorphScene';
import { ProofScene } from './scenes/ProofScene';
import { C, scene, type SceneId } from './theme';

export const launchSchema = z.object({
  ctaUrl: z.string(),
  withAudio: z.boolean(),
  voSrc: z.string().optional(),
});
export type LaunchProps = z.infer<typeof launchSchema>;

export const SCENES: { id: SceneId; name: string; Comp: React.FC<{ ctaUrl: string }> }[] = [
  { id: 'hook', name: '1 · HOOK', Comp: HookScene },
  { id: 'demo', name: '2 · DEMO', Comp: DemoScene },
  { id: 'morph', name: '3 · MORPH', Comp: MorphScene },
  { id: 'proof', name: '4 · PROOF', Comp: ProofScene },
  { id: 'end', name: '5 · END', Comp: EndScene },
];

/** 16:9 master — 60s, five scenes on hard frame boundaries (see timeline.json). */
export const LensLaunch: React.FC<LaunchProps> = ({ ctaUrl, withAudio, voSrc }) => (
  <AbsoluteFill style={{ background: C.bg }}>
    {SCENES.map(({ id, name, Comp }) => {
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
