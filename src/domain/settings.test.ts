import { describe, expect, it } from 'vitest';
import { cycleHour, formatHour, parseHourSetting } from './settings';

describe('parseHourSetting', () => {
  it('uses the fallback for an undefined value', () => {
    expect(parseHourSetting(undefined, 23)).toBe(23);
  });

  it('uses the fallback for a non-numeric value', () => {
    expect(parseHourSetting('noon', 7)).toBe(7);
  });

  it('uses the fallback for values below the valid range', () => {
    expect(parseHourSetting('-1', 7)).toBe(7);
  });

  it('uses the fallback for values above the valid range', () => {
    expect(parseHourSetting('24', 23)).toBe(23);
  });

  it('parses a valid hour', () => {
    expect(parseHourSetting('13', 7)).toBe(13);
  });
});

describe('formatHour', () => {
  it('formats hours with a 12-hour clock', () => {
    expect(formatHour(0)).toBe('12:00 AM');
    expect(formatHour(7)).toBe('7:00 AM');
    expect(formatHour(12)).toBe('12:00 PM');
    expect(formatHour(13)).toBe('1:00 PM');
    expect(formatHour(23)).toBe('11:00 PM');
  });
});

describe('cycleHour', () => {
  it('wraps forward from 23 to 0', () => {
    expect(cycleHour(23, 1)).toBe(0);
  });

  it('wraps backward from 0 to 23', () => {
    expect(cycleHour(0, -1)).toBe(23);
  });
});
