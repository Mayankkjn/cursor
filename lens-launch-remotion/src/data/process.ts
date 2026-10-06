import { P, type Pt } from '../lib/geometry';

// "Purchase to bind" — the insurance process the film is built around.
// All figures are illustrative concept numbers (see the on-screen "Illustrative" label).

export type NodeId = 'start' | 'submit' | 'approval' | 'verification' | 'fasttrack' | 'issue' | 'bind' | 'end';
export type RouteId = 'fastest' | 'common';
export type Orientation = 'h' | 'v';

export const NODES: Record<NodeId, { label: string; kind: 'event' | 'task'; meta?: string }> = {
  start: { label: 'Start', kind: 'event' },
  submit: { label: 'Submit request', kind: 'task', meta: 'avg 0.2d' },
  approval: { label: 'Approval', kind: 'task', meta: 'avg 1.1d' },
  verification: { label: 'Verification', kind: 'task', meta: 'avg 0.8d' },
  fasttrack: { label: 'Fast-track review', kind: 'task', meta: 'avg 0.3d' },
  issue: { label: 'Issue policy', kind: 'task', meta: 'avg 0.2d' },
  bind: { label: 'Bind', kind: 'task', meta: 'avg 0.1d' },
  end: { label: 'End', kind: 'event' },
};
export const NODE_IDS = Object.keys(NODES) as NodeId[];

export type Edge = { id: string; from: NodeId; to: NodeId };
export const EDGES: Edge[] = [
  { id: 'e1', from: 'start', to: 'submit' },
  { id: 'e2', from: 'submit', to: 'approval' },
  { id: 'e3', from: 'approval', to: 'verification' },
  { id: 'e4', from: 'verification', to: 'issue' },
  { id: 'e5', from: 'approval', to: 'fasttrack' },
  { id: 'e6', from: 'fasttrack', to: 'issue' },
  { id: 'e7', from: 'issue', to: 'bind' },
  { id: 'e8', from: 'bind', to: 'end' },
];

// Path B is the fastest path; Path A is the most common one.
export const ROUTES: Record<RouteId, string[]> = {
  fastest: ['e1', 'e2', 'e5', 'e6', 'e7', 'e8'],
  common: ['e1', 'e2', 'e3', 'e4', 'e7', 'e8'],
};
export const routeOfEdge = (id: string) => ({
  fastest: ROUTES.fastest.includes(id),
  common: ROUTES.common.includes(id),
});

export const STATS = {
  instances: '24,310',
  apps: 5,
  fastestDays: '1.9 days',
  commonDays: '2.4 days',
  avgDays: '3.2 days',
  commonShare: '46%',
  reworkRepeat: '38%',
};

// World-space layouts. 16:9 flows left→right; the 9:16 cutdown flows top→bottom.
export const LAYOUT: Record<Orientation, { pos: Record<NodeId, Pt>; task: { w: number; h: number }; eventR: number; font: number }> = {
  h: {
    pos: {
      start: P(180, 600),
      submit: P(420, 600),
      approval: P(720, 600),
      verification: P(1020, 450),
      fasttrack: P(1020, 750),
      issue: P(1320, 600),
      bind: P(1600, 600),
      end: P(1790, 600),
    },
    task: { w: 220, h: 72 },
    eventR: 18,
    font: 20,
  },
  v: {
    pos: {
      start: P(540, 450),
      submit: P(540, 600),
      approval: P(540, 800),
      verification: P(320, 1030),
      fasttrack: P(760, 1030),
      issue: P(540, 1260),
      bind: P(540, 1460),
      end: P(540, 1610),
    },
    task: { w: 320, h: 84 },
    eventR: 22,
    font: 25,
  },
};

// Morph: the fastest path straightened onto one line.
export const STRAIGHT: Record<Orientation, Partial<Record<NodeId, Pt>>> = {
  h: {
    start: P(140, 600),
    submit: P(420, 600),
    approval: P(760, 600),
    fasttrack: P(1100, 600),
    issue: P(1400, 600),
    bind: P(1640, 600),
    end: P(1800, 600),
  },
  v: {
    start: P(540, 360),
    submit: P(540, 560),
    approval: P(540, 800),
    fasttrack: P(540, 1040),
    issue: P(540, 1260),
    bind: P(540, 1440),
    end: P(540, 1580),
  },
};
