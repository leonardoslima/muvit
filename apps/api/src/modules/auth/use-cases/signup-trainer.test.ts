import type { Student, Trainer } from '@muvit/db/schema';
import { describe, expect, it } from 'vitest';
import { UseCaseError } from '../../../shared/use-case-error.js';
import type { AuthRepository } from '../repositories/auth-repository.js';
import { SignupTrainerUseCase } from './signup-trainer.js';

const trainer: Trainer = {
  id: 'trainer-id',
  email: 'trainer@example.com',
  name: 'Trainer',
  passwordHash: 'hash',
  avatarUrl: null,
  plan: 'free',
  onboardedAt: null,
  createdAt: new Date(),
};

const student: Student = {
  id: 'student-id',
  trainerId: null,
  isIndependent: true,
  name: 'Student',
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

class FakeAuthRepository implements AuthRepository {
  async findTrainerByEmail() {
    return trainer;
  }

  async createTrainer() {
    return trainer;
  }

  async findStudentByEmail() {
    return null;
  }

  async createIndependentStudent() {
    return student;
  }

  async findTrainerById() {
    return trainer;
  }

  async findStudentById() {
    return student;
  }

  async completeTrainerOnboarding() {
    return new Date();
  }
}

describe('SignupTrainerUseCase', () => {
  it('rejects duplicate trainer email', async () => {
    const useCase = new SignupTrainerUseCase(new FakeAuthRepository(), {
      hashPassword: async () => 'hash',
      signAccessToken: async () => 'access',
      signRefreshToken: async () => 'refresh',
    });

    await expect(
      useCase.execute({ name: 'Trainer', email: 'trainer@example.com', password: '12345678' }),
    ).rejects.toMatchObject(new UseCaseError('duplicate_email', 'email already registered'));
  });
});
