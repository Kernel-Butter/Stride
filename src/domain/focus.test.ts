import { describe, expect, it } from 'vitest';
import {
  formatClock,
  holdProgress,
  remainingSeconds,
} from './focus';

describe('remainingSeconds', () => {
  it('clamps at zero after the target', () => {
    expect(remainingSeconds(0, 15, 16 * 60 * 1000)).toBe(0);
  });

  it('returns the exact midpoint', () => {
    expect(remainingSeconds(0, 25, 12.5 * 60 * 1000)).toBe(750);
  });
});

describe('formatClock', () => {
  it('zero-pads minutes and seconds', () => {
    expect(formatClock(245)).toBe('04:05');
  });

  it('formats zero', () => {
    expect(formatClock(0)).toBe('00:00');
  });

  it('handles more than 59 minutes', () => {
    expect(formatClock(3661)).toBe('61:01');
  });
});

describe('holdProgress', () => {
  it('returns zero at the start', () => {
    expect(holdProgress(1_000, 1_000, 900)).toBe(0);
  });

  it('returns the midpoint', () => {
    expect(holdProgress(1_000, 1_450, 900)).toBe(0.5);
  });

  it('returns one at the end', () => {
    expect(holdProgress(1_000, 1_900, 900)).toBe(1);
  });

  it('clamps to one past the end', () => {
    expect(holdProgress(1_000, 2_000, 900)).toBe(1);
  });
});
