import { create } from 'zustand';
import { Mission, NewMission } from '../domain/mission';
import {
  insertMission,
  listMissions,
  migrateDatabase,
  seedDatabaseIfEmpty,
  setObjectiveDone,
} from '../db/database';

interface MissionState {
  missions: Mission[];
  loading: boolean;
  error?: string;
  initialize: () => Promise<void>;
  createMission: (input: NewMission) => Promise<void>;
  toggleObjective: (missionId: string, objectiveId: string) => Promise<void>;
}

export const useMissionStore = create<MissionState>((set, get) => ({
  missions: [],
  loading: true,
  initialize: async () => {
    try {
      await migrateDatabase();
      await seedDatabaseIfEmpty();
      set({ missions: await listMissions(), loading: false, error: undefined });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Database failed to open.' });
    }
  },
  createMission: async (input) => {
    await insertMission(input);
    set({ missions: await listMissions() });
  },
  toggleObjective: async (missionId, objectiveId) => {
    const mission = get().missions.find((item) => item.id === missionId);
    const objective = mission?.objectives.find((item) => item.id === objectiveId);
    if (!objective) return;
    await setObjectiveDone(objective, !objective.done);
    set({ missions: await listMissions() });
  },
}));
