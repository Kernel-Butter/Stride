import { describe, expect, it } from 'vitest';
import { Mission } from '../../domain/mission';
import { createCriticalAlarmPlan, createNotificationPlan } from './notificationPlan';

function mission(deadline: number, priority: Mission['priority'] = 'medium'): Mission {
  return {
    id: 'one',
    title: 'Finish the report',
    deadline: new Date(deadline).toISOString(),
    priority,
    status: 'active',
    createdAt: new Date(0).toISOString(),
    objectives: [],
  };
}

describe('createNotificationPlan', () => {
  it('does not schedule cold missions', () => {
    const now = new Date('2026-07-25T12:00:00').getTime();
    expect(createNotificationPlan([mission(now + 7 * 24 * 60 * 60 * 1000, 'low')], now)).toEqual([]);
  });

  it('schedules one reminder for a warm mission', () => {
    const now = new Date('2026-07-25T12:00:00').getTime();
    const plan = createNotificationPlan([mission(now + 48 * 60 * 60 * 1000)], now);
    expect(plan).toHaveLength(1);
    expect(plan[0].id).toContain(':warm');
  });

  it('rotates copy for a hot mission', () => {
    const now = new Date('2026-07-25T12:00:00').getTime();
    const plan = createNotificationPlan([mission(now + 12 * 60 * 60 * 1000)], now);
    expect(plan.length).toBeGreaterThan(1);
    expect(new Set(plan.map((item) => item.body)).size).toBe(plan.length);
  });

  it('does not schedule critical alarms during Phase 1', () => {
    const now = new Date('2026-07-25T12:00:00').getTime();
    expect(createNotificationPlan([mission(now - 1)], now)).toEqual([]);
  });

  it('creates a separate exact plan for critical alarms', () => {
    const now = new Date('2026-07-25T12:00:00').getTime();
    const plan = createCriticalAlarmPlan([mission(now - 1)], now);
    expect(plan).toHaveLength(1);
    expect(plan[0].missionId).toBe('one');
    expect(plan[0].timestamp).toBe(now + 5_000);
  });
});
