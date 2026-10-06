import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { LAYOUT, NODE_IDS, STRAIGHT, type NodeId, type Orientation } from '../data/process';
import { beatPulse, clamp01, lerp, prog } from '../lib/anim';
import { mix } from '../lib/geometry';
import { useOrientation } from '../lib/useOrientation';
import { AppFrame } from '../components/AppFrame';
import { Background } from '../components/Background';
import { Bolt } from '../components/Icons';
import { KineticLoop } from '../components/KineticLoop';
import { ProcessMap } from '../components/ProcessMap';
import { Super } from '../components/Super';
import { B, C, EASE, FONT, TYPE, scene } from '../theme';
import { DemoPanels, demoState } from './DemoScene';

const S = scene('morph');

export const MICRO_STEPS = ['Approve request', 'Open record', 'Check threshold', 'Click Approve', 'Log timestamp'];

const SEEK: Record<Orientation, { x: number; y: number }> = { h: { x: 1700, y: 600 }, v: { x: 540, y: 1600 } };
const stepSlot = (o: Orientation, i: number) => (o === 'h' ? { x: 270 + i * 272, y: 600 } : { x: 540, y: 620 + i * 150 });

/** MORPH 20–30s: every path collapses into the golden one; a task breaks into micro-steps that flow into Seek. */
export const MorphScene: React.FC = () => {
  const o = useOrientation();
  const h = o === 'h';
  const f = useCurrentFrame() + S.from;
  const base = demoState(S.from - 1, o);
  const L = LAYOUT[o];

  const uiOut = prog(f, B.morphUiOut, 30, EASE.camera);
  const collapse = prog(f, B.morphCollapseFrom, B.morphCollapseTo - B.morphCollapseFrom, EASE.camera);
  const straighten = prog(f, B.morphStraightenFrom, B.morphStraightenTo - B.morphStraightenFrom, EASE.camera);
  const toDots = prog(f, B.morphStraightenFrom + 20, 24);
  const fracture = prog(f, B.morphFracture, 26);
  const lineOut = prog(f, B.morphFlowTo, 18, EASE.exit);

  const pos = { ...L.pos };
  pos.verification = mix(L.pos.verification, L.pos.fasttrack, collapse);
  (Object.keys(STRAIGHT[o]) as NodeId[]).forEach((id) => (pos[id] = mix(L.pos[id], STRAIGHT[o][id]!, straighten)));
  pos.verification = mix(pos.verification, pos.fasttrack, straighten);

  const nodeDot: Partial<Record<NodeId, number>> = {};
  const nodeOpacity: Partial<Record<NodeId, number>> = {};
  NODE_IDS.forEach((id) => {
    nodeDot[id] = id === 'approval' ? 0 : toDots;
    nodeOpacity[id] = id === 'approval' ? 1 - prog(f, B.morphFracture, 10) : 1 - fracture;
  });
  nodeOpacity.verification = 1 - collapse;

  const xf = { s: lerp(base.mapXf.s, 1, uiOut), tx: lerp(base.mapXf.tx, 0, uiOut), ty: lerp(base.mapXf.ty, 0, uiOut) };
  const seekIn = prog(f, B.morphSeekIn, 20);
  const absorbFrames = MICRO_STEPS.map((_, i) => B.morphFlowFrom + (MICRO_STEPS.length - 1 - i) * 6 + 15);
  const lastAbsorb = Math.max(...absorbFrames.filter((a) => f >= a), -99);
  const absorbPulse = f - lastAbsorb < 12 ? 1 - (f - lastAbsorb) / 12 : 0;
  const seek = SEEK[o];
  const supersOut = prog(f, B.morphSupersOut, 14, (t) => t);
  const superStyle: React.CSSProperties = { fontFamily: FONT, fontSize: h ? TYPE.h1 - 8 : 54, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.12, textAlign: 'center' };

  return (
    <AbsoluteFill>
      <Background glow={uiOut * 0.6} />
      <AppFrame o={o} frame={f} appear={1 - uiOut} filters={base.filters} clicks={[]}>
        <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${xf.tx}px, ${xf.ty}px) scale(${xf.s})`, opacity: 1 - lineOut }}>
          <ProcessMap
            o={o}
            frame={f}
            pos={pos}
            nodeOpacity={nodeOpacity}
            nodeDot={nodeDot}
            edgesIn={1}
            fastest={1}
            common={1}
            rework={1}
            dimOthers={1}
            collapse={collapse}
            flowFrom={B.demoFlowFrom}
            flowOpacity={1 - prog(f, B.morphStraightenFrom, 24)}
            glow={1 + 1.2 * collapse}
            badges={{ ...base.map.badges, timeSink: (base.map.badges?.timeSink ?? 0) * (1 - collapse) }}
            labels={1}
          />
        </div>
        <DemoPanels o={o} f={f} panelIn={base.panelIn} chars={base.chars} recIn={base.recIn} blur={0} exit={prog(f, B.morphUiOut, 18, EASE.camera)} />
      </AppFrame>

      {/* Approval breaks into automation-ready micro-steps that flow into Seek */}
      {fracture > 0 && lineOut < 1 && (
        <AbsoluteFill style={{ opacity: 1 - lineOut }}>
          {MICRO_STEPS.map((label, i) => {
            const slot = stepSlot(o, i);
            const spread = EASE.settle(clamp01((f - B.morphFracture - (2 - Math.abs(i - 2)) * 3) / 14)); // outer steps lead so neighbours never cross
            const depart = B.morphFlowFrom + (MICRO_STEPS.length - 1 - i) * 6;
            const travel = EASE.camera(clamp01((f - depart) / 15));
            const from = mix(pos.approval, slot, spread);
            const p = mix(from, seek, travel);
            const sc = (0.6 + 0.4 * spread) * (1 - 0.65 * travel);
            const op = Math.min(1, spread * 2) * (1 - clamp01((travel - 0.75) / 0.25));
            if (op <= 0) return null;
            return (
              <div
                key={label}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  transform: `translate(-50%, -50%) scale(${sc})`,
                  opacity: op,
                  fontFamily: FONT,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#fff',
                  border: `1.5px solid ${C.boxStroke}`,
                  borderRadius: 14,
                  padding: h ? '14px 20px 14px 14px' : '16px 24px 16px 16px',
                  fontSize: h ? 22 : 28,
                  fontWeight: 650,
                  color: C.ink,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 6px 18px rgba(24,26,51,0.10)',
                }}
              >
                <span style={{ width: h ? 26 : 36, height: h ? 26 : 36, borderRadius: 26, background: C.fastestSoft, color: C.fastestInk, fontSize: h ? 14 : 19, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                {label}
              </div>
            );
          })}
          {/* Seek node */}
          {seekIn > 0 && (
            <div style={{ position: 'absolute', left: seek.x, top: seek.y, transform: `translate(-50%, -50%) scale(${(0.7 + 0.3 * EASE.settle(seekIn)) * (1 + 0.08 * absorbPulse)})`, opacity: seekIn, fontFamily: FONT }}>
              <div style={{ position: 'absolute', left: '50%', top: '50%', width: 220, height: 220, margin: -110, borderRadius: 220, background: C.accent, opacity: 0.1 + 0.18 * absorbPulse + 0.05 * beatPulse(f, 25) }} />
              <div style={{ width: 132, height: 132, borderRadius: 132, background: `linear-gradient(145deg, #e0640f, ${C.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px rgba(199,73,0,0.35)', position: 'relative' }}>
                <Bolt size={58} color="#fff" strokeWidth={2.2} />
              </div>
              <div style={{ position: 'absolute', left: '50%', top: 150, transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: C.ink }}>Seek</div>
              </div>
            </div>
          )}
        </AbsoluteFill>
      )}

      {/* the shift */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: h ? 170 : 150, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: h ? 6 : 4 }}>
        <Super inP={prog(f, B.morphSuper1, 18, (t) => t)} outP={supersOut} style={{ ...superStyle, color: C.ink2 }} tracking>
          From showing how work happens…
        </Super>
        <Super inP={prog(f, B.morphSuper2, 18, (t) => t)} outP={supersOut} style={{ ...superStyle, color: C.ink }} tracking>
          …to telling you <span style={{ color: C.accent }}>what to automate next.</span>
        </Super>
      </div>

      {f >= B.morphWord1 - 2 && <KineticLoop o={o} frame={f} wordFrames={[B.morphWord1, B.morphWord2, B.morphWord3, B.morphWord4, B.morphWord5]} closeFrame={B.morphLoopClose} />}
    </AbsoluteFill>
  );
};
