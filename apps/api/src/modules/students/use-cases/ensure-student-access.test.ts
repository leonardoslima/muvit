import type { Student } from '@muvit/db/schema';
import { describe, expect, it } from 'vitest';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { FindStudentByIdRepository } from '../repositories/students-repository.js';
import { EnsureStudentAccessUseCase } from './ensure-student-access.js';

const baseStudent: Student = {
  id: 'student-id',
  trainerId: 'trainer-id',
  isIndependent: false,
  name: 'Aluno',
  email: null,
  authUserId: null,
  phone: null,
  birthDate: null,
  gender: null,
  goals: null,
  trainingDays: null,
  restrictions: null,
  internalNotes: null,
  status: 'active',
  avatarUrl: null,
  expoPushToken: null,
  createdAt: new Date(),
};

class FakeStudentsRepository implements FindStudentByIdRepository {
  constructor(private readonly student: Student | null) {}

  async findById() {
    return this.student;
  }
}

describe('EnsureStudentAccessUseCase', () => {
  it('returns not_found for cross-tenant trainer access', async () => {
    const useCase = new EnsureStudentAccessUseCase(new FakeStudentsRepository(baseStudent));

    await expect(
      useCase.execute(
        { authUserId: 'trainer-auth-id', profileId: 'other-trainer-id', role: 'trainer' },
        'student-id',
      ),
    ).rejects.toMatchObject(new UseCaseError('not_found', 'not found'));
  });

  it('returns forbidden when a student accesses another student', async () => {
    const useCase = new EnsureStudentAccessUseCase(new FakeStudentsRepository(baseStudent));

    await expect(
      useCase.execute(
        { authUserId: 'student-auth-id', profileId: 'other-student-id', role: 'student' },
        'student-id',
      ),
    ).rejects.toMatchObject(new UseCaseError('forbidden', 'forbidden'));
  });

  it('returns not_found for student mismatch when requested by callers that hide resources', async () => {
    const useCase = new EnsureStudentAccessUseCase(new FakeStudentsRepository(baseStudent));

    await expect(
      useCase.execute(
        { authUserId: 'student-auth-id', profileId: 'other-student-id', role: 'student' },
        'student-id',
        {
          studentMismatchError: 'not_found',
        },
      ),
    ).rejects.toMatchObject(new UseCaseError('not_found', 'not found'));
  });
});
