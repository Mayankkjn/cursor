import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { LAYOUT, NODE_IDS, type NodeId, type Orientation } from '../data/process';
import { lerp, prog, typed } from '../lib/anim';
import { routeGeom } from '../lib/mapGeometry';
import { useOrientation } from '../lib/useOrientation';
import { AISummaryPanel, SUMMARY_LENGTH, summaryIndexOf } from '../components/AISummaryPanel';
import { AppFrame, type FilterState } from '../components/AppFrame';
import { Background } from '../components/Background';
import { Camera } from '../components/Camera';
import { Illustrative } from '../components/Illustrative';
import { ProcessMap, type ProcessMapProps } from '../components/ProcessMap';
import { RecommendationCard } from '../components/RecommendationCard';
import { Tangle } from '../components/Tangle';
import { B, EASE, scene } from '../theme';

const S = scene('demo');

// Where the map sits once the panels are in (world → screen: p * s + t).
export const MAP_DOCKED: Record<Orientation, { s: number; tx: number; ty: number }> = {
  h: { s: 0.69, tx: -17, ty: 175 },
  v: { s: 0.64, tx: 194, ty: 52 },
};

/** Every animated value of the demo at absolute frame f — the morph starts from demoState(599). */
export const demoState = (f: number, o: Orientation) => {
  const order: NodeId[] = ['start', 'submit', 'approval', 'verification', 'fasttrack', 'issue', 'bind', 'end'];
  const typeFrame = (text: string) => B.demoTypeFrom + (summaryIndexOf(text) / SUMMARY_LENGTH) * (B.demoTypeTo - B.demoTypeFrom);

  const filters: FilterState = {
    all: 1 - prog(f, B.demoClickFastest, 6),
    fastest: prog(f, B.demoClickFastest, 6),
    common: prog(f, B.demoClickCommon, 6),
    rework: prog(f, B.demoClickRework, 6),
    ai: prog(f, B.demoPanelIn - 2, 6),
  };
  const dock = prog(f, B.demoPanelIn, 40, EASE.camera);
  const focusPanel = prog(f, B.demoPanelIn + 10, 20, EASE.camera) - prog(f, B.demoFocusMap, 18, EASE.camera);
  const focusMapAfter = prog(f, B.demoFocusMap, 18, EASE.camera);

  const map: Omit<ProcessMapProps, 'o' | 'frame' | 'pos'> = {
    nodeIn: (id) => prog(f, B.demoResolveFrom + 8 + order.indexOf(id) * 5, 24),
    edgesIn: prog(f, B.demoResolveFrom + 26, 26),
    flowFrom: B.demoFlowFrom,
    fastest: prog(f, B.demoClickFastest + 2, 34),
    common: prog(f, B.demoClickCommon + 2, 30),
    rework: prog(f, B.demoClickRework + 2, 16),
    dimOthers: prog(f, B.demoClickFastest + 2, 20),
    comet: f >= B.demoPathPulse ? prog(f, B.demoPathPulse, 40, EASE.camera) : undefined,
    badges: {
      fastest: prog(f, B.demoClickFastest + 18, 16),
      common: prog(f, B.demoClickCommon + 18, 16),
      rework: prog(f, B.demoClickRework + 12, 16),
      timeSink: prog(f, typeFrame('Approval'), 14),
    },
  };

  return {
    appear: prog(f, B.demoResolveFrom, 35),
    // the camera settles back from the hook's push, then pushes in slowly while the filters play
    push: f < B.demoPushFrom ? lerp(1.05, 1, prog(f, B.demoResolveFrom, 50, EASE.camera)) : 1 + 0.035 * prog(f, B.demoPushFrom, B.demoPushTo - B.demoPushFrom, EASE.camera) * (1 - dock),
    tangleResolve: prog(f, B.demoResolveFrom, 50, (t) => t),
    tangleOpacity: 1 - prog(f, B.demoResolveFrom + 40, 40),
    filters,
    map,
    mapXf: { s: lerp(1, MAP_DOCKED[o].s, dock), tx: lerp(0, MAP_DOCKED[o].tx, dock), ty: lerp(0, MAP_DOCKED[o].ty, dock) },
    panelIn: prog(f, B.demoPanelIn, 30),
    chars: typed(f, B.demoTypeFrom, B.demoTypeTo, SUMMARY_LENGTH),
    recIn: prog(f, B.demoRecIn, 34),
    mapBlur: 3 * focusPanel,
    panelBlur: 1.6 * focusMapAfter,
  };
};

