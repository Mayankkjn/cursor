import React from 'react';
import { interpolate } from 'remotion';
import { STATS, type Orientation } from '../data/process';
import { clamp01 } from '../lib/anim';
import { C, EASE, FONT } from '../theme';
import { Cursor, Sparkle } from './Icons';
import { LensLogo } from './LensLogo';

export type FilterKey = 'all' | 'fastest' | 'common' | 'rework' | 'ai';
export type FilterState = Record<FilterKey, number>;

// Fixed button geometry so the cursor can land on them deterministically.
export const FILTER_BUTTONS: Record<Orientation, Record<FilterKey, { x: number; w: number; y: number; h: number }>> = {
  h: {
    all: { x: 1006, w: 120, y: 56, h: 44 },
    fastest: { x: 1136, w: 170, y: 56, h: 44 },
    common: { x: 1316, w: 170, y: 56, h: 44 },
    rework: { x: 1496, w: 130, y: 56, h: 44 },
    ai: { x: 1656, w: 160, y: 56, h: 44 },
  },
  v: {
    all: { x: 56, w: 150, y: 250, h: 54 },
    fastest: { x: 218, w: 200, y: 250, h: 54 },
    common: { x: 430, w: 214, y: 250, h: 54 },
    rework: { x: 656, w: 160, y: 250, h: 54 },
    ai: { x: 828, w: 196, y: 250, h: 54 },
  },
};
export const buttonCenter = (o: Orientation, k: FilterKey) => {
  const b = FILTER_BUTTONS[o][k];
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
};

const LABELS: Record<FilterKey, string> = { all: 'All paths', fastest: 'Fastest path', common: 'Most common', rework: 'Rework', ai: 'AI Summary' };
const DOT: Partial<Record<FilterKey, string>> = { fastest: C.fastest, common: C.common, rework: C.rework };

const activeStyle = (k: FilterKey, p: number): React.CSSProperties => {
  const mixC = (a: string, b: string) => (p > 0 ? `color-mix(in srgb, ${b} ${Math.round(p * 100)}%, ${a})` : a);
  switch (k) {
    case 'fastest':
      return { background: mixC('#fff', C.fastestSoft), borderColor: mixC('#dfdde7', C.fastest), color: mixC(C.toolbarInk, C.fastestInk) };
    case 'common':
      return { background: mixC('#fff', C.commonSoft), borderColor: mixC('#dfdde7', C.common), color: C.toolbarInk };
    case 'rework':
      return { background: mixC('#fff', C.reworkSoft), borderColor: mixC('#dfdde7', C.rework), color: mixC(C.toolbarInk, C.reworkInk) };
    case 'ai':
      return { background: mixC('#fff', C.accent), borderColor: mixC('#dfdde7', C.accent), color: mixC(C.toolbarInk, '#ffffff') };
    default:
      return { background: mixC('#fff', '#eef0f6'), borderColor: '#dfdde7', color: C.toolbarInk };
  }
};

export type CursorKey = { frame: number; to: FilterKey | { x: number; y: number } };

