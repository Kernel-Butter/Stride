import { Heat, Priority } from './mission';

const HOUR = 60 * 60 * 1000;

export function getMissionHeat(
  priority: Priority,
  msToDeadline: number,
  postponeCount = 0,
): Heat {
  if (msToDeadline <= 0) return 'critical';

  const hours = msToDeadline / HOUR;
  const pressure = priority === 'high' ? 2 : priority === 'medium' ? 1 : 0;
  const postponePressure = postponeCount >= 3 ? 2 : postponeCount > 0 ? 1 : 0;
  const score =
    (hours <= 6 ? 3 : hours <= 24 ? 2 : hours <= 72 ? 1 : 0) +
    pressure +
    postponePressure;

  if (score >= 5) return 'critical';
  if (score >= 3) return 'hot';
  if (score >= 1) return 'warm';
  return 'cold';
}
