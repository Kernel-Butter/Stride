import * as SQLite from 'expo-sqlite';
import { Mission, NewMission, Objective, Priority } from '../domain/mission';

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
  `);
}

export async function listMissions(): Promise<Mission[]> {
  const db = await getDatabase();
  const missions = await db.getAllAsync<{
    id: string; title: string; deadline: string; priority: Priority;
    status: 'active' | 'completed'; created_at: string; completed_at: string | null;
  }>('SELECT * FROM missions ORDER BY deadline ASC');
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
