import * as SQLite from 'expo-sqlite';
import { Mission, NewMission, Objective, Priority, UpdateMission } from '../domain/mission';

let database: Promise<SQLite.SQLiteDatabase> | undefined;

async function getDatabase() {
  database ??= SQLite.openDatabaseAsync('stride.db');
  return database;
}

export async function migrateDatabase() {
  const db = await getDatabase();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      deadline TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS objectives (
      id TEXT PRIMARY KEY NOT NULL,
      mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      reward_text TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      done_at TEXT
    );
    CREATE TABLE IF NOT EXISTS alarm_snoozes (
      mission_id TEXT NOT NULL,
      day TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      snoozed_until TEXT,
      PRIMARY KEY (mission_id, day)
    );
    CREATE TABLE IF NOT EXISTS postpones (
      id TEXT PRIMARY KEY NOT NULL,
      mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      old_deadline TEXT NOT NULL,
      new_deadline TEXT NOT NULL,
      at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
      target_minutes INTEGER NOT NULL,
      actual_seconds INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  try {
    await db.execAsync('ALTER TABLE alarm_snoozes ADD COLUMN snoozed_until TEXT');
  } catch {
    // column already exists
  }
}

export async function getSetting(key: string): Promise<string | undefined> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

export interface PostponeRecord {
  id: string;
  missionId: string;
  reason: string;
  oldDeadline: string;
  newDeadline: string;
  at: string;
}

export async function listMissionPostpones(missionId: string): Promise<PostponeRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    mission_id: string;
    reason: string;
    old_deadline: string;
    new_deadline: string;
    at: string;
  }>(
    'SELECT * FROM postpones WHERE mission_id = ? ORDER BY at DESC',
    missionId,
  );
  return rows.map((row) => ({
    id: row.id,
    missionId: row.mission_id,
    reason: row.reason,
    oldDeadline: row.old_deadline,
    newDeadline: row.new_deadline,
    at: row.at,
  }));
}

export async function postponeMission(
  missionId: string,
  reason: string,
  newDeadline: string,
): Promise<void> {
  const db = await getDatabase();
  const mission = await db.getFirstAsync<{ deadline: string }>(
    'SELECT deadline FROM missions WHERE id = ?',
    missionId,
  );
  if (!mission) throw new Error('Mission not found.');

  const at = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO postpones (id, mission_id, reason, old_deadline, new_deadline, at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      `postpone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      missionId,
      reason.trim(),
      mission.deadline,
      newDeadline,
      at,
    );
    await db.runAsync(
      'UPDATE missions SET deadline = ? WHERE id = ?',
      newDeadline,
      missionId,
    );
  });
}

function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function getMissionSnoozeCount(missionId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT count FROM alarm_snoozes WHERE mission_id = ? AND day = ?',
    missionId,
    localDay(),
  );
  return row?.count ?? 0;
}

export async function incrementMissionSnoozeCount(
  missionId: string,
  snoozedUntil: string,
): Promise<number> {
  const db = await getDatabase();
  const day = localDay();
  await db.runAsync(
    `INSERT INTO alarm_snoozes (mission_id, day, count, snoozed_until) VALUES (?, ?, 1, ?)
     ON CONFLICT(mission_id, day) DO UPDATE SET count = count + 1, snoozed_until = excluded.snoozed_until`,
    missionId,
    day,
    snoozedUntil,
  );
  return getMissionSnoozeCount(missionId);
}

export async function getMissionSnoozedUntil(missionId: string): Promise<number | undefined> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ snoozed_until: string | null }>(
    'SELECT snoozed_until FROM alarm_snoozes WHERE mission_id = ? AND day = ?',
    missionId,
    localDay(),
  );
  return row?.snoozed_until ? new Date(row.snoozed_until).getTime() : undefined;
}

export async function listMissions(): Promise<Mission[]> {
  const db = await getDatabase();
  const missions = await db.getAllAsync<{
    id: string; title: string; deadline: string; priority: Priority;
    status: 'active' | 'completed'; created_at: string; completed_at: string | null;
  }>("SELECT * FROM missions WHERE status = 'active' ORDER BY deadline ASC");
  const objectives = await db.getAllAsync<{
    id: string; mission_id: string; title: string; reward_text: string | null;
    done: number; done_at: string | null;
  }>('SELECT * FROM objectives ORDER BY rowid ASC');

  return missions.map((mission) => ({
    id: mission.id,
    title: mission.title,
    deadline: mission.deadline,
    priority: mission.priority,
    status: mission.status,
    createdAt: mission.created_at,
    completedAt: mission.completed_at ?? undefined,
    objectives: objectives
      .filter((objective) => objective.mission_id === mission.id)
      .map((objective) => ({
        id: objective.id,
        missionId: objective.mission_id,
        title: objective.title,
        rewardText: objective.reward_text ?? undefined,
        done: objective.done === 1,
        doneAt: objective.done_at ?? undefined,
      })),
  }));
}

export async function insertMission(input: NewMission): Promise<void> {
  const db = await getDatabase();
  const id = `mission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO missions (id, title, deadline, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      id, input.title, input.deadline, input.priority, 'active', now,
    );
    for (const [index, objective] of input.objectives.entries()) {
      await db.runAsync(
        'INSERT INTO objectives (id, mission_id, title, reward_text, done) VALUES (?, ?, ?, ?, 0)',
        `${id}-objective-${index}`, id, objective.title, objective.rewardText ?? null,
      );
    }
  });
}

export async function updateMission(input: UpdateMission): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE missions SET title = ?, deadline = ?, priority = ? WHERE id = ?',
      input.title, input.deadline, input.priority, input.id,
    );
    await db.runAsync('DELETE FROM objectives WHERE mission_id = ?', input.id);
    for (const [index, objective] of input.objectives.entries()) {
      await db.runAsync(
        'INSERT INTO objectives (id, mission_id, title, reward_text, done, done_at) VALUES (?, ?, ?, ?, ?, ?)',
        `${input.id}-objective-${Date.now()}-${index}`,
        input.id,
        objective.title,
        objective.rewardText ?? null,
        objective.done ? 1 : 0,
        objective.done ? objective.doneAt ?? new Date().toISOString() : null,
      );
    }
  });
}

export async function deleteMission(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM missions WHERE id = ?', id);
}

export async function completeMission(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE missions SET status = 'completed', completed_at = ? WHERE id = ?",
    new Date().toISOString(),
    id,
  );
}

export async function insertFocusSession(input: {
  missionId: string;
  targetMinutes: number;
  actualSeconds: number;
  completed: boolean;
  startedAt: string;
  endedAt: string;
}): Promise<void> {
  const db = await getDatabase();
  const id = `focus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.runAsync(
    `INSERT INTO focus_sessions
     (id, mission_id, target_minutes, actual_seconds, completed, started_at, ended_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.missionId,
    input.targetMinutes,
    input.actualSeconds,
    input.completed ? 1 : 0,
    input.startedAt,
    input.endedAt,
  );
}

export async function setObjectiveDone(objective: Objective, done: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE objectives SET done = ?, done_at = ? WHERE id = ?',
    done ? 1 : 0, done ? new Date().toISOString() : null, objective.id,
  );
}

export async function seedDatabaseIfEmpty() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM missions');
  if ((row?.count ?? 0) > 0) return;
  await insertMission({
    title: 'Ship Stride Phase 1',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    objectives: [
      { title: 'Build the local data foundation' },
      { title: 'Use the Today screen on a real device' },
      { title: 'Create one real mission', rewardText: 'A task system you can trust daily' },
    ],
  });
}
