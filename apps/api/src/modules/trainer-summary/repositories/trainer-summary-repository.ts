export type TrainerSummary = {
  students: {
    total: number;
    active: number;
    paused: number;
    inactive: number;
    newThisWeek: number;
  };
  workouts: {
    activePlans: number;
  };
  assessments: {
    last30d: number;
  };
};

export interface TrainerSummaryRepository {
  getSummary(trainerId: string, now: Date): Promise<TrainerSummary>;
}
