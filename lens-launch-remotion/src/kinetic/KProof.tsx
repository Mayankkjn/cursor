import React from 'react';
import { AbsoluteFill, interpolate, interpolateColors, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp01, fmt, prog } from '../lib/anim';
import { Background } from '../components/Background';
import { COVERAGE } from '../components/CoverageDashboard';
import { Illustrative } from '../components/Illustrative';
import { B, C, EASE, FONT, scene } from '../theme';
import { KLine, KWord, Label } from './type';

const S = scene('proof');

const count = (f: number, to: number, start: number, dur = 16) =>
  interpolate(f, [start, start + dur], [0, to], { easing: EASE.settle, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** PROOF 30–45s — the score as a giant number, the evidence as a ledger, the action, the impact, the principle. */
export const KProof: React.FC = () => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const f = useCurrentFrame() + S.from;

  // 92/100
  const score = interpolate(f, [B.proofCountFrom, B.proofCountTo], [0, 92], { easing: EASE.settle, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const landed = prog(f, B.proofCountTo - 2, 8);
  const dock = prog(f, B.proofCountTo + 12, 14, EASE.camera); // score moves up to make room for the evidence
  const scoreIn = prog(f, B.proofCardIn, 14);
  const scoreColor = interpolateColors(landed, [0, 1], [C.ink, C.accent]);
  const hit = f >= B.proofCountTo && f < B.proofCountTo + 10 ? 1 + 0.05 * (1 - (f - B.proofCountTo) / 10) : 1;

  // the evidence ledger, one row per beat
  const chipFrames = [B.proofChip1, B.proofChip2, B.proofChip3, B.proofChip4, B.proofChip5];
  const rows = [
    { n: fmt(count(f, 18420, chipFrames[0])), l: 'executions / month', c: C.ink },
    { n: `${Math.round(count(f, 87, chipFrames[1]))}%`, l: 'identical pattern', c: C.ink },
    { n: `${Math.round(count(f, 3, chipFrames[2], 8))}`, l: 'apps — CRM, policy admin, email', c: C.ink },
    { n: `${Math.round(count(f, 12, chipFrames[3]))}%`, l: 'rework', c: C.rework },
    { n: `~${fmt(Math.round(count(f, 2100, chipFrames[4]) / 10) * 10)}`, l: 'hrs / month to win back', c: C.accent },
  ];

  // the action
  const ledgerOut = prog(f, B.proofSeekIn - 4, 14, EASE.camera);
  const sinceClick = f - B.proofSeekClick;
  const press = sinceClick >= 0 && sinceClick < 8 ? 1 - 0.05 * Math.sin((sinceClick / 8) * Math.PI) : 1;
  const ctaOut = prog(f, B.proofDashFrom, 12, EASE.exit);

  // the impact
  const after = prog(f, B.proofDashCountFrom, B.proofDashCountTo - B.proofDashCountFrom, EASE.settle);
  const impactOut = B.proofPrinciple - 8;

  const scoreBlockOut = ledgerOut;

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Background grid={0.4} />

      {/* score */}
      {scoreBlockOut < 1 && (
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            transformOrigin: v ? '50% 14%' : '92% 14%',
            transform: `scale(${1 - (v ? 0.55 : 0.66) * dock}) translateY(${-dock * (v ? 0 : 0)}px)`,
            opacity: 1 - scoreBlockOut,
          }}
        >
          <Label f={f} at={B.proofCardIn + 2} size={v ? 30 : 30} color={C.ink2}>
            Customer Verification
          </Label>
          <div style={{ display: 'flex', alignItems: 'baseline', opacity: scoreIn, transform: `translateY(${(1 - scoreIn) * 40}px) scale(${hit})`, fontVariantNumeric: 'tabular-nums', margin: v ? '10px 0' : '0' }}>
            <span style={{ fontSize: v ? 380 : 420, fontWeight: 800, letterSpacing: '-0.06em', color: scoreColor, lineHeight: 0.95 }}>{String(Math.round(score)).padStart(2, ' ')}</span>
            <span style={{ fontSize: v ? 110 : 120, fontWeight: 800, color: C.ink3, letterSpacing: '-0.04em', marginLeft: 10 }}>/100</span>
          </div>
          <Label f={f} at={B.proofCountTo - 4} size={v ? 30 : 30} color={C.accent}>
            Automation opportunity
          </Label>
        </AbsoluteFill>
      )}

      {/* ledger */}
      {f >= chipFrames[0] - 2 && ledgerOut < 1 && (
        <div
          style={{
            position: 'absolute',
            left: v ? 60 : 170,
            right: v ? 60 : 520,
            top: v ? 700 : 290,
            display: 'flex',
            flexDirection: 'column',
            gap: v ? 26 : 4,
            opacity: 1 - ledgerOut,
            transform: `translateX(${-ledgerOut * 200}px)`,
          }}
        >
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: v ? 'column' : 'row', alignItems: v ? 'flex-start' : 'baseline', gap: v ? 0 : 36, borderTop: f >= chipFrames[i] ? `2px solid ${C.panelBorder}` : '2px solid transparent', paddingTop: v ? 12 : 8 }}>
              <div style={{ width: v ? undefined : 520, textAlign: v ? 'left' : 'right', fontVariantNumeric: 'tabular-nums' }}>
                <KWord f={f} t={r.n} at={chipFrames[i]} enter="slam" size={v ? 112 : 94} weight={800} color={r.c} style={{ letterSpacing: '-0.045em', lineHeight: 1 }} />
              </div>
              <KWord f={f} t={r.l} at={chipFrames[i] + 4} size={v ? 36 : 36} weight={600} color={C.ink2} style={{ letterSpacing: '-0.01em' }} />
            </div>
          ))}
        </div>
      )}

      {/* the action */}
      {f >= B.proofSeekIn && ctaOut < 1 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 18, opacity: 1 - ctaOut, transform: `scale(${press}) translateX(${-ctaOut * 260}px)` }}>
          <KLine f={f} size={v ? 150 : 210} tracking="-0.05em" words={[{ t: 'Automate', at: B.proofSeekIn, enter: 'slam', color: C.accent }]} />
          <KLine f={f} size={v ? 92 : 110} words={[{ t: 'with', at: B.proofSeekIn + 8 }, { t: 'Seek', at: B.proofSeekIn + 13 }, { t: '→', at: B.proofSeekIn + 18, color: C.accent }]} />
          <div style={{ height: 12, borderRadius: 12, width: v ? 640 : 900, background: C.accentSoft, overflow: 'hidden', marginTop: 10, opacity: prog(f, B.proofSeekIn + 10, 8) }}>
            <div style={{ height: '100%', width: `${100 * prog(f, B.proofSeekClick - 2, 8)}%`, background: C.accent, borderRadius: 12 }} />
          </div>
        </AbsoluteFill>
      )}

      {/* impact: before → after */}
      {f >= B.proofDashFrom && f < impactOut + 10 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: v ? 40 : 54 }}>
          <Label f={f} at={B.proofDashFrom + 2} exitAt={impactOut} size={28} color={C.fastestInk}>
            After automating with Seek
          </Label>
          <div style={{ display: 'flex', flexDirection: v ? 'column' : 'row', gap: v ? 50 : 110, alignItems: 'center' }}>
            {[
              { n: `${Math.round(COVERAGE.automatedPct * after)}%`, l: 'of the process automated', at: B.proofDashFrom + 6 },
              { n: fmt(COVERAGE.hoursPerWeek * after), l: 'hours saved every week', at: B.proofDashFrom + 12 },
              { n: fmt(COVERAGE.fte * after), l: 'FTE capacity freed', at: B.proofDashFrom + 18 },
            ].map((k) => (
              <div key={k.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <KWord f={f} t={k.n} at={k.at} exitAt={impactOut} enter="rise" size={v ? 170 : 200} weight={800} color={C.ink} style={{ letterSpacing: '-0.05em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }} />
                <KWord f={f} t={k.l} at={k.at + 4} exitAt={impactOut} size={v ? 36 : 34} weight={600} color={C.ink2} />
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* the principle */}
      {f >= B.proofPrinciple && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 6, padding: v ? '0 60px' : 0 }}>
          <KLine f={f} size={v ? 120 : 140} maxWidth={v ? 960 : undefined} words={[{ t: 'Every', at: B.proofPrinciple }, { t: 'recommendation', at: B.proofPrinciple + 6 }]} />
          <div style={{ position: 'relative' }}>
            <KLine f={f} size={v ? 120 : 140} words={[{ t: 'shows', at: B.proofPrinciple + 14 }, { t: 'its', at: B.proofPrinciple + 19 }, { t: 'evidence.', at: B.proofPrinciple + 24, enter: 'slam', color: C.fastest }]} />
            <div style={{ position: 'absolute', right: 0, bottom: -6, height: 12, borderRadius: 12, background: C.fastest, width: `${47 * EASE.settle(clamp01((f - B.proofPrinciple - 30) / 18))}%` }} />
          </div>
        </AbsoluteFill>
      )}
      <Illustrative o={v ? 'v' : 'h'} appear={prog(f, B.proofCardIn, 12) * (1 - prog(f, B.proofPrinciple, 10))} />
    </AbsoluteFill>
  );
};
