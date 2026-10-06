import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { LAYOUT, STATS } from '../data/process';
import { beatPulse, fadeUp, prog } from '../lib/anim';
import { routeGeom } from '../lib/mapGeometry';
import { useOrientation } from '../lib/useOrientation';
import { Background } from '../components/Background';
import { Camera } from '../components/Camera';
import { Super } from '../components/Super';
import { Tangle } from '../components/Tangle';
import { B, C, EASE, FONT, T, TYPE, scene } from '../theme';

const S = scene('hook');

/** HOOK 0–5s: the same process run a hundred ways, rework loops pulsing on the beat. */
export const HookScene: React.FC = () => {
  const o = useOrientation();
  const h = o === 'h';
  const f = useCurrentFrame() + S.from;
  const pos = LAYOUT[o].pos;
  const targets = { fastest: routeGeom('fastest', pos, o).pts, common: routeGeom('common', pos, o).pts };

  const push = 1 + 0.05 * prog(f, S.from, S.to - S.from, EASE.camera);
  const variants = Math.round(interpolate(f, [B.hookCounterFrom, B.hookCounterTo], [1, 100], { easing: EASE.settle, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const pulse = beatPulse(f, T.beatFrames, 3);
  const qIn = prog(f, B.hookQuestion + 6, 22, (t) => t);
  const linesOut = prog(f, B.hookQuestion, 14, (t) => t);

  const textBox: React.CSSProperties = h
    ? { position: 'absolute', left: 0, right: 0, top: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }
    : { position: 'absolute', left: 70, right: 70, top: 1500, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' };
  const big: React.CSSProperties = { fontFamily: FONT, fontSize: h ? TYPE.display : 104, fontWeight: 800, color: C.ink, letterSpacing: '-0.035em', lineHeight: 1.04 };

  return (
    <AbsoluteFill>
      <Background />
      <Camera scale={push}>
        <Tangle o={o} frame={f} draw={prog(f, 0, 80, EASE.settle)} resolve={0} targets={targets} loopTarget={pos.verification} />
      </Camera>
      {/* soft backdrop keeps the type legible over the tangle */}
      <AbsoluteFill
        style={{
          background: h
            ? 'radial-gradient(ellipse 820px 300px at 50% 47%, rgba(246,246,249,0.96) 35%, rgba(246,246,249,0.75) 60%, rgba(246,246,249,0) 100%)'
            : 'linear-gradient(180deg, rgba(246,246,249,0) 68%, rgba(246,246,249,0.94) 76%, #f6f6f9 100%)',
        }}
      />
      <div style={textBox}>
        {qIn <= 0 ? (
          <>
            <Super inP={prog(f, B.hookLine1, 18, (t) => t)} outP={linesOut} style={big} tracking>
              Same process.
            </Super>
            {h ? (
              <Super inP={prog(f, B.hookLine2, 18, (t) => t)} outP={linesOut} style={big} tracking>
                <span style={{ color: C.rework }}>100 ways</span> to run it.
              </Super>
            ) : (
              <>
                <Super inP={prog(f, B.hookLine2, 18, (t) => t)} outP={linesOut} style={big} tracking>
                  <span style={{ color: C.rework }}>100 ways</span>
                </Super>
                <Super inP={prog(f, B.hookLine2 + 4, 18, (t) => t)} outP={linesOut} style={big} tracking>
                  to run it.
                </Super>
              </>
            )}
          </>
        ) : h ? (
          <Super inP={qIn} style={{ ...big, fontSize: 104 }} tracking>
            Which one do you <span style={{ color: C.accent }}>automate?</span>
          </Super>
        ) : (
          <>
            <Super inP={qIn} style={big} tracking>
              Which one do
            </Super>
            <Super inP={prog(f, B.hookQuestion + 10, 22, (t) => t)} style={big} tracking>
              you <span style={{ color: C.accent }}>automate?</span>
            </Super>
          </>
        )}
      </div>
      {/* variant counter: the data-forward detail under the headline */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: h ? 930 : 150,
          display: 'flex',
          justifyContent: 'center',
          ...fadeUp(prog(f, B.hookCounterFrom - 6, 20), 12),
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            display: 'flex',
            alignItems: 'center',
            gap: h ? 14 : 16,
            background: '#ffffff',
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 100,
            padding: h ? '12px 24px' : '16px 30px',
            fontSize: h ? 20 : 27,
            fontWeight: 600,
            color: C.ink2,
            boxShadow: '0 4px 16px rgba(24,26,51,0.07)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span style={{ width: 11, height: 11, borderRadius: 11, background: C.rework, boxShadow: `0 0 0 ${4 + 5 * pulse}px rgba(209,125,44,${0.12 + 0.18 * pulse})` }} />
          <span style={{ color: C.ink }}>Purchase to bind</span>
          <span style={{ color: C.ink3 }}>|</span>
          <span>
            <span style={{ color: C.ink, fontWeight: 750, display: 'inline-block', minWidth: h ? 38 : 50, textAlign: 'right' }}>{variants}</span> variants
          </span>
          {h && (
            <>
              <span style={{ color: C.ink3 }}>|</span>
              <span>{STATS.instances} instances</span>
            </>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
