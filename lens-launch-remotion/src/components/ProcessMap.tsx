import React from 'react';
import { interpolateColors } from 'remotion';
import { EDGES, LAYOUT, NODES, NODE_IDS, ROUTES, STATS, routeOfEdge, type NodeId, type Orientation } from '../data/process';
import { beatPulse, clamp01 } from '../lib/anim';
import { mix, polyD, resample } from '../lib/geometry';
import { edgeGeom, reworkLoop, routeGeom, type Positions } from '../lib/mapGeometry';
import { C, FONT, T } from '../theme';
import { Clock, Repeat, TaskIcon } from './Icons';
import { PathHighlight } from './PathHighlight';

export type MapBadges = { fastest?: number; common?: number; rework?: number; timeSink?: number };

export type ProcessMapProps = {
  o: Orientation;
  frame: number; // absolute frame — drives flow dots and beat-locked pulses
  pos: Positions;
  nodeIn?: (id: NodeId) => number; // entrance 0..1 per node
  nodeOpacity?: Partial<Record<NodeId, number>>;
  nodeDot?: Partial<Record<NodeId, number>>; // 0 = card, 1 = collapsed to a dot on the line
  edgesIn?: number;
  fastest?: number; // highlight progress of the fastest path (draw-on)
  common?: number; // highlight progress of the most common path
  rework?: number; // rework hotspot emphasis
  dimOthers?: number; // fade for everything not highlighted
  collapse?: number; // morph: most-common path folds into the fastest path
  flowFrom?: number; // frame the instance dots start flowing (undefined = no dots)
  flowOpacity?: number;
  comet?: number; // pulse along the fastest path
  glow?: number;
  badges?: MapBadges;
  labels?: number; // node label visibility
};

const DOTS = 15;

