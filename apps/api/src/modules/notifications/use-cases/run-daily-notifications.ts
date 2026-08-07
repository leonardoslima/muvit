import type { NotificationPreferences } from '@muvit/validators';
import { assessmentReminderTemplate } from '../../../lib/mailer.js';
import type { EmailMessage, PushMessage } from '../../../lib/notification-types.js';
import type {
  ActiveStudentForNotification,
  DailyNotificationsRepository,
} from '../repositories/notifications-repository.js';
import { findEffectiveNotificationPreferences } from './get-notification-preferences.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type DailyNotificationsServices = {
  sendPush: (message: PushMessage) => Promise<void> | void;
  sendEmail: (message: EmailMessage) => Promise<void> | void;
};

type Delivery = {
  email: EmailMessage;
  push: PushMessage;
};

type NotificationChannel = NotificationPreferences['inactivity']['channel'];

function dateDaysFrom(date: Date, days: number): string {
  return new Date(date.getTime() + days * ONE_DAY_MS).toISOString().slice(0, 10);
}

export class RunDailyNotificationsUseCase {
  constructor(
    private readonly notificationsRepository: DailyNotificationsRepository,
    private readonly services: DailyNotificationsServices,
  ) {}

  private async deliver(
    channel: NotificationChannel,
    student: ActiveStudentForNotification,
    delivery: Delivery,
  ): Promise<void> {
    if ((channel === 'email' || channel === 'both') && student.trainer?.email) {
      await this.services.sendEmail(delivery.email);
    }
    if ((channel === 'push' || channel === 'both') && student.expoPushToken) {
      await this.services.sendPush(delivery.push);
    }
  }

  private async processStudent(
    student: ActiveStudentForNotification,
    preferences: NotificationPreferences,
    now: Date,
  ): Promise<void> {
    const trainerEmail = student.trainer?.email ?? '';
    const pushToken = student.expoPushToken ?? '';

    if (preferences.inactivity.enabled) {
      const inactiveSince = dateDaysFrom(now, -preferences.inactivity.afterDays);
      const hasRecentLog = await this.notificationsRepository.hasRecentWorkoutLog(
        student.id,
        inactiveSince,
      );
      if (!hasRecentLog) {
        await this.deliver(preferences.inactivity.channel, student, {
          email: {
            to: trainerEmail,
            subject: 'Aluno inativo',
            html: `<p>O aluno ${student.name} está há ${preferences.inactivity.afterDays} dias sem registrar treino.</p>`,
          },
          push: {
            token: pushToken,
            title: 'Hora de voltar ao treino',
            body: `Voce esta ha ${preferences.inactivity.afterDays} dias sem registrar treino.`,
          },
        });
      }
    }

    if (preferences.workoutPlanExpiring.enabled) {
      const workoutPlanEndDate = await this.notificationsRepository.findActiveWorkoutPlanEndDate(
        student.id,
      );
      const today = dateDaysFrom(now, 0);
      const warningDate = dateDaysFrom(now, preferences.workoutPlanExpiring.daysBefore);
      if (workoutPlanEndDate && workoutPlanEndDate >= today && workoutPlanEndDate <= warningDate) {
        await this.deliver(preferences.workoutPlanExpiring.channel, student, {
          email: {
            to: trainerEmail,
            subject: 'Treino próximo do vencimento',
            html: `<p>O treino do aluno ${student.name} vence em breve.</p>`,
          },
          push: {
            token: pushToken,
            title: 'Seu treino vence em breve',
            body: 'Converse com seu treinador para atualizar o planejamento.',
          },
        });
      }
    }

    if (preferences.pendingAssessment.enabled) {
      const lastAssessmentDate = await this.notificationsRepository.findLastAssessmentDate(
        student.id,
      );
      const staleAssessmentBefore = dateDaysFrom(
        now,
        -preferences.pendingAssessment.staleAfterDays,
      );
      if (!lastAssessmentDate || lastAssessmentDate < staleAssessmentBefore) {
        await this.deliver(preferences.pendingAssessment.channel, student, {
          email: {
            to: trainerEmail,
            subject: 'Aluno com avaliacao vencida',
            html: assessmentReminderTemplate(student.name),
          },
          push: {
            token: pushToken,
            title: 'Avaliação física pendente',
            body: 'Converse com seu treinador para atualizar sua avaliação.',
          },
        });
      }
    }
  }

  async execute(now = new Date()): Promise<void> {
    const students = await this.notificationsRepository.listActiveStudents();
    const preferencesByTrainer = new Map<string, NotificationPreferences>();

    for (const student of students) {
      if (student.trainer === null) continue;
      let preferences = preferencesByTrainer.get(student.trainer.id);
      if (preferences === undefined) {
        preferences = await findEffectiveNotificationPreferences(
          this.notificationsRepository,
          student.trainer.id,
        );
        preferencesByTrainer.set(student.trainer.id, preferences);
      }
      await this.processStudent(student, preferences, now);
    }
  }
}
