import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { beatPulse, clamp01, prog } from '../lib/anim';
import { Background } from '../components/Background';
import { Bolt } from '../components/Icons';
import { B, C, EASE, FONT, T, scene } from '../theme';
import { MICRO_STEPS } from '../scenes/MorphScene';
import { RecBlock } from './KDemo';
import { KLine, seq } from './type';

const S = scene('morph');

const WORDS = ['OBSERVE', 'UNDERSTAND', 'DECIDE', 'AUTOMATE', 'MEASURE'];
const FLIP_BG = [C.bg, C.ink, C.bg, C.accent, C.fastest];
const FLIP_FG = [C.ink, '#ffffff', C.ink, '#ffffff', '#ffffff'];

/** MORPH 20–30s — type collapses into the golden line; "Approval" breaks into micro-steps that flow into Seek; the loop, one word per beat. */
export const KMorph: React.FC = () => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const f = useCurrentFrame() + S.from;
  const wordFrames = [B.morphWord1, B.morphWord2, B.morphWord3, B.morphWord4, B.morphWord5];
  const active = wordFrames.filter((w) => f >= w).length - 1;

  // the golden line
  const lineY = v ? 1180 : 760;
  const collapse = prog(f, B.morphUiOut, 22, EASE.camera);
  const grow = prog(f, B.morphCollapseFrom, 34, EASE.camera);
  const lineOut = prog(f, B.morphFlowTo, 12, EASE.exit);
  const lineW = (W - (v ? 120 : 200)) * grow;

  // micro-steps on the line, then into Seek
  const seekX = v ? W / 2 : W - 230;
  const seekY = v ? lineY + 300 : lineY;
  const seekIn = prog(f, B.morphSeekIn, 16);
  const absorbFrames = MICRO_STEPS.map((_, i) => B.morphFlowFrom + (MICRO_STEPS.length - 1 - i) * 6 + 15);
  const lastAbsorb = Math.max(...absorbFrames.filter((a) => f >= a), -99);
  const absorbPulse = f - lastAbsorb < 12 ? 1 - (f - lastAbsorb) / 12 : 0;
  const approvalP = prog(f, B.morphFracture - 16, 12);
  const shatter = clamp01((f - B.morphFracture) / 9);

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Background grid={0.4} />

      {/* the recommendation folds flat into a line */}
      {collapse < 1 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingTop: v ? 380 : 230, transform: `scaleY(${1 - collapse})`, transformOrigin: `50% ${lineY}px`, opacity: 1 - collapse * 0.6 }}>
          <RecBlock f={B.morphUiOut - 1} v={v} />
        </AbsoluteFill>
      )}

      {/* golden path */}
      {grow > 0 && lineOut < 1 && (
        <div style={{ position: 'absolute', left: W / 2 - lineW / 2, top: lineY - 4, width: lineW, height: 8, borderRadius: 8, background: C.fastest, boxShadow: `0 0 ${18 + 10 * grow}px rgba(31,157,92,${0.55 * grow})`, opacity: 1 - lineOut }} />
      )}

      {/* the shift */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: v ? 300 : 150, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: v ? 16 : 10, padding: v ? '0 60px' : 0 }}>
        <KLine f={f} size={v ? 58 : 66} color={C.ink2} maxWidth={v ? 960 : undefined} exitAt={B.morphFlowFrom + 4} words={seq('From showing you how work happens,', B.morphSuper1, 5)} />
        <KLine f={f} size={v ? 58 : 66} maxWidth={v ? 960 : undefined} exitAt={B.morphFlowFrom + 7} words={seq('to telling you', B.morphSuper2, 5)} />
        <KLine f={f} size={v ? 104 : 128} maxWidth={v ? 960 : undefined} exitAt={B.morphFlowFrom + 10} color={C.accent} words={seq('what to automate next.', B.morphSuper2 + 14, 5, { enter: 'slam' })} />
      </div>

      {/* Approval — then it shatters */}
      {approvalP > 0 && shatter < 1 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: lineY - (v ? 170 : 175), display: 'flex', justifyContent: 'center', fontSize: v ? 112 : 124, fontWeight: 800, letterSpacing: '-0.04em', color: C.ink }}>
          {[...'Approval'].map((ch, i) => {
            const dir = (i - 3.5) / 3.5;
            return (
              <span key={i} style={{ display: 'inline-block', opacity: approvalP * (1 - shatter), transform: `translate(${dir * 260 * shatter}px, ${(1 - approvalP) * 60 - Math.abs(dir) * 90 * shatter + (i % 2 ? 40 : -30) * shatter}px) rotate(${dir * 40 * shatter}deg)`, filter: shatter > 0 ? `blur(${shatter * 6}px)` : undefined }}>
                {ch}
              </span>
            );
          })}
        </div>
      )}

      {/* micro-steps riding the line into Seek */}
      {f >= B.morphFracture && lineOut < 1 &&
        MICRO_STEPS.map((label, i) => {
          const slotX = v ? W / 2 : 230 + i * 270;
          const slotY = v ? lineY - 470 + i * 92 : lineY + (i % 2 ? 54 : -54); // alternate sides of the line so labels never touch
          const p = EASE.settle(clamp01((f - B.morphFracture - 5 - i * 3) / 12));
          const depart = B.morphFlowFrom + (MICRO_STEPS.length - 1 - i) * 6;
          const t = EASE.camera(clamp01((f - depart) / 15));
          const x = slotX + (seekX - slotX) * t;
          const y = slotY + (seekY - slotY) * t;
          const op = Math.min(1, p * 2) * (1 - clamp01((t - 0.7) / 0.3)) * (1 - lineOut);
          if (op <= 0) return null;
          return (
            <div key={label} style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) translateY(${(1 - p) * 30}px) scale(${1 - 0.6 * t})`, opacity: op, display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap', fontSize: v ? 44 : 34, fontWeight: 750, letterSpacing: '-0.02em', color: C.ink }}>
              <span style={{ width: v ? 48 : 40, height: v ? 48 : 40, borderRadius: 40, background: C.fastest, color: '#fff', fontSize: v ? 24 : 20, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              {label}
            </div>
          );
        })}

      {/* Seek */}
      {seekIn > 0 && lineOut < 1 && (
        <div style={{ position: 'absolute', left: seekX, top: seekY, transform: `translate(-50%, -50%) scale(${(0.6 + 0.4 * EASE.settle(seekIn)) * (1 + 0.1 * absorbPulse)})`, opacity: seekIn * (1 - lineOut), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 132, height: 132, borderRadius: 132, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 ${16 + 22 * absorbPulse + 6 * beatPulse(f, T.beatFrames)}px rgba(199,73,0,0.14)` }}>
            <Bolt size={60} color="#fff" strokeWidth={2.2} />
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, color: C.accent, letterSpacing: '-0.03em' }}>Seek</div>
        </div>
      )}

      {/* the loop — one word per beat, full-bleed colour flips */}
      {f >= B.morphWord1 && (
        <AbsoluteFill style={{ background: FLIP_BG[active] }}>
          {WORDS.map((w, i) => {
            const inP = clamp01((f - wordFrames[i]) / 10);
            const live = i === active;
            if (!live || inP <= 0) return null;
            const e = EASE.settle(inP);
            const drift = 1.06 - 0.06 * EASE.settle(clamp01((f - wordFrames[i]) / 25));
            const size = v ? (w.length > 8 ? 132 : 170) : w.length > 8 ? 230 : 270;
            return (
              <AbsoluteFill key={w} style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ overflow: 'hidden', padding: '0.06em 0.04em 0.14em' }}>
                  <div style={{ fontSize: size, fontWeight: 800, color: FLIP_FG[i], letterSpacing: `${(1 - e) * 0.16 - 0.04}em`, transform: `translateY(${(1 - e) * 100}%) scale(${drift})`, lineHeight: 1 }}>{w}</div>
                </div>
              </AbsoluteFill>
            );
          })}
          {/* the loop row */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: v ? 300 : 150, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: v ? 10 : 22, flexWrap: 'wrap', padding: v ? '0 60px' : 0 }}>
            {WORDS.map((w, i) => {
              const lit = f >= wordFrames[i];
              const fg = FLIP_FG[active];
              return (
                <React.Fragment key={w}>
                  {i > 0 && <span style={{ color: fg, opacity: lit ? 0.9 : 0.3, fontSize: v ? 22 : 26, fontWeight: 700 }}>→</span>}
                  <span style={{ color: fg, opacity: i === active ? 1 : lit ? 0.6 : 0.25, fontSize: v ? 22 : 24, fontWeight: 800, letterSpacing: '0.18em' }}>{w}</span>
                </React.Fragment>
              );
            })}
            {f >= B.morphLoopClose && <span style={{ color: FLIP_FG[active], fontSize: v ? 30 : 34, fontWeight: 800, marginLeft: 10, display: 'inline-block', transform: `rotate(${-360 * (1 - EASE.settle(clamp01((f - B.morphLoopClose) / 12)))}deg)` }}>↺</span>}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
