import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp01, fmt, prog, springAt } from '../lib/anim';
import { useOrientation } from '../lib/useOrientation';
import { Background } from '../components/Background';
import { Camera } from '../components/Camera';
import { CoverageDashboard } from '../components/CoverageDashboard';
import { EvidenceChip, type ChipTone } from '../components/EvidenceChip';
import { Activity, Apps, Clock, Layers, Repeat } from '../components/Icons';
import { Illustrative } from '../components/Illustrative';
import { OpportunityScore } from '../components/OpportunityScore';
import { Super } from '../components/Super';
import { B, C, EASE, FONT, SPRING, scene } from '../theme';

const S = scene('proof');

const count = (f: number, from: number, to: number, start: number, dur = 16) =>
  interpolate(f, [start, start + dur], [from, to], { easing: EASE.settle, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** PROOF 30–45s: the score, the evidence behind it, the action, and the impact. */
export const ProofScene: React.FC = () => {
  const o = useOrientation();
  const h = o === 'h';
  const f = useCurrentFrame() + S.from;
  const { fps } = useVideoConfig();

  const appear = prog(f, B.proofCardIn, 24);
  const score = interpolate(f, [B.proofCountFrom, B.proofCountTo], [0, 92], { easing: EASE.settle, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const chipFrames = [B.proofChip1, B.proofChip2, B.proofChip3, B.proofChip4, B.proofChip5];
  const chips: { icon: typeof Activity; value: string; label: string; tone?: ChipTone }[] = [
    { icon: Activity, value: fmt(count(f, 0, 18420, chipFrames[0])), label: 'executions / month' },
    { icon: Layers, value: `${Math.round(count(f, 0, 87, chipFrames[1]))}%`, label: 'identical pattern' },
    { icon: Apps, value: `${Math.round(count(f, 0, 3, chipFrames[2], 8))} apps`, label: 'CRM · policy admin · email' },
    { icon: Repeat, value: `${Math.round(count(f, 0, 12, chipFrames[3]))}%`, label: 'rework rate', tone: 'rework' },
    { icon: Clock, value: `~${fmt(Math.round(count(f, 0, 2100, chipFrames[4]) / 10) * 10)} hrs`, label: 'potential savings / month', tone: 'accent' },
  ];

  const sinceClick = f - B.proofSeekClick;
  const press = sinceClick >= 0 && sinceClick < 8 ? Math.sin((sinceClick / 8) * Math.PI) : 0;
  const ripple = sinceClick >= 0 && sinceClick < 20 ? sinceClick / 20 : null;
  const pullBack = prog(f, B.proofDashFrom, 34, EASE.camera);
  const dash = prog(f, B.proofDashFrom + 6, 30);
  const after = prog(f, B.proofDashCountFrom, B.proofDashCountTo - B.proofDashCountFrom, EASE.settle);
  const principle = prog(f, B.proofPrinciple, 18, EASE.camera);
  const underline = prog(f, B.proofPrinciple + 16, 20, EASE.settle);

  // cursor for the single click on "Automate with Seek"
  const btn = h ? { x: 506, y: 698 } : { x: 540, y: 1790 };
  const cur = interpolate(f, [B.proofSeekClick - 22, B.proofSeekClick - 3], [0, 1], { easing: EASE.camera, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const curOp = interpolate(f, [B.proofSeekClick - 22, B.proofSeekClick - 14, B.proofSeekClick + 10, B.proofSeekClick + 18], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Background glow={0.5} />
      <Camera scale={1 - 0.2 * pullBack} y={-40 * pullBack} origin={h ? '50% 13%' : '50% 8%'} blur={6 * principle} opacity={1 - 0.88 * principle}>
        <div style={h ? { position: 'absolute', left: 110, top: 150, width: 790 } : { position: 'absolute', left: 56, top: 120, width: 968 }}>
          <OpportunityScore o={o} score={score} appear={appear} button={prog(f, B.proofSeekIn, 18)} press={press} ripple={ripple} />
        </div>
        <div style={h ? { position: 'absolute', left: 960, top: 150, width: 850 } : { position: 'absolute', left: 56, top: 1010, width: 968 }}>
          <div style={{ fontSize: h ? 15 : 19, fontWeight: 750, letterSpacing: '0.16em', color: C.ink2, marginBottom: h ? 18 : 20, opacity: prog(f, chipFrames[0] - 10, 14) }}>THE EVIDENCE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: h ? 16 : 14 }}>
            {chips.map((c, i) => (
              <EvidenceChip key={i} o={o} icon={c.icon} value={c.value} label={c.label} tone={c.tone} progress={f < chipFrames[i] ? 0 : springAt(f, fps, chipFrames[i], SPRING.chip)} />
            ))}
          </div>
        </div>
        {/* cursor */}
        {curOp > 0 && (
          <div style={{ position: 'absolute', left: btn.x + 180 * (1 - cur) - 4, top: btn.y + 90 * (1 - cur) - 2, opacity: curOp }}>
            <svg width={h ? 30 : 42} height={h ? 30 : 42} viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 3px rgba(24,26,51,0.25))' }}>
              <path d="M5 2.5l13.5 12.2-6.1.6 3.6 7.1-2.6 1.3-3.6-7.2L5 21z" fill="#2a2e45" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </Camera>

      {/* impact: before → after */}
      {dash > 0 && (
        <AbsoluteFill style={{ filter: principle > 0.02 ? `blur(${6 * principle}px)` : undefined, opacity: 1 - 0.88 * principle }}>
          <div style={h ? { position: 'absolute', left: 110, right: 110, top: 738 } : { position: 'absolute', left: 56, right: 56, top: 1100 }}>
            <CoverageDashboard o={o} appear={dash} after={after} />
          </div>
        </AbsoluteFill>
      )}

      {/* the principle */}
      {principle > 0 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <Super inP={clamp01(principle * 1.2)} style={{ fontSize: h ? 92 : 88, fontWeight: 800, letterSpacing: '-0.035em', color: C.ink, lineHeight: 1.08 }} tracking>
              Every recommendation
            </Super>
            <Super inP={clamp01(principle * 1.2 - 0.15)} style={{ fontSize: h ? 92 : 88, fontWeight: 800, letterSpacing: '-0.035em', color: C.ink, lineHeight: 1.08 }} tracking>
              shows its <span style={{ position: 'relative', display: 'inline-block' }}>
                evidence.
                <span style={{ position: 'absolute', left: 0, bottom: 4, height: 10, borderRadius: 10, width: `${underline * 100}%`, background: C.fastest, opacity: 0.85 }} />
              </span>
            </Super>
          </div>
        </AbsoluteFill>
      )}
      <Illustrative o={o} appear={appear * (1 - principle)} />
    </AbsoluteFill>
  );
};