export const DemoPanels: React.FC<{ o: Orientation; f: number; panelIn: number; chars: number; recIn: number; blur: number; exit?: number }> = ({ o, f, panelIn, chars, recIn, blur, exit = 0 }) => {
  const h = o === 'h';
  const box: React.CSSProperties = h ? { position: 'absolute', left: 1290, top: 140, width: 552 } : { position: 'absolute', left: 56, top: 1130, width: 968 };
  return (
    <AbsoluteFill style={{ filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined }}>
      <div style={{ ...box, opacity: panelIn * (1 - exit), transform: h ? `translateX(${(1 - panelIn) * 70 + exit * 120}px)` : `translateY(${(1 - panelIn) * 90 + exit * 160}px)` }}>
        <AISummaryPanel o={o} chars={chars} frame={f} />
      </div>
      <div
        style={{
          ...box,
          top: h ? 470 : 1480,
          opacity: recIn * (1 - exit),
          transform: h ? `translateY(${(1 - recIn) * 60}px) translateX(${exit * 120}px)` : `translateY(${(1 - recIn) * 80 + exit * 160}px)`,
        }}
      >
        <RecommendationCard o={o} progress={recIn} />
      </div>
    </AbsoluteFill>
  );
};

/** DEMO 5–20s: the tangle resolves into the Lens map; filters, AI Summary, recommendation. */
export const DemoScene: React.FC = () => {
  const o = useOrientation();
  const f = useCurrentFrame() + S.from;
  const pos = LAYOUT[o].pos;
  const st = demoState(f, o);
  const targets = { fastest: routeGeom('fastest', pos, o).pts, common: routeGeom('common', pos, o).pts };
  const nodeOpacity = Object.fromEntries(NODE_IDS.map((id) => [id, 1]));

  return (
    <AbsoluteFill>
      <Background />
      <Camera scale={st.push}>
        <AppFrame
          o={o}
          frame={f}
          appear={st.appear}
          filters={st.filters}
          clicks={[
            { frame: B.demoClickFastest, key: 'fastest' },
            { frame: B.demoClickCommon, key: 'common' },
            { frame: B.demoClickRework, key: 'rework' },
            { frame: B.demoPanelIn - 2, key: 'ai' },
          ]}
          cursor={{
            showFrom: B.demoClickFastest - 28,
            hideFrom: B.demoPanelIn + 8,
            keys: [
              { frame: B.demoClickFastest - 28, to: o === 'h' ? { x: 1000, y: 330 } : { x: 760, y: 520 } },
              { frame: B.demoClickFastest - 4, to: 'fastest' },
              { frame: B.demoClickCommon - 22, to: 'fastest' },
              { frame: B.demoClickCommon - 4, to: 'common' },
              { frame: B.demoClickRework - 22, to: 'common' },
              { frame: B.demoClickRework - 4, to: 'rework' },
              { frame: B.demoPanelIn - 24, to: 'rework' },
              { frame: B.demoPanelIn - 4, to: 'ai' },
            ],
          }}
        >
          <AbsoluteFill style={{ filter: st.mapBlur > 0.05 ? `blur(${st.mapBlur.toFixed(2)}px)` : undefined }}>
            <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${st.mapXf.tx}px, ${st.mapXf.ty}px) scale(${st.mapXf.s})` }}>
              {st.tangleOpacity > 0 && <Tangle o={o} frame={f} draw={1} resolve={st.tangleResolve} targets={targets} loopTarget={pos.verification} opacity={st.tangleOpacity} />}
              <ProcessMap o={o} frame={f} pos={pos} nodeOpacity={nodeOpacity} {...st.map} />
            </div>
          </AbsoluteFill>
          <DemoPanels o={o} f={f} panelIn={st.panelIn} chars={st.chars} recIn={st.recIn} blur={st.panelBlur} />
        </AppFrame>
      </Camera>
      <Illustrative o={o} appear={st.appear} />
    </AbsoluteFill>
  );
};
