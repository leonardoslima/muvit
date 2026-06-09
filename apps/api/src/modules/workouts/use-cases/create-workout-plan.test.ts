import type { Student } from '@muvit/db/schema';
import { describe, expect, it } from 'vitest';
import type { EnsureStudentAccessUseCase } from '../../students/use-cases/ensure-student-access.js';
import type {
  CreateWorkoutPlanData,
  WorkoutPlansRepository,
} from '../repositories/workout-plans-repository.js';
import { CreateWorkoutPlanUseCase } from './create-workout-plan.js';

const student: Student = {
  id: 'student-id',
  trainerId: null,
  isIndependent: true,
  name: 'Aluno',
  email: 'student@example.com',
  passwordHash: 'hash',
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

class FakeWorkoutPlansRepository implements WorkoutPlansRepository {
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

  async listForStudent() {
    return [];
  }

  async findFullById() {
    return null;
  }

  async findAccessById() {
    return null;
  }

  async update() {
    return null;
  }

  async delete() {
    throw new Error('not implemented');
  }
}

describe('CreateWorkoutPlanUseCase', () => {
  it('sets trainerId to null when an independent student creates a plan', async () => {
    const repository = new FakeWorkoutPlansRepository();
    const ensureStudentAccess = {
      execute: async () => student,
    } as unknown as EnsureStudentAccessUseCase;
    const useCase = new CreateWorkoutPlanUseCase(repository, ensureStudentAccess);

    await useCase.execute(
      { sub: 'student-id', role: 'student' },
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
