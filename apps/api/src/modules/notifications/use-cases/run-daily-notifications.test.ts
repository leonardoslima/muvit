import type { NotificationPreferences } from '@muvit/validators';
import { describe, expect, it, vi } from 'vitest';
import type {
  ActiveStudentForNotification,
  DailyNotificationsRepository,
} from '../repositories/notifications-repository.js';
import { RunDailyNotificationsUseCase } from './run-daily-notifications.js';

const defaults: NotificationPreferences = {
  inactivity: { enabled: true, afterDays: 7, channel: 'both' },
  workoutPlanExpiring: { enabled: true, daysBefore: 7, channel: 'email' },
  pendingAssessment: { enabled: true, staleAfterDays: 60, channel: 'push' },
  newStudentRegistration: { enabled: true, channel: 'both' },
};

class FakeDailyNotificationsRepository implements DailyNotificationsRepository {
  preferences: NotificationPreferences | null = defaults;
  hasRecentWorkout = false;
  lastAssessmentDate: string | null = '2026-07-01';
  activeWorkoutPlanEndDate: string | null = '2026-08-12';
  inactiveSince: string | undefined;

  constructor(
    private readonly students: ActiveStudentForNotification[] = [
      {
        id: 'student-1',
        name: 'Aluno Um',
        expoPushToken: 'ExponentPushToken[student-1]',
        trainer: { id: 'trainer-1', email: 'trainer@example.com' },
      },
    ],
  ) {}

  async listActiveStudents(): Promise<ActiveStudentForNotification[]> {
    return this.students;
  }

  async findPreferences(): Promise<NotificationPreferences | null> {
    return this.preferences;
  }

  async hasRecentWorkoutLog(_studentId: string, inactiveSince: string): Promise<boolean> {
    this.inactiveSince = inactiveSince;
    return this.hasRecentWorkout;
  }

  async findLastAssessmentDate(): Promise<string | null> {
    return this.lastAssessmentDate;
  }

  async findActiveWorkoutPlanEndDate(): Promise<string | null> {
    return this.activeWorkoutPlanEndDate;
  }
}

function makeSut(repository = new FakeDailyNotificationsRepository()) {
  const services = { sendEmail: vi.fn(), sendPush: vi.fn() };
  return { repository, services, sut: new RunDailyNotificationsUseCase(repository, services) };
}

describe('RunDailyNotificationsUseCase', () => {
  it('não entrega um evento desativado', async () => {
    const repository = new FakeDailyNotificationsRepository();
    repository.preferences = {
      ...defaults,
      inactivity: { ...defaults.inactivity, enabled: false },
      workoutPlanExpiring: { ...defaults.workoutPlanExpiring, enabled: false },
      pendingAssessment: { ...defaults.pendingAssessment, enabled: false },
    };
    const { sut, services } = makeSut(repository);

    await sut.execute(new Date('2026-08-07T12:00:00.000Z'));

    expect(services.sendEmail).not.toHaveBeenCalled();
    expect(services.sendPush).not.toHaveBeenCalled();
  });

  it('usa o prazo configurado e entrega inatividade somente por push', async () => {
    const repository = new FakeDailyNotificationsRepository();
    repository.preferences = {
      ...defaults,
      inactivity: { enabled: true, afterDays: 14, channel: 'push' },
      workoutPlanExpiring: { ...defaults.workoutPlanExpiring, enabled: false },
      pendingAssessment: { ...defaults.pendingAssessment, enabled: false },
    };
    const { sut, services } = makeSut(repository);

    await sut.execute(new Date('2026-08-07T12:00:00.000Z'));

    expect(repository.inactiveSince).toBe('2026-07-24');
    expect(services.sendEmail).not.toHaveBeenCalled();
    expect(services.sendPush).toHaveBeenCalledOnce();
  });

  it('entrega treino vencendo somente por e-mail dentro do prazo configurado', async () => {
    const repository = new FakeDailyNotificationsRepository();
    repository.hasRecentWorkout = true;
    repository.lastAssessmentDate = '2026-08-01';
    const { sut, services } = makeSut(repository);

    await sut.execute(new Date('2026-08-07T12:00:00.000Z'));

    expect(services.sendEmail).toHaveBeenCalledOnce();
    expect(services.sendEmail).toHaveBeenCalledWith({
      to: 'trainer@example.com',
      subject: 'Treino próximo do vencimento',
      html: expect.stringContaining('Aluno Um'),
    });
    expect(services.sendPush).not.toHaveBeenCalled();
  });

  it('entrega avaliação pendente pelos dois canais quando configurado', async () => {
    const repository = new FakeDailyNotificationsRepository();
    repository.hasRecentWorkout = true;
    repository.activeWorkoutPlanEndDate = null;
    repository.preferences = {
      ...defaults,
      pendingAssessment: { enabled: true, staleAfterDays: 30, channel: 'both' },
    };
    const { sut, services } = makeSut(repository);

    await sut.execute(new Date('2026-08-07T12:00:00.000Z'));

    expect(services.sendEmail).toHaveBeenCalledOnce();
    expect(services.sendPush).toHaveBeenCalledOnce();
  });
});
