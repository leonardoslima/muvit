import { describe, expect, it } from 'vitest';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { EnsureStudentAccessUseCase } from '../../students/use-cases/ensure-student-access.js';
import type { WorkoutLogsRepository } from '../repositories/workout-logs-repository.js';
import { FinishWorkoutLogUseCase } from './finish-workout-log.js';

class FakeWorkoutLogsRepository implements WorkoutLogsRepository {
  async findById() {
    return { id: 'log-id', studentId: 'student-id' };
  }

  async finish() {
    return null;
  }

  async findWorkoutDayAccess() {
    return null;
  }

  async start() {
    return {
      id: 'log-id',
      studentId: 'student-id',
      workoutDayId: 'day-id',
      date: '2026-01-01',
      durationMin: null,
      rpe: null,
      completed: false,
      createdAt: new Date(),
    };
  }

  async findFullById() {
    return null;
  }

  async listForStudent() {
    return [];
  }
}

describe('FinishWorkoutLogUseCase', () => {
  it('returns conflict when the log was already completed', async () => {
    const ensureStudentAccess = {
      execute: async () => ({ id: 'student-id' }),
    } as unknown as EnsureStudentAccessUseCase;
    const useCase = new FinishWorkoutLogUseCase(
      new FakeWorkoutLogsRepository(),
      ensureStudentAccess,
    );

    await expect(
      useCase.execute({ sub: 'student-id', role: 'student' }, 'log-id', {
        durationMin: 45,
        completed: true,
        sets: [
          {
            workoutExerciseId: 'workout-exercise-id',
            setNumber: 1,
            completed: true,
          },
        ],
      }),
    ).rejects.toMatchObject(new UseCaseError('conflict', 'log already completed'));
  });
});
