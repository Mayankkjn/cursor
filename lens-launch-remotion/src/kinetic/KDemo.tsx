import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { STATS } from '../data/process';
import { beatPulse, clamp01, prog, typed } from '../lib/anim';
import { SUMMARY, SUMMARY_LENGTH } from '../components/AISummaryPanel';
import { Background } from '../components/Background';
import { Camera } from '../components/Camera';
import { Sparkle } from '../components/Icons';
import { Illustrative } from '../components/Illustrative';
import { LensLogo } from '../components/LensLogo';
import { B, C, EASE, FONT, T, scene } from '../theme';
import { Swarm } from './Swarm';
import { KLine, KWord, Label } from './type';

const S = scene('demo');

const Pill: React.FC<{ f: number; at: number; bg: string; fg: string; size: number; children: React.ReactNode; exitAt?: number }> = ({ f, at, bg, fg, size, children, exitAt }) => {
  const p = EASE.settle(clamp01((f - at) / 12));
  const x = exitAt !== undefined ? clamp01((f - exitAt) / 9) : 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em', fontFamily: FONT, fontSize: size, fontWeight: 700, letterSpacing: 0, color: fg, background: bg, borderRadius: 100, padding: '0.32em 0.85em', opacity: p * (1 - x), transform: `translateX(${(1 - p) * -20}px)`, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
      {children}
    </span>
  );
};

/** One row of the path stack: a big word, a tag, and a line it travels along. */
const PathRow: React.FC<{
  f: number;
  v: boolean;
  at: number;
  words: { t: string; enter?: 'slam' | 'drop' | 'rise' }[];
  color: string;
  tag: React.ReactNode;
  tagBg: string;
  tagFg: string;
  speed: number; // frames per traversal of the dot along the underline
  dashed?: boolean;
  glyph?: React.ReactNode;
}> = ({ f, v, at, words, color, tag, tagBg, tagFg, speed, dashed, glyph }) => {
  const size = v ? 128 : 142;
  const draw = EASE.camera(clamp01((f - at - 2) / 28));
  const s = ((f - at) / speed) % 1;
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: v ? 'column' : 'row', alignItems: v ? 'center' : 'baseline', gap: v ? 14 : 34 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.24em' }}>
        <KLine f={f} size={size} color={color} align="left" words={words.map((w, i) => ({ t: w.t, at: at + i * 5, enter: w.enter ?? 'slam' }))} />
        {glyph}
      </div>
      <Pill f={f} at={at + 12} bg={tagBg} fg={tagFg} size={v ? 30 : 32}>
        {tag}
      </Pill>
      <svg width={v ? 920 : 1600} height={24} style={{ position: 'absolute', left: v ? -460 + 0 : 0, ...(v ? { left: '50%', marginLeft: -460 } : {}), bottom: v ? -26 : -18, overflow: 'visible' }}>
        {draw > 0.002 && <line x1={0} y1={12} x2={(v ? 920 : 1600) * draw} y2={12} stroke={color} strokeWidth={dashed ? 4 : 6} strokeDasharray={dashed ? '2 12' : undefined} strokeLinecap="round" opacity={0.85} />}
        {draw >= 1 && f >= at && <circle cx={(v ? 920 : 1600) * s} cy={12} r={9} fill={color} stroke="#fff" strokeWidth={3} />}
      </svg>
    </div>
  );
};

