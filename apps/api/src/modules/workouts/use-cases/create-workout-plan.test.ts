import type { Student } from '@muvit/db/schema';
import { describe, expect, it } from 'vitest';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import type {
  CreateWorkoutPlanData,
  CreateWorkoutPlanRepository,
} from '../repositories/workout-plans-repository.js';
import { CreateWorkoutPlanUseCase } from './create-workout-plan.js';

const student: Student = {
  id: 'student-id',
  trainerId: null,
  isIndependent: true,
  name: 'Aluno',
  email: 'student@example.com',
  authUserId: 'student-auth-id',
  phone: null,
  birthDate: null,
  gender: null,
  goals: null,
  restrictions: null,
  status: 'active',
  avatarUrl: null,
  expoPushToken: null,
  createdAt: new Date(),
};

class FakeWorkoutPlansRepository implements CreateWorkoutPlanRepository {
  createData: CreateWorkoutPlanData | null = null;

  async create(data: CreateWorkoutPlanData) {
    this.createData = data;
    return {
      id: 'plan-id',
      studentId: data.studentId,
      trainerId: data.trainerId,
      name: data.name,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      status: data.status,
      notes: data.notes ?? null,
      createdAt: new Date(),
      days: [],
    };
  }
}

describe('CreateWorkoutPlanUseCase', () => {
  it('sets trainerId to null when an independent student creates a plan', async () => {
    const repository = new FakeWorkoutPlansRepository();
    const ensureStudentAccess = {
      execute: async () => student,
    } satisfies StudentAccessPolicy;
    const useCase = new CreateWorkoutPlanUseCase(repository, ensureStudentAccess);

    await useCase.execute(
      { authUserId: 'student-auth-id', profileId: 'student-id', role: 'student' },
      {
        studentId: 'student-id',
        name: 'Meu Treino',
        status: 'active',
        days: [{ label: 'A', dayOrder: 0, exercises: [] }],
      },
    );

    expect(repository.createData).toMatchObject({ studentId: 'student-id', trainerId: null });
  });
});
