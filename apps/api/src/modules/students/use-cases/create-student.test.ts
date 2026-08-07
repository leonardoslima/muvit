import type { Student } from '@muvit/db/schema';
import { describe, expect, it, vi } from 'vitest';
import type {
  CreateStudentInput,
  CreateStudentRepository,
} from '../repositories/students-repository.js';
import type { StudentPlanLimitPolicy } from './assert-student-plan-limit.js';
import { CreateStudentUseCase, type NewStudentNotifier } from './create-student.js';

class FakeCreateStudentRepository implements CreateStudentRepository {
  persisted = false;

  async createForTrainer(trainerId: string, input: CreateStudentInput): Promise<Student> {
    this.persisted = true;
    return {
      id: 'student-1',
      authUserId: null,
      trainerId,
      isIndependent: false,
      name: input.name,
      email: input.email ?? null,
      phone: null,
      birthDate: null,
      gender: null,
      goals: null,
      trainingDays: input.trainingDays ?? null,
      restrictions: null,
      internalNotes: input.internalNotes ?? null,
      status: input.status ?? 'active',
      avatarUrl: null,
      expoPushToken: null,
      createdAt: new Date('2026-08-07T12:00:00.000Z'),
    };
  }
}

describe('CreateStudentUseCase', () => {
  it('notifica o novo aluno somente depois da persistência', async () => {
    const repository = new FakeCreateStudentRepository();
    const notifications: string[] = [];
    const notifier: NewStudentNotifier = {
      execute: async (_trainerId, student) => {
        expect(repository.persisted).toBe(true);
        notifications.push(student.id);
      },
    };
    const planLimit: StudentPlanLimitPolicy = { assertCanActivate: async () => undefined };
    const lock = {
      withTrainerPlanMutationLock: async <Result>(
        _trainerId: string,
        operation: () => Promise<Result>,
      ): Promise<Result> => operation(),
    };
    const sut = new CreateStudentUseCase(repository, planLimit, lock, notifier, {
      warn: vi.fn(),
    });

    const student = await sut.execute('trainer-1', { name: 'Aluno Um' });

    expect(student.id).toBe('student-1');
    expect(notifications).toEqual(['student-1']);
  });

  it('retorna o aluno persistido e registra somente categoria e IDs quando o notifier rejeita', async () => {
    const repository = new FakeCreateStudentRepository();
    const warn = vi.fn();
    const notifier: NewStudentNotifier = {
      execute: async () => {
        throw new Error('Aluno Um trainer@example.com conteúdo sensível');
      },
    };
    const planLimit: StudentPlanLimitPolicy = { assertCanActivate: async () => undefined };
    const lock = {
      withTrainerPlanMutationLock: async <Result>(
        _trainerId: string,
        operation: () => Promise<Result>,
      ): Promise<Result> => operation(),
    };
    const sut = new CreateStudentUseCase(repository, planLimit, lock, notifier, { warn });

    await expect(sut.execute('trainer-1', { name: 'Aluno Um' })).resolves.toMatchObject({
      id: 'student-1',
    });
    expect(warn).toHaveBeenCalledWith({
      category: 'new_student_notification_failed',
      trainerId: 'trainer-1',
      studentId: 'student-1',
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('Aluno Um');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('trainer@example.com');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('conteúdo sensível');
  });
});
