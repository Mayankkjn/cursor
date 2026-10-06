import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Soundtrack } from './components/Soundtrack';
import { SCENES, type LaunchProps } from './LensLaunch';
import { C, T } from './theme';

/** Cut points are on beats of the 72 BPM score, so the audio slices stay musical. */
export const VERTICAL_SEGMENTS = T.vertical.segments as [number, number][];
export const VERTICAL_DURATION = VERTICAL_SEGMENTS.reduce((n, [a, b]) => n + (b - a), 0);

const sceneAt = (frame: number) => SCENES.find(({ id }) => {
  const s = T.scenes.find((x) => x.id === id)!;
  return frame >= s.from && frame < s.to;
})!;

/**
 * 9:16 social cutdown (~33s): the same scene components re-laid out for portrait
 * (they read the composition's aspect ratio), cut from master frame ranges.
 * Morph is dropped; hook, demo highlights, recommendation, score + evidence, end card stay.
 */
export const LensLaunchVertical: React.FC<LaunchProps> = ({ ctaUrl, withAudio, voSrc }) => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {VERTICAL_SEGMENTS.map(([a, b], i) => {
        const { Comp, name } = sceneAt(a);
        const s = T.scenes.find((x) => x.id === sceneAt(a).id)!;
        const from = at;
        at += b - a;
        return (
          <Sequence key={i} from={from} durationInFrames={b - a} name={`${name} [${a}–${b}]`}>
            {/* shift the scene so its local frame matches the master */}
            <Sequence from={-(a - s.from)} layout="none">
              <Comp ctaUrl={ctaUrl} />
            </Sequence>
            {withAudio && <Soundtrack voSrc={voSrc} trimBefore={a} length={b - a} edgeFade={2} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
