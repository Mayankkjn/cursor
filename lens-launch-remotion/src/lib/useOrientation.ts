import { useVideoConfig } from 'remotion';
import type { Orientation } from '../data/process';

export const useOrientation = (): Orientation => {
  const { width, height } = useVideoConfig();
  return height > width ? 'v' : 'h';
};
