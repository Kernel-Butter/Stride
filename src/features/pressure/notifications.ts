import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  EventType,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { getMissionSnoozedUntil, getSetting } from '../../db/database';
import { Mission } from '../../domain/mission';
import {
  DEFAULT_QUIET_HOURS,
  parseHourSetting,
  QuietHours,
} from '../../domain/settings';
import { createCriticalAlarmPlan, createNotificationPlan } from './notificationPlan';

const CHANNEL_ID = 'mission-reminders';
const CRITICAL_CHANNEL_ID = 'critical-mission-alarms';
const NOTIFICATION_PREFIX = 'stride:mission:';

export async function getNotificationPermissionState(): Promise<'enabled' | 'disabled'> {
  const settings = await notifee.getNotificationSettings();
  return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    ? 'enabled'
    : 'disabled';
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
}

export async function getExactAlarmPermissionState(): Promise<'enabled' | 'disabled'> {
  const settings = await notifee.getNotificationSettings();
  return settings.android.alarm === AndroidNotificationSetting.ENABLED ? 'enabled' : 'disabled';
}

export async function openExactAlarmPermissionSettings(): Promise<void> {
  await notifee.openAlarmPermissionSettings();
}

export async function syncMissionNotifications(missions: Mission[]): Promise<void> {
  if (await getNotificationPermissionState() !== 'enabled') return;

  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Mission reminders',
    description: 'Warm and hot reminders for active Stride missions.',
    importance: AndroidImportance.HIGH,
  });
  await notifee.createChannel({
    id: CRITICAL_CHANNEL_ID,
    name: 'Critical mission alarms',
    description: 'Full-screen alarms for critical Stride missions.',
    importance: AndroidImportance.HIGH,
    vibration: true,
    vibrationPattern: [300, 300, 300, 600],
  });

  const now = Date.now();
  const snoozedMissionIds = new Set<string>();
  for (const mission of missions) {
    const snoozedUntil = await getMissionSnoozedUntil(mission.id);
    if (snoozedUntil && snoozedUntil > now) snoozedMissionIds.add(mission.id);
  }

  const existingIds = (await notifee.getTriggerNotificationIds())
    .filter((id) => id.startsWith(NOTIFICATION_PREFIX))
    .filter((id) => ![...snoozedMissionIds].some((missionId) => id === `${NOTIFICATION_PREFIX}${missionId}:critical`));
  if (existingIds.length) {
    await notifee.cancelTriggerNotifications(existingIds);
  }

  const quietHours: QuietHours = {
    start: parseHourSetting(
      await getSetting('quiet_hours_start'),
      DEFAULT_QUIET_HOURS.start,
    ),
    end: parseHourSetting(
      await getSetting('quiet_hours_end'),
      DEFAULT_QUIET_HOURS.end,
    ),
  };

  for (const item of createNotificationPlan(missions, Date.now(), quietHours)) {
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: item.timestamp,
    };
    await notifee.createTriggerNotification(
      {
        id: item.id,
        title: item.title,
        body: item.body,
        android: {
          channelId: CHANNEL_ID,
          pressAction: { id: 'default' },
        },
        data: { source: 'mission-reminder' },
      },
      trigger,
    );
  }

  if (await getExactAlarmPermissionState() === 'enabled') {
    for (const item of createCriticalAlarmPlan(missions)) {
      if (snoozedMissionIds.has(item.missionId)) continue;
      await createCriticalAlarm(item);
    }
  }
}

async function createCriticalAlarm(item: {
  id: string;
  missionId: string;
  title: string;
  body: string;
  timestamp: number;
}) {
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: item.timestamp,
    alarmManager: { allowWhileIdle: true },
  };
  await notifee.createTriggerNotification(
    {
      id: item.id,
      title: item.title,
      body: item.body,
      data: { source: 'critical-alarm', missionId: item.missionId },
      android: {
        channelId: CRITICAL_CHANNEL_ID,
        category: AndroidCategory.ALARM,
        ongoing: true,
        autoCancel: false,
        pressAction: { id: 'default' },
        fullScreenAction: { id: 'critical-alarm' },
        vibrationPattern: [300, 300, 300, 600],
      },
    },
    trigger,
  );
}

export async function scheduleMissionSnooze(
  mission: Mission,
  minutes = 30,
): Promise<void> {
  await createCriticalAlarm({
    id: `stride:mission:${mission.id}:critical`,
    missionId: mission.id,
    title: mission.title,
    body: `Snoozed ${minutes} minutes. This mission still needs attention.`,
    timestamp: Date.now() + minutes * 60_000,
  });
}

export async function dismissMissionAlarm(missionId: string): Promise<void> {
  await notifee.cancelNotification(`stride:mission:${missionId}:critical`);
}

function missionIdFromNotificationData(data?: Record<string, unknown>): string | undefined {
  return data?.source === 'critical-alarm' && typeof data.missionId === 'string'
    ? data.missionId
    : undefined;
}

export function onCriticalAlarmOpened(listener: (missionId: string) => void): () => void {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) return;
    const missionId = missionIdFromNotificationData(detail.notification?.data);
    if (missionId) listener(missionId);
  });
}

export async function getInitialCriticalAlarmMissionId(): Promise<string | undefined> {
  const initial = await notifee.getInitialNotification();
  return missionIdFromNotificationData(initial?.notification.data);
}

export async function syncMissionNotificationsSafely(missions: Mission[]): Promise<void> {
  try {
    await syncMissionNotifications(missions);
  } catch (error) {
    console.warn('Mission notification sync failed', error);
  }
}
