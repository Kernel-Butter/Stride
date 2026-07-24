import { describe, expect, it } from 'vitest';
import { getMissionHeat } from './heat';

const hour = 60 * 60 * 1000;

describe('getMissionHeat', () => {
  it('marks overdue work critical', () => {
    expect(getMissionHeat('low', -hour)).toBe('critical');
  });

  it('keeps distant low priority work cold', () => {
    expect(getMissionHeat('low', 7 * 24 * hour)).toBe('cold');
  });

  it('makes a high priority deadline hot before it becomes critical', () => {
    expect(getMissionHeat('high', 48 * hour)).toBe('hot');
  });

  it('raises pressure after repeated postpones', () => {
    expect(getMissionHeat('medium', 7 * 24 * hour, 3)).toBe('hot');
  });
});