export const ProcessMap: React.FC<ProcessMapProps> = ({
  o,
  frame,
  pos,
  nodeIn = () => 1,
  nodeOpacity = {},
  nodeDot = {},
  edgesIn = 1,
  fastest = 0,
  common = 0,
  rework = 0,
  dimOthers = 0,
  collapse = 0,
  flowFrom,
  flowOpacity = 1,
  comet,
  glow = 1,
  badges = {},
  labels = 1,
}) => {
  const L = LAYOUT[o];
  const W = o === 'h' ? 1920 : 1080;
  const H = o === 'h' ? 1080 : 1920;
  const scales: Partial<Record<NodeId, number>> = {};
  NODE_IDS.forEach((id) => (scales[id] = 1 - (nodeDot[id] ?? 0)));

  const fastestRoute = routeGeom('fastest', pos, o, scales);
  const commonRoute = routeGeom('common', pos, o, scales);
  const commonOnly = new Set(ROUTES.common.filter((e) => !ROUTES.fastest.includes(e)));

  const edgeColor = (id: string) => {
    const r = routeOfEdge(id);
    if (r.fastest && fastest > 0) return interpolateColors(clamp01(fastest * 1.4), [0, 1], [C.edge, C.fastest]);
    if (r.common && common > 0) return interpolateColors(clamp01(common * 1.4), [0, 1], [C.edge, C.common]);
    return C.edge;
  };
  const edgeOpacity = (id: string) => {
    let op = edgesIn;
    if (commonOnly.has(id)) op *= 1 - clamp01(collapse * 3);
    const r = routeOfEdge(id);
    const highlighted = (r.fastest && fastest > 0.5) || (r.common && common > 0.5);
    if (!highlighted) op *= 1 - 0.6 * dimOthers;
    return op;
  };

  // Rework loop pulses on the beat (72 BPM = every 25 frames), in sync with the score.
  const pulse = beatPulse(frame, T.beatFrames, 3);
  const loopColor = interpolateColors(rework, [0, 1], [C.edge, C.rework]);
  const verifOpacity = (nodeOpacity.verification ?? 1) * nodeIn('verification');

  // The most-common path folding into the fastest one (morph).
  const N = 140;
  let collapsedCommon = commonRoute.d;
  if (collapse > 0) {
    const target = resample(fastestRoute.pts, N);
    collapsedCommon = polyD(resample(commonRoute.pts, N).map((p, i) => mix(p, target[i], collapse)));
  }

  const dots = flowFrom !== undefined && frame >= flowFrom ? (
    <g opacity={flowOpacity}>
      {[...Array(DOTS)].map((_, i) => {
        const onFastest = i % 3 === 0; // 1 in 3 instances already take Path B
        const period = onFastest ? 120 : 165; // ...and they finish faster
        const phase = (i * 0.618) % 1;
        const s = ((frame - flowFrom) / period + phase) % 1;
        const route = onFastest ? fastestRoute : commonRoute;
        const p = route.at(s);
        const edgeFade = Math.min(1, s / 0.04, (1 - s) / 0.04);
        const ramp = clamp01((frame - flowFrom) / 20);
        const col = onFastest
          ? interpolateColors(clamp01(fastest * 1.5), [0, 1], [C.ink3, C.fastest])
          : interpolateColors(clamp01(common * 1.5), [0, 1], [C.ink3, '#7d8299']);
        const fade = onFastest ? 1 : 1 - 0.55 * clamp01(dimOthers - common);
        return <circle key={i} cx={p.x} cy={p.y} r={o === 'h' ? 6 : 7.5} fill={col} opacity={edgeFade * ramp * fade * (1 - collapse * (onFastest ? 0 : 1))} stroke="#fff" strokeWidth={1.5} />;
      })}
    </g>
  ) : null;

  const badge = (
    key: string,
    p: number | undefined,
    x: number,
    y: number,
    bg: string,
    fg: string,
    border: string,
    content: React.ReactNode,
  ) =>
    p && p > 0.001 ? (
      <div
        key={key}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `translate(-50%, -50%) translateY(${(1 - p) * 10}px) scale(${0.94 + 0.06 * p})`,
          opacity: p * (1 - collapse),
          background: bg,
          color: fg,
          border: `1.5px solid ${border}`,
          borderRadius: 100,
          padding: o === 'h' ? '7px 16px' : '9px 20px',
          fontSize: o === 'h' ? 17 : 22,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 4px 14px rgba(24,26,51,0.08)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {content}
      </div>
    ) : null;

  const dot = (c: string) => <span style={{ width: 9, height: 9, borderRadius: 9, background: c, display: 'inline-block' }} />;
  const vb = pos.verification;
  const ft = pos.fasttrack;
  const ap = pos.approval;
  const badgePos =
    o === 'h'
      ? { fastest: [ft.x, ft.y + 66], common: [vb.x - 250, vb.y - 38], rework: [vb.x + 245, vb.y - 82], timeSink: [ap.x, ap.y - 68] }
      : { fastest: [290, 372], common: [790, 372], rework: [vb.x - 120, vb.y - 92], timeSink: [ap.x + 330, ap.y] };

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, fontFamily: FONT }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <filter id="glow-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="node-shadow" x="-20%" y="-30%" width="140%" height="180%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#181a33" floodOpacity="0.08" />
          </filter>
          {EDGES.map((e) => (
            <marker key={e.id} id={`arrow-${e.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth={o === 'h' ? 12 : 14} markerHeight={o === 'h' ? 12 : 14} markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0,0.8 L9,5 L0,9.2 z" fill={edgeColor(e.id)} />
            </marker>
          ))}
          <marker id="arrow-rework" viewBox="0 0 10 10" refX="8" refY="5" markerWidth={13} markerHeight={13} markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0,0.8 L9,5 L0,9.2 z" fill={loopColor} />
          </marker>
        </defs>

        {/* base edges */}
        {EDGES.map((e) => {
          const g = edgeGeom(e.id, pos, o, scales);
          const op = edgeOpacity(e.id);
          if (op <= 0.001) return null;
          return <path key={e.id} d={g.d} fill="none" stroke={edgeColor(e.id)} strokeWidth={2.2} opacity={op} markerEnd={`url(#arrow-${e.id})`} />;
        })}

        {/* rework loop on Verification */}
        {verifOpacity > 0.01 && (
          <g opacity={edgesIn * verifOpacity * (1 - clamp01(collapse * 2))}>
            {rework > 0 && (
              <path d={reworkLoop(vb, o)} fill="none" stroke={C.rework} strokeWidth={12} opacity={rework * (0.15 + 0.35 * pulse)} filter="url(#glow-blur)" />
            )}
            <path d={reworkLoop(vb, o)} fill="none" stroke={loopColor} strokeWidth={2.2 + 1.6 * rework} markerEnd="url(#arrow-rework)" />
          </g>
        )}

        {/* most common path (muted) then the fastest path (accent, glowing) */}
        <PathHighlight d={collapsedCommon} color={C.common} width={o === 'h' ? 5 : 6} draw={common} opacity={1 - collapse * collapse} />
        <PathHighlight d={fastestRoute.d} color={C.fastest} width={o === 'h' ? 5.5 : 6.5} draw={fastest} glow={glow} comet={comet} />

        {dots}

        {/* nodes */}
        {NODE_IDS.map((id) => {
          const n = NODES[id];
          const p = pos[id];
          const inP = nodeIn(id);
          const op = inP * (nodeOpacity[id] ?? 1);
          if (op <= 0.001) return null;
          const dotP = nodeDot[id] ?? 0;
          const sc = (0.85 + 0.15 * inP) * (1 - dotP);
          const strokeCol =
            id === 'fasttrack' && fastest > 0
              ? interpolateColors(clamp01(fastest), [0, 1], [C.boxStroke, C.fastest])
              : id === 'verification' && rework > 0
                ? interpolateColors(rework, [0, 1], [C.boxStroke, C.rework])
                : id === 'approval' && (badges.timeSink ?? 0) > 0
                  ? interpolateColors(badges.timeSink ?? 0, [0, 1], [C.boxStroke, C.ink])
                  : C.boxStroke;
          const greenDot = dotP > 0 ? <circle cx={p.x} cy={p.y} r={10 * dotP} fill={C.fastest} stroke="#fff" strokeWidth={3} /> : null;
          if (n.kind === 'event') {
            const r = L.eventR * sc;
            return (
              <g key={id} opacity={op}>
                {sc > 0.02 && <circle cx={p.x} cy={p.y} r={r} fill="#fff" stroke={C.ink} strokeWidth={id === 'end' ? 4.5 : 2.5} />}
                {sc > 0.02 && (
                  <text x={p.x} y={o === 'h' ? p.y + r + 26 : p.y} dx={o === 'v' ? -(r + 16) : 0} textAnchor={o === 'h' ? 'middle' : 'end'} dominantBaseline={o === 'h' ? 'auto' : 'central'} fontSize={o === 'h' ? 15 : 19} fontWeight={600} fill={C.ink2} opacity={labels * (1 - dotP)}>
                    {n.label}
                  </text>
                )}
                {greenDot}
              </g>
            );
          }
          const w = L.task.w;
          const h = L.task.h;
          return (
            <g key={id} opacity={op}>
              {sc > 0.02 && (
                <g transform={`translate(${p.x} ${p.y}) scale(${sc}) translate(${-p.x} ${-p.y})`}>
                  <rect x={p.x - w / 2} y={p.y - h / 2} width={w} height={h} rx={14} fill="#fff" stroke={strokeCol} strokeWidth={strokeCol === C.boxStroke ? 1.5 : 2.2} filter="url(#node-shadow)" />
                  <g opacity={labels}>
                    <g transform={`translate(${p.x - w / 2 + (o === 'h' ? 16 : 20)} ${p.y - (o === 'h' ? 11 : 14)})`}>
                      <TaskIcon size={o === 'h' ? 22 : 28} />
                    </g>
                    <text x={p.x - w / 2 + (o === 'h' ? 50 : 62)} y={p.y - (o === 'h' ? 6 : 8)} fontSize={L.font * (o === 'h' && n.label.length > 14 ? 0.86 : 1)} fontWeight={650} fill={C.ink}>
                      {n.label}
                    </text>
                    <text x={p.x - w / 2 + (o === 'h' ? 50 : 62)} y={p.y + (o === 'h' ? 17 : 22)} fontSize={o === 'h' ? 14 : 18} fontWeight={500} fill={C.ink2}>
                      {n.meta}
                    </text>
                  </g>
                </g>
              )}
              {greenDot}
            </g>
          );
        })}
      </svg>

      {/* HTML badges on top of the map */}
      {badge('fastest', badges.fastest, badgePos.fastest[0], badgePos.fastest[1], C.fastestSoft, C.fastestInk, '#bfe6cf', (
        <>
          {dot(C.fastest)} Fastest path · {STATS.fastestDays}
        </>
      ))}
      {badge('common', badges.common, badgePos.common[0], badgePos.common[1], C.commonSoft, C.ink, '#d9dbe6', (
        <>
          {dot(C.common)} Most common · {STATS.commonDays}
        </>
      ))}
      {badge('rework', badges.rework, badgePos.rework[0], badgePos.rework[1], C.reworkSoft, C.reworkInk, '#f1d3b0', (
        <>
          <Repeat size={o === 'h' ? 16 : 20} color={C.rework} strokeWidth={2.4} /> Rework hotspot · {STATS.reworkRepeat} repeat
        </>
      ))}
      {badge('timeSink', badges.timeSink, badgePos.timeSink[0], badgePos.timeSink[1], C.ink, '#fff', C.ink, (
        <>
          <Clock size={o === 'h' ? 16 : 20} color="#fff" strokeWidth={2.4} /> Biggest time sink
        </>
      ))}
    </div>
  );
};
