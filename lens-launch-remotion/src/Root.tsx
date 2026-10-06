import React from 'react';
import { Composition } from 'remotion';
import './fonts';
import { LensLaunch, launchSchema, type LaunchProps } from './LensLaunch';
import { LensLaunchVertical, VERTICAL_DURATION } from './LensLaunchVertical';
import { T } from './theme';

const defaultProps: LaunchProps = {
  // On-screen CTA URL. Swap for the Lens landing page once it exists.
  ctaUrl: 'whatfix.com',
  withAudio: true,
  // Drop a recorded VO at public/audio/vo.wav and set voSrc: 'audio/vo.wav' — the music ducks under it automatically.
  voSrc: undefined,
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="LensLaunch" component={LensLaunch} schema={launchSchema} defaultProps={defaultProps} durationInFrames={T.durationInFrames} fps={T.fps} width={T.width} height={T.height} />
    <Composition id="LensLaunchVertical" component={LensLaunchVertical} schema={launchSchema} defaultProps={defaultProps} durationInFrames={VERTICAL_DURATION} fps={T.fps} width={T.vertical.width} height={T.vertical.height} />
  </>
);