export const AppFrame: React.FC<{
  o: Orientation;
  frame: number;
  appear: number; // chrome + window
  filters: FilterState;
  clicks: { frame: number; key: FilterKey }[];
  cursor?: { keys: CursorKey[]; showFrom: number; hideFrom: number };
  children?: React.ReactNode;
}> = ({ o, frame, appear, filters, clicks, cursor, children }) => {
  const h = o === 'h';
  const frameBox = h ? { left: 40, top: 40, width: 1840, height: 1000 } : { left: 28, top: 56, width: 1024, height: 1808 };
  const btns = FILTER_BUTTONS[o];

  const cursorPos = (() => {
    if (!cursor) return null;
    const pts = cursor.keys.map((k) => ({ frame: k.frame, ...(typeof k.to === 'string' ? buttonCenter(o, k.to) : k.to) }));
    let p = pts[0];
    for (let i = 0; i < pts.length - 1; i++) {
      if (frame >= pts[i].frame && frame <= pts[i + 1].frame) {
        const t = EASE.camera((frame - pts[i].frame) / (pts[i + 1].frame - pts[i].frame));
        p = { frame, x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t };
      } else if (frame > pts[i + 1].frame) p = pts[i + 1];
    }
    const op = interpolate(frame, [cursor.showFrom, cursor.showFrom + 8, cursor.hideFrom, cursor.hideFrom + 8], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return { ...p, op };
  })();

  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      {/* window */}
      <div
        style={{
          position: 'absolute',
          ...frameBox,
          borderRadius: h ? 24 : 32,
          background: C.canvas,
          border: `1px solid ${C.cardBorder}`,
          boxShadow: '0 4px 16px rgba(24,26,51,0.07), 0 30px 80px rgba(24,26,51,0.08)',
          opacity: appear,
        }}
      />
      {children}
      {/* top bar */}
      <div style={{ position: 'absolute', inset: 0, opacity: appear, transform: `translateY(${(1 - appear) * -10}px)` }}>
        <div
          style={{
            position: 'absolute',
            left: frameBox.left,
            top: frameBox.top,
            width: frameBox.width,
            height: h ? 76 : 270,
            background: '#ffffff',
            borderBottom: `1px solid ${C.panelBorder}`,
            borderRadius: h ? '24px 24px 0 0' : '32px 32px 0 0',
          }}
        />
        <div style={{ position: 'absolute', left: h ? 72 : 64, top: h ? 58 : 88, display: 'flex', alignItems: 'center', gap: h ? 12 : 16 }}>
          <LensLogo size={h ? 30 : 44} />
          <span style={{ fontSize: h ? 21 : 30, fontWeight: 750, color: C.ink, letterSpacing: '-0.01em' }}>Whatfix Lens</span>
          {h && <span style={{ width: 1, height: 26, background: C.panelBorder, margin: '0 8px' }} />}
          {h && <span style={{ fontSize: 20, fontWeight: 650, color: C.ink }}>Purchase to bind</span>}
          {h && <span style={{ fontSize: 16, fontWeight: 500, color: C.ink2, marginLeft: 6 }}>{STATS.instances} instances · {STATS.apps} apps · avg {STATS.avgDays}</span>}
        </div>
        {!h && (
          <div style={{ position: 'absolute', left: 64, top: 160, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 34, fontWeight: 750, color: C.ink }}>Purchase to bind</span>
            <span style={{ fontSize: 21, fontWeight: 500, color: C.ink2 }}>{STATS.instances} instances · avg {STATS.avgDays}</span>
          </div>
        )}
        {(Object.keys(btns) as FilterKey[]).map((k) => {
          const b = btns[k];
          const lastClick = clicks.filter((c) => c.key === k && frame >= c.frame).pop();
          const since = lastClick ? frame - lastClick.frame : 99;
          const press = since < 8 ? 1 - 0.05 * Math.sin((since / 8) * Math.PI) : 1;
          const ripple = since < 16 ? since / 16 : null;
          return (
            <React.Fragment key={k}>
              {k === 'ai' && h && <div style={{ position: 'absolute', left: b.x - 16, top: b.y + 8, width: 1, height: b.h - 16, background: C.panelBorder }} />}
              <div
                style={{
                  position: 'absolute',
                  left: b.x,
                  top: b.y,
                  width: b.w,
                  height: b.h,
                  borderRadius: h ? 10 : 14,
                  border: '1px solid #dfdde7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: h ? 8 : 10,
                  fontSize: h ? 16 : 21,
                  fontWeight: 650,
                  transform: `scale(${press})`,
                  overflow: 'hidden',
                  ...activeStyle(k, clamp01(filters[k])),
                }}
              >
                {DOT[k] && <span style={{ width: h ? 9 : 12, height: h ? 9 : 12, borderRadius: 12, background: DOT[k] }} />}
                {k === 'ai' && <Sparkle size={h ? 17 : 22} strokeWidth={2.2} />}
                {LABELS[k]}
                {ripple !== null && (
                  <span
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 220,
                      height: 220,
                      marginLeft: -110,
                      marginTop: -110,
                      borderRadius: 220,
                      background: k === 'ai' ? '#ffffff' : C.accent,
                      opacity: 0.22 * (1 - ripple),
                      transform: `scale(${0.1 + ripple})`,
                    }}
                  />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {cursorPos && cursorPos.op > 0 && (
        <div style={{ position: 'absolute', left: cursorPos.x - 4, top: cursorPos.y - 2, opacity: cursorPos.op * appear }}>
          <Cursor size={h ? 30 : 42} />
        </div>
      )}
    </div>
  );
};
