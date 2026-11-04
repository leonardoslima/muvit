export type TrainerSummary = {
  students: {
    total: number;
    active: number;
    paused: number;
    inactive: number;
    newThisWeek: number;
    inactive7d: number;
  };
  workouts: {
    activePlans: number;
    expiringThisWeek: number;
  };
  assessments: {
    last30d: number;
    pending: number;
  };
};

export interface TrainerSummaryRepository {
  getSummary(trainerId: string, now: Date): Promise<TrainerSummary>;
}
