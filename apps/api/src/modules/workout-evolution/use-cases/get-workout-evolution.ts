import type { WorkoutEvolution, WorkoutEvolutionQuery } from '@muvit/validators';
import type { WorkoutEvolutionReader } from '../repositories/workout-evolution-repository.js';

export class GetWorkoutEvolutionUseCase {
  constructor(private readonly repository: WorkoutEvolutionReader) {}

  async execute(studentId: string, query: WorkoutEvolutionQuery): Promise<WorkoutEvolution> {
    const summary = await this.repository.getWeeklySummary(studentId, query.date);
    const currentWeek = weekIndex(query.date);
    const weeks = new Map(summary.weeks.map((week) => [weekIndex(week.weekStart), week.completed]));
    const completedThisWeek = weeks.get(currentWeek) ?? 0;
    let week = completedThisWeek > 0 ? currentWeek : currentWeek - 1;
    let streakWeeks = 0;

    while ((weeks.get(week) ?? 0) > 0) {
      streakWeeks += 1;
      week -= 1;
    }

    return { streakWeeks, completedThisWeek, weeklyGoal: summary.weeklyGoal };
  }
}

function weekIndex(date: string): number {
  return Math.floor((Date.parse(date) / 86_400_000 + 3) / 7);
}
