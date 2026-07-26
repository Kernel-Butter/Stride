export function remainingSeconds(
  startedAt: number,
  targetMinutes: number,
  now: number,
): number {
  const targetSeconds = targetMinutes * 60;
  const elapsedSeconds = Math.floor((now - startedAt) / 1_000);
  return Math.max(0, targetSeconds - elapsedSeconds);
}

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function holdProgress(
  holdStartedAt: number,
  now: number,
  requiredHoldMs: number,
): number {
  return Math.min(1, Math.max(0, (now - holdStartedAt) / requiredHoldMs));
}

export const FOCUS_DURATIONS_MINUTES: number[] = [15, 25, 50];
export const HOLD_TO_END_MS = 900;
