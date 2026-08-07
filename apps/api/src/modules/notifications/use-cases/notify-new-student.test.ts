import type { NotificationPreferences } from '@muvit/validators';
import { describe, expect, it, vi } from 'vitest';
import type { NewStudentNotificationRepository } from '../repositories/notifications-repository.js';
import { NotifyNewStudentUseCase } from './notify-new-student.js';

const preferences: NotificationPreferences = {
  inactivity: { enabled: true, afterDays: 7, channel: 'both' },
  workoutPlanExpiring: { enabled: true, daysBefore: 7, channel: 'email' },
  pendingAssessment: { enabled: true, staleAfterDays: 60, channel: 'push' },
  newStudentRegistration: { enabled: true, channel: 'both' },
};

class FakeNewStudentNotificationRepository implements NewStudentNotificationRepository {
  async findPreferences(): Promise<NotificationPreferences | null> {
    return preferences;
  }

  async findTrainerEmail(): Promise<string | null> {
    return 'trainer@example.com';
  }
}

describe('NotifyNewStudentUseCase', () => {
  it('não bloqueia o cadastro e registra somente categoria, canal e IDs quando a entrega falha', async () => {
    const sendEmail = vi.fn().mockRejectedValue(new Error('conteúdo sensível'));
    const warn = vi.fn();
    const sut = new NotifyNewStudentUseCase(
      new FakeNewStudentNotificationRepository(),
      { sendEmail, sendPush: vi.fn() },
      { warn },
    );

    await expect(
      sut.execute('trainer-1', {
        id: 'student-1',
        name: 'Aluno Um',
        expoPushToken: null,
      }),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith({
      category: 'notification_delivery_failed',
      event: 'new_student_registration',
      channel: 'email',
      trainerId: 'trainer-1',
      studentId: 'student-1',
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('conteúdo sensível');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('trainer@example.com');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('Aluno Um');
  });

  it('contém falha de preparação e registra somente categoria e IDs', async () => {
    const repository = new FakeNewStudentNotificationRepository();
    repository.findPreferences = async () => {
      throw new Error('trainer@example.com Aluno Um conteúdo sensível');
    };
    const warn = vi.fn();
    const sut = new NotifyNewStudentUseCase(
      repository,
      { sendEmail: vi.fn(), sendPush: vi.fn() },
      { warn },
    );

    await expect(
      sut.execute('trainer-1', {
        id: 'student-1',
        name: 'Aluno Um',
        expoPushToken: null,
      }),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith({
      category: 'notification_preparation_failed',
      event: 'new_student_registration',
      trainerId: 'trainer-1',
      studentId: 'student-1',
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('trainer@example.com');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('Aluno Um');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('conteúdo sensível');
  });
});
