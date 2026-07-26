export interface QuietHours {
  start: number;
  end: number;
}

export const DEFAULT_QUIET_HOURS: QuietHours = { start: 23, end: 7 };

export function parseHourSetting(raw: string | undefined, fallback: number): number {
  if (raw === undefined || !/^\d+$/.test(raw)) return fallback;
  const hour = Number(raw);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : fallback;
}

export function formatHour(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

export function cycleHour(hour: number, direction: 1 | -1): number {
  return (hour + direction + 24) % 24;
}