/** "Standardize Path B." + the reasons — also the first frame of the morph's collapse. */
export const RecBlock: React.FC<{ f: number; v: boolean }> = ({ f, v }) => {
  const comet = EASE.camera(clamp01((f - B.demoPathPulse) / 30));
  const reasons = [
    { b: '40% faster', r: 'than average', at: B.demoRecIn + 28 },
    { b: 'Zero', r: 'rework', at: B.demoRecIn + 38 },
    { b: '1 in 3', r: 'users already do it', at: B.demoRecIn + 48 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: v ? 28 : 34 }}>
      <Label f={f} at={B.demoRecIn + 2} color={C.fastestInk} size={v ? 24 : 24}>
        Recommendation
      </Label>
      <div style={{ position: 'relative' }}>
        <KLine
          f={f}
          size={v ? 132 : 164}
          maxWidth={v ? 960 : undefined}
          words={[
            { t: 'Standardize', at: B.demoRecIn + 5 },
            { t: 'Path B.', at: B.demoRecIn + 15, enter: 'slam', color: C.fastest },
          ]}
        />
        {comet > 0 && (
          <div style={{ position: 'absolute', right: v ? '18%' : 0, bottom: -10, height: 10, borderRadius: 10, width: v ? '64%' : '36%', background: C.fastestSoft, overflow: 'hidden' }}>
            <div style={{ width: `${comet * 100}%`, height: '100%', background: C.fastest, borderRadius: 10, boxShadow: `0 0 18px ${C.fastest}` }} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: v ? 'column' : 'row', alignItems: 'center', gap: v ? 10 : 46, fontFamily: FONT, fontSize: v ? 44 : 44, letterSpacing: '-0.01em' }}>
        {reasons.map((r, i) => (
          <span key={i} style={{ display: 'inline-flex', gap: '0.3em', alignItems: 'baseline' }}>
            <KWord f={f} t={r.b} at={r.at} color={C.ink} weight={800} />
            <KWord f={f} t={r.r} at={r.at + 3} color={C.ink2} weight={550} />
          </span>
        ))}
      </div>
    </div>
  );
};

/** The AI Summary sentence, typed large with its semantic highlights. */
export const TypedSummary: React.FC<{ f: number; v: boolean; chars: number }> = ({ f, v, chars }) => {
  let left = chars;
  const caretOn = chars < SUMMARY_LENGTH || Math.floor(f / 12) % 2 === 0;
  return (
    <div style={{ fontFamily: FONT, fontSize: v ? 66 : 74, lineHeight: 1.28, fontWeight: 650, letterSpacing: '-0.025em', color: C.ink2, maxWidth: v ? 940 : 1560 }}>
      {SUMMARY.map((s, i) => {
        if (left <= 0) return null;
        const shown = s.t.slice(0, left);
        left -= s.t.length;
        const st: React.CSSProperties =
          s.k === 'strong'
            ? { color: C.ink, fontWeight: 800 }
            : s.k === 'fastest'
              ? { color: C.fastestInk, background: C.fastestSoft, borderRadius: 14, padding: '0 10px', fontWeight: 800 }
              : s.k === 'rework'
                ? { color: C.reworkInk, background: C.reworkSoft, borderRadius: 14, padding: '0 8px', fontWeight: 750, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }
                : {};
        return (
          <span key={i} style={st}>
            {shown}
          </span>
        );
      })}
      <span style={{ display: 'inline-block', width: 6, height: '0.95em', marginLeft: 6, verticalAlign: '-0.12em', background: C.accent, opacity: caretOn ? 1 : 0 }} />
    </div>
  );
};

