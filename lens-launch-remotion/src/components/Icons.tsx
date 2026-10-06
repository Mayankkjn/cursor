import React from 'react';

type P = { size?: number; color?: string; strokeWidth?: number };

const Svg: React.FC<P & { children: React.ReactNode }> = ({ size = 20, color = 'currentColor', strokeWidth = 2, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    {children}
  </svg>
);

export const Sparkle: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </Svg>
);
export const Bolt: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
  </Svg>
);
export const Check: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M5 12.5l4.2 4.2L19 7" />
  </Svg>
);
export const Users: React.FC<P> = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
    <path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.8c1.9.7 3.2 2.5 3.5 5.2" />
  </Svg>
);
export const Clock: React.FC<P> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const Loop: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M4 12a8 8 0 0113.7-5.7L20 8.5" />
    <path d="M20 4v4.5h-4.5" />
    <path d="M20 12a8 8 0 01-13.7 5.7L4 15.5" />
    <path d="M4 20v-4.5h4.5" />
  </Svg>
);
export const Repeat: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a3 3 0 013-3h15" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v2a3 3 0 01-3 3H3" />
  </Svg>
);
export const Layers: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M12 3l9 5-9 5-9-5z" />
    <path d="M3 13l9 5 9-5" />
  </Svg>
);
export const Apps: React.FC<P> = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </Svg>
);
export const Arrow: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const Activity: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </Svg>
);

/** Product task icon (process-map .icon-task-*) */
export const TaskIcon: React.FC<{ size?: number; color?: string }> = ({ size = 22, color = '#5b5e78' }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" style={{ display: 'block', flexShrink: 0 }}>
    <rect x="1" y="3" width="20" height="16" rx="4" fill={color} />
    <rect x="4.5" y="6.5" width="9" height="2.6" rx="1.3" fill="#fff" />
    <rect x="4.5" y="11.2" width="6" height="2.6" rx="1.3" fill="#fff" opacity="0.75" />
    <circle cx="16" cy="12.5" r="2" fill="#fff" />
  </svg>
);

/** Pointer cursor used for the few UI clicks. */
export const Cursor: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', filter: 'drop-shadow(0 2px 3px rgba(24,26,51,0.25))' }}>
    <path d="M5 2.5l13.5 12.2-6.1.6 3.6 7.1-2.6 1.3-3.6-7.2L5 21z" fill="#2a2e45" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
