import React from 'react';
import type { Orientation } from '../data/process';
import { C, FONT } from '../theme';

/** Small legal-safe label: every number in the film is an illustrative concept figure. */
export const Illustrative: React.FC<{ o: Orientation; appear: number }> = ({ o, appear }) => (
  <div
    style={{
      position: 'absolute',
      right: o === 'h' ? 64 : 56,
      bottom: o === 'h' ? 14 : 22,
      fontFamily: FONT,
      fontSize: o === 'h' ? 13 : 17,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: C.ink3,
      opacity: appear,
    }}
  >
    Illustrative figures
  </div>
);
