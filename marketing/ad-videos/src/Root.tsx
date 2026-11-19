import React from 'react';
import { Composition } from 'remotion';
import { PaperAd } from './Paper';
import { RaceAd } from './Race';
import { BeforeAfterAd } from './BeforeAfter';

const V = { fps: 30, width: 1080, height: 1920 };
export const Root: React.FC = () => (
  <>
    <Composition id="PaperAd" component={PaperAd} durationInFrames={600} {...V} />
    <Composition id="RaceAd" component={RaceAd} durationInFrames={480} {...V} />
    <Composition id="BeforeAfterAd" component={BeforeAfterAd} durationInFrames={480} {...V} />
  </>
);
