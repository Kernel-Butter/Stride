import { getMissionHeat } from '../../domain/heat';
import { Mission } from '../../domain/mission';
import { DEFAULT_QUIET_HOURS, QuietHours } from '../../domain/settings';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export interface PlannedNotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
}

export interface PlannedCriticalAlarm extends PlannedNotification {
  missionId: string;
}

const HOT_COPY = [
  'Start with the smallest unfinished objective.',
  'The deadline is moving closer. Finish one step now.',
  'Open Stride and move this mission forward.',
];

function outsideQuietHours(
  timestamp: number,
  quietHours: QuietHours = DEFAULT_QUIET_HOURS,
): number {
  const date = new Date(timestamp);
  const hour = date.getHours();
  if (hour >= quietHours.start) {
    date.setDate(date.getDate() + 1);
    date.setHours(quietHours.end, 0, 0, 0);
  } else if (hour < quietHours.end) {
    date.setHours(quietHours.end, 0, 0, 0);
  }
  return date.getTime();
}

export function createNotificationPlan(
  missions: Mission[],
  now = Date.now(),
  quietHours: QuietHours = DEFAULT_QUIET_HOURS,
): PlannedNotification[] {
  return missions.flatMap((mission) => {
    const deadline = new Date(mission.deadline).getTime();
    const heat = getMissionHeat(mission.priority, deadline - now);

    if (heat === 'cold' || heat === 'critical' || mission.status !== 'active') return [];

    if (heat === 'warm') {
      const ideal = Math.max(now + 5 * MINUTE, deadline - 24 * HOUR);
      const timestamp = outsideQuietHours(ideal, quietHours);
      if (timestamp >= deadline) return [];
      return [{
        id: `stride:mission:${mission.id}:warm`,
        title: mission.title,
        body: 'A deadline is approaching. Choose the next objective.',
        timestamp,
      }];
    }

    const offsets = [15, 75, 165];
    return offsets
      .map((minutes, index) => ({
        id: `stride:mission:${mission.id}:hot:${index}`,
        title: mission.title,
        body: HOT_COPY[index],
        timestamp: outsideQuietHours(now + minutes * MINUTE, quietHours),
      }))
      .filter((item, index, items) =>
        item.timestamp < deadline &&
        items.findIndex((candidate) => candidate.timestamp === item.timestamp) === index,
      );
  });
}

export function createCriticalAlarmPlan(
  missions: Mission[],
  now = Date.now(),
): PlannedCriticalAlarm[] {
  return missions.flatMap((mission) => {
    const deadline = new Date(mission.deadline).getTime();
    const heat = getMissionHeat(mission.priority, deadline - now);
    if (heat !== 'critical' || mission.status !== 'active') return [];
    return [{
      id: `stride:mission:${mission.id}:critical`,
      missionId: mission.id,
      title: mission.title,
      body: deadline <= now ? 'This mission is overdue.' : 'The deadline has arrived.',
      timestamp: Math.max(now + 5_000, deadline),
    }];
  });
}
