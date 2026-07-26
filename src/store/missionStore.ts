import { create } from 'zustand';
import { Mission, NewMission, UpdateMission } from '../domain/mission';
import {
  completeMission,
  deleteMission,
  insertMission,
  listMissions,
  migrateDatabase,
  postponeMission,
  seedDatabaseIfEmpty,
  setObjectiveDone,
  updateMission,
} from '../db/database';
import { syncMissionNotificationsSafely } from '../features/pressure/notifications';

async function refreshMissions(set: (state: Partial<MissionState>) => void) {
  const missions = await listMissions();
  set({ missions });
  await syncMissionNotificationsSafely(missions);
}

interface MissionState {
  missions: Mission[];
  loading: boolean;
  error?: string;
  initialize: () => Promise<void>;
  createMission: (input: NewMission) => Promise<void>;
  updateMission: (input: UpdateMission) => Promise<void>;
  deleteMission: (id: string) => Promise<void>;
  completeMission: (id: string) => Promise<void>;
  postponeMission: (id: string, reason: string, newDeadline: string) => Promise<void>;
  toggleObjective: (missionId: string, objectiveId: string) => Promise<void>;
}

export const useMissionStore = create<MissionState>((set, get) => ({
  missions: [],
  loading: true,
  initialize: async () => {
    try {
      await migrateDatabase();
      await seedDatabaseIfEmpty();
      const missions = await listMissions();
      set({ missions, loading: false, error: undefined });
      await syncMissionNotificationsSafely(missions);
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Database failed to open.' });
    }
  },
  createMission: async (input) => {
    await insertMission(input);
    await refreshMissions(set);
  },
  updateMission: async (input) => {
    await updateMission(input);
    await refreshMissions(set);
  },
  deleteMission: async (id) => {
    await deleteMission(id);
    await refreshMissions(set);
  },
  completeMission: async (id) => {
    await completeMission(id);
    await refreshMissions(set);
  },
  postponeMission: async (id, reason, newDeadline) => {
    await postponeMission(id, reason, newDeadline);
    await refreshMissions(set);
  },
  toggleObjective: async (missionId, objectiveId) => {
    const mission = get().missions.find((item) => item.id === missionId);
    const objective = mission?.objectives.find((item) => item.id === objectiveId);
    if (!objective) return;
    await setObjectiveDone(objective, !objective.done);
    await refreshMissions(set);
  },
}));
