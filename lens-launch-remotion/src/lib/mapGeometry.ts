import { EDGES, LAYOUT, NODES, ROUTES, type NodeId, type Orientation, type RouteId } from '../data/process';
import { cubicAt, resample, type Pt } from './geometry';

export type Positions = Record<NodeId, Pt>;

export type EdgeGeom = {
  id: string;
  a: Pt;
  c1: Pt;
  c2: Pt;
  b: Pt;
  d: string;
  pts: Pt[];
  length: number;
};

const SAMPLES = 40;

const halfExtent = (id: NodeId, o: Orientation, scale = 1) => {
  const L = LAYOUT[o];
  if (NODES[id].kind === 'event') return L.eventR * scale;
  return (o === 'h' ? L.task.w / 2 : L.task.h / 2) * scale;
};

/** Cubic edge from source's outgoing side to target's incoming side, tangent to the flow axis. */
export const edgeGeom = (id: string, pos: Positions, o: Orientation, scales?: Partial<Record<NodeId, number>>): EdgeGeom => {
  const e = EDGES.find((x) => x.id === id)!;
  const p = pos[e.from];
  const q = pos[e.to];
  const gap = 3;
  let a: Pt, b: Pt, c1: Pt, c2: Pt;
  if (o === 'h') {
    a = { x: p.x + halfExtent(e.from, o, scales?.[e.from]), y: p.y };
    b = { x: q.x - halfExtent(e.to, o, scales?.[e.to]) - gap, y: q.y };
    const dx = Math.max(30, (b.x - a.x) * 0.5);
    c1 = { x: a.x + dx, y: a.y };
    c2 = { x: b.x - dx, y: b.y };
  } else {
    a = { x: p.x, y: p.y + halfExtent(e.from, o, scales?.[e.from]) };
    b = { x: q.x, y: q.y - halfExtent(e.to, o, scales?.[e.to]) - gap };
    const dy = Math.max(30, (b.y - a.y) * 0.5);
    c1 = { x: a.x, y: a.y + dy };
    c2 = { x: b.x, y: b.y - dy };
  }
  const pts: Pt[] = [];
  let length = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const pt = cubicAt(a, c1, c2, b, i / SAMPLES);
    if (i > 0) length += Math.hypot(pt.x - pts[i - 1].x, pt.y - pts[i - 1].y);
    pts.push(pt);
  }
  const f = (n: number) => n.toFixed(1);
  const d = `M${f(a.x)},${f(a.y)} C${f(c1.x)},${f(c1.y)} ${f(c2.x)},${f(c2.y)} ${f(b.x)},${f(b.y)}`;
  return { id, a, c1, c2, b, d, pts, length };
};

export type RouteGeom = {
  pts: Pt[];
  cum: number[];
  length: number;
  d: string;
  at: (s: number) => Pt;
};

/** A whole route as one polyline — edges joined through the node centres (hidden under the cards). */
export const routeGeom = (route: RouteId, pos: Positions, o: Orientation, scales?: Partial<Record<NodeId, number>>): RouteGeom => {
  const pts: Pt[] = [];
  ROUTES[route].forEach((eid, i) => {
    const g = edgeGeom(eid, pos, o, scales);
    const e = EDGES.find((x) => x.id === eid)!;
    if (i === 0) pts.push(pos[e.from]);
    pts.push(...g.pts);
    pts.push(pos[e.to]);
  });
  return polyline(pts);
};

export const polyline = (pts: Pt[]): RouteGeom => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const length = cum[cum.length - 1];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const at = (s: number) => {
    const target = Math.max(0, Math.min(1, s)) * length;
    let lo = 0;
    let hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid;
      else hi = mid;
    }
    const t = (target - cum[lo]) / (cum[hi] - cum[lo] || 1);
    return { x: pts[lo].x + (pts[hi].x - pts[lo].x) * t, y: pts[lo].y + (pts[hi].y - pts[lo].y) * t };
  };
  return { pts, cum, length, d, at };
};

export const resampleRoute = (r: RouteGeom, n: number) => resample(r.pts, n);

/** Rework self-loop on a node, drawn on the side away from the main flow. */
export const reworkLoop = (c: Pt, o: Orientation) => {
  const L = LAYOUT[o];
  if (o === 'h') {
    const top = c.y - L.task.h / 2;
    return `M${c.x + 34},${top - 2} C${c.x + 64},${top - 92} ${c.x - 64},${top - 92} ${c.x - 34},${top - 4}`;
  }
  const left = c.x - L.task.w / 2;
  return `M${left - 2},${c.y - 22} C${left - 96},${c.y - 52} ${left - 96},${c.y + 52} ${left - 4},${c.y + 22}`;
};