/** DEMO 5–20s — chaos converges into Lens; fastest / most common / rework; the AI summary; the recommendation. */
export const KDemo: React.FC = () => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const f = useCurrentFrame() + S.from;
  const pulse = beatPulse(f, T.beatFrames, 3);

  const brandOut = 240;
  const stackOut = prog(f, B.demoPanelIn - 2, 16, EASE.exit);
  const sumIn = f >= B.demoPanelIn;
  const sumShrink = prog(f, B.demoRecIn, 20, EASE.camera);
  const push = 1 + 0.035 * prog(f, B.demoPushFrom, B.demoPushTo - B.demoPushFrom, EASE.camera);

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Background grid={0.4} />
      {/* 1 — the hundred ways converge into the Lens mark */}
      {f < 210 && <Swarm f={f} W={W} H={H} dim={1} converge={prog(f, B.demoResolveFrom, 40, (t) => t)} target={{ x: W / 2, y: v ? H / 2 - 260 : H / 2 - 170 }} />}
      {f < brandOut + 12 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: v ? 26 : 20, padding: v ? '0 60px' : 0 }}>
          <div style={{ opacity: 1 - prog(f, brandOut, 9), transform: `translateY(${-prog(f, brandOut, 9, EASE.exit) * 30}px)` }}>
            <LensLogo size={v ? 150 : 128} bladeProgress={(i) => prog(f, 166 + i * 1.5, 14, EASE.settle)} />
          </div>
          <KLine f={f} size={v ? 60 : 56} exitAt={brandOut} words={[{ t: 'Whatfix', at: 174 }, { t: 'Lens', at: 178, color: '#f45703' }]} />
          <div style={{ height: v ? 20 : 14 }} />
          <KLine f={f} size={v ? 118 : 128} exitAt={brandOut} maxWidth={v ? 960 : undefined} words={[{ t: 'shows', at: 190 }, { t: 'how', at: 196 }, { t: 'work', at: 202 }, { t: 'really', at: 212, color: C.ink2 }, { t: 'happens.', at: 220 }]} />
        </AbsoluteFill>
      )}

      {/* 2 — the stack: fastest, most common, rework (each lands on a click) */}
      {f >= B.demoClickFastest - 2 && stackOut < 1 && (
        <Camera scale={push} x={-stackOut * 260} opacity={1 - stackOut}>
          <AbsoluteFill style={{ justifyContent: 'center', alignItems: v ? 'center' : 'flex-start', paddingLeft: v ? 0 : 170, gap: v ? 200 : 92, flexDirection: 'column' }}>
            <PathRow f={f} v={v} at={B.demoClickFastest} words={[{ t: 'Fastest' }, { t: 'path' }]} color={C.fastest} tag={<>● {STATS.fastestDays}</>} tagBg={C.fastestSoft} tagFg={C.fastestInk} speed={34} />
            {/* rows are laid out from the start (hidden until their click) so the stack never re-centres */}
            <PathRow f={f} v={v} at={B.demoClickCommon} words={[{ t: 'Most' }, { t: 'common' }]} color={C.common} tag={<>● {STATS.commonDays} · {STATS.commonShare} of cases</>} tagBg={C.commonSoft} tagFg={C.ink} speed={52} dashed />
            {(
              <PathRow
                f={f}
                v={v}
                at={B.demoClickRework}
                words={[{ t: 'Rework', enter: 'drop' }]}
                color={C.rework}
                tag={<>{STATS.reworkRepeat} repeat verification</>}
                tagBg={C.reworkSoft}
                tagFg={C.reworkInk}
                speed={40}
                glyph={
                  <span style={{ display: 'inline-block', fontFamily: FONT, fontSize: v ? 100 : 128, fontWeight: 800, color: C.rework, opacity: prog(f, B.demoClickRework + 10, 8), transform: `rotate(${(f - B.demoClickRework) * 6}deg) scale(${1 + 0.12 * pulse})` }}>↻</span>
                }
              />
            )}
          </AbsoluteFill>
        </Camera>
      )}

      {/* 3 — AI Summary, typed */}
      {sumIn && (
        <AbsoluteFill style={{ justifyContent: v ? 'center' : 'center', alignItems: v ? 'center' : 'flex-start', paddingLeft: v ? 70 : 170, paddingRight: v ? 70 : 0, flexDirection: 'column', gap: 34 }}>
          <div style={{ transformOrigin: v ? '50% 0' : '0 0', transform: `translateY(${-sumShrink * (v ? 560 : 300)}px) scale(${1 - 0.5 * sumShrink})`, opacity: 1 - 0.65 * sumShrink, display: 'flex', flexDirection: 'column', gap: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: prog(f, B.demoPanelIn + 2, 12) }}>
              <span style={{ width: 52, height: 52, borderRadius: 14, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkle size={30} color="#fff" strokeWidth={2.2} />
              </span>
              <Label f={f} at={B.demoPanelIn + 4} color={C.accent} size={26}>
                AI Summary
              </Label>
            </div>
            <TypedSummary f={f} v={v} chars={typed(f, B.demoTypeFrom, B.demoTypeTo, SUMMARY_LENGTH)} />
          </div>
        </AbsoluteFill>
      )}

      {/* 4 — the recommendation */}
      {f >= B.demoRecIn && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingTop: v ? 380 : 230 }}>
          <RecBlock f={f} v={v} />
        </AbsoluteFill>
      )}
      <Illustrative o={v ? 'v' : 'h'} appear={prog(f, B.demoClickFastest, 12)} />
    </AbsoluteFill>
  );
};
