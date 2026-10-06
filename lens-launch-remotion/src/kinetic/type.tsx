import React from 'react';
import { clamp01 } from '../lib/anim';
import { C, EASE, FONT } from '../theme';

// Kinetic type primitives. Every word carries its own entrance frame, so type can be
// set syllable-by-syllable against the VO and beat-by-beat against the score.

export type Enter = 'rise' | 'slam' | 'drop' | 'fade' | 'none';
export type Exit = 'lift' | 'fade' | 'none';

export type WordSpec = {
  t: string;
  at: number;
  enter?: Enter;
  color?: string;
  weight?: number;
  size?: number; // overrides the line size (em-relative sizes are not used: keep px)
  bg?: string; // highlight pill behind the word
  italic?: boolean;
};

type WordProps = WordSpec & {
  f: number;
  exitAt?: number;
  exit?: Exit;
  dur?: number;
  style?: React.CSSProperties;
};

/** One word: its own mask, entrance and exit. */
export const KWord: React.FC<WordProps> = ({ t, at, f, enter = 'rise', exitAt, exit = 'lift', dur, color, weight, size, bg, italic, style }) => {
  const d = dur ?? (enter === 'slam' ? 9 : enter === 'drop' ? 14 : 12);
  const pIn = enter === 'none' ? (f >= at ? 1 : 0) : clamp01((f - at) / d);
  const pOut = exitAt !== undefined && exit !== 'none' ? clamp01((f - exitAt) / 9) : 0;
  const base: React.CSSProperties = {
    display: 'inline-block',
    color,
    fontWeight: weight,
    fontSize: size,
    fontStyle: italic ? 'italic' : undefined,
    whiteSpace: 'pre',
    ...(bg ? { background: bg, borderRadius: '0.18em', padding: '0 0.14em', margin: '0 -0.04em' } : {}),
  };
  // keep the word's slot reserved before it enters and after it leaves, so lines never reflow
  if (pIn <= 0 || pOut >= 1) return <span style={{ ...base, visibility: 'hidden' }}>{t}</span>;
  const e = EASE.settle(pIn);
  const x = EASE.exit(pOut);

  if (enter === 'drop') {
    // letters fall into place one after another ("piles up")
    return (
      <span style={{ ...base, opacity: 1 - x, transform: `translateY(${-x * 40}%)`, ...style }}>
        {[...t].map((ch, i) => {
          const p = EASE.settle(clamp01((f - at - i * 2) / d));
          return (
            <span key={i} style={{ display: 'inline-block', transform: `translateY(${(1 - p) * -110}%) rotate(${(1 - p) * (i % 2 ? 9 : -7)}deg)`, opacity: Math.min(1, p * 2) }}>
              {ch}
            </span>
          );
        })}
      </span>
    );
  }

  let inner: React.CSSProperties;
  switch (enter) {
    case 'slam':
      inner = { transform: `scale(${1 + 0.32 * (1 - e)})`, filter: e < 0.98 ? `blur(${(1 - e) * 14}px)` : undefined, opacity: Math.min(1, pIn * 2.2), letterSpacing: `${(1 - e) * 0.05}em` };
      break;
    case 'fade':
      inner = { opacity: e };
      break;
    case 'none':
      inner = {};
      break;
    default:
      inner = { transform: `translateY(${(1 - e) * 105}%)`, opacity: Math.min(1, pIn * 1.6), letterSpacing: `${(1 - e) * 0.06}em` };
  }
  const outer: React.CSSProperties =
    exit === 'fade' ? { opacity: 1 - x } : { opacity: 1 - x, transform: `translateY(${-x * 55}%)` };
  return (
    <span style={{ display: 'inline-block', overflow: enter === 'rise' ? 'hidden' : 'visible', padding: enter === 'rise' ? '0.08em 0.02em 0.16em' : undefined, margin: enter === 'rise' ? '-0.08em -0.02em -0.16em' : undefined, verticalAlign: 'bottom', ...outer }}>
      <span style={{ ...base, ...inner, ...style }}>{t}</span>
    </span>
  );
};

/** A line of words that wraps naturally (portrait re-flows for free). */
export const KLine: React.FC<{
  f: number;
  words: WordSpec[];
  size: number;
  weight?: number;
  color?: string;
  tracking?: string;
  align?: 'left' | 'center' | 'right';
  exitAt?: number;
  exit?: Exit;
  maxWidth?: number;
  lineHeight?: number;
  style?: React.CSSProperties;
  gap?: string;
}> = ({ f, words, size, weight = 800, color = C.ink, tracking = '-0.04em', align = 'center', exitAt, exit, maxWidth, lineHeight = 1.02, style, gap = '0.24em' }) => (
  <div
    style={{
      fontFamily: FONT,
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing: tracking,
      lineHeight,
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
      alignItems: 'baseline',
      columnGap: gap,
      maxWidth,
      fontVariantNumeric: 'tabular-nums',
      ...style,
    }}
  >
    {words.map((w, i) => (
      <KWord key={i} {...w} f={f} exitAt={exitAt} exit={exit} />
    ))}
  </div>
);

/** Spread the words of a phrase from `from`, one every `step` frames. */
export const seq = (text: string, from: number, step: number, extra: Partial<WordSpec> = {}): WordSpec[] =>
  text.split(' ').map((t, i) => ({ t, at: from + i * step, ...extra }));

/** Small spaced caps label. */
export const Label: React.FC<{ f: number; at: number; children: React.ReactNode; color?: string; size?: number; exitAt?: number; style?: React.CSSProperties }> = ({ f, at, children, color = C.ink2, size = 22, exitAt, style }) => {
  const p = EASE.settle(clamp01((f - at) / 14));
  const x = exitAt !== undefined ? EASE.exit(clamp01((f - exitAt) / 9)) : 0;
  return (
    <div style={{ fontFamily: FONT, fontSize: size, fontWeight: 750, letterSpacing: '0.22em', textTransform: 'uppercase', color, opacity: p * (1 - x), transform: `translateY(${(1 - p) * 14 - x * 14}px)`, ...style }}>
      {children}
    </div>
  );
};
