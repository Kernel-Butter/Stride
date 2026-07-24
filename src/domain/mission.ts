export type Priority = 'low' | 'medium' | 'high';
export type Heat = 'cold' | 'warm' | 'hot' | 'critical';

export interface Objective {
  id: string;
  missionId: string;
  title: string;
  rewardText?: string;
  done: boolean;
  doneAt?: string;
}

export interface Mission {
  id: string;
  title: string;
  deadline: string;
  priority: Priority;
  status: 'active' | 'completed';
  createdAt: string;
  completedAt?: string;
  objectives: Objective[];
}

export interface NewMission {
  title: string;
  deadline: string;
  priority: Priority;
  objectives: Array<{ title: string; rewardText?: string }>;
}
