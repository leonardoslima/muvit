import type { NotificationPreferences } from '@muvit/validators';
import { assessmentReminderTemplate } from '../../../lib/mailer.js';
import type { EmailMessage, PushMessage } from '../../../lib/notification-types.js';
import type {
  ActiveStudentForNotification,
  DailyNotificationsRepository,
} from '../repositories/notifications-repository.js';
import { findEffectiveNotificationPreferences } from './get-notification-preferences.js';
import type { NotificationLogger } from './notify-new-student.js';

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
type DailyNotificationEvent = 'inactivity' | 'workout_plan_expiring' | 'pending_assessment';

function dateDaysFrom(date: Date, days: number): string {
  return new Date(date.getTime() + days * ONE_DAY_MS).toISOString().slice(0, 10);
}

export class RunDailyNotificationsUseCase {
  constructor(
    private readonly notificationsRepository: DailyNotificationsRepository,
    private readonly services: DailyNotificationsServices,
    private readonly logger: NotificationLogger,
  ) {}

  private async deliverChannel(
    event: DailyNotificationEvent,
    channel: 'email' | 'push',
    student: ActiveStudentForNotification,
    operation: () => Promise<void> | void,
  ): Promise<void> {
    const trainerId = student.trainer?.id;
    if (trainerId === undefined) return;
    try {
      await operation();
    } catch {
      this.logger.warn({
        category: 'notification_delivery_failed',
        event,
        channel,
        trainerId,
        studentId: student.id,
      });
    }
  }

  private async deliver(
    event: DailyNotificationEvent,
    channel: NotificationChannel,
    student: ActiveStudentForNotification,
    delivery: Delivery,
  ): Promise<void> {
    const deliveries: Promise<void>[] = [];
    if ((channel === 'email' || channel === 'both') && student.trainer?.email) {
      deliveries.push(
        this.deliverChannel(event, 'email', student, () => this.services.sendEmail(delivery.email)),
      );
    }
    if ((channel === 'push' || channel === 'both') && student.expoPushToken) {
      deliveries.push(
        this.deliverChannel(event, 'push', student, () => this.services.sendPush(delivery.push)),
      );
    }
    await Promise.all(deliveries);
  }

  private async prepareEvent(
    event: DailyNotificationEvent,
    student: ActiveStudentForNotification,
    operation: () => Promise<void>,
  ): Promise<void> {
    try {
      await operation();
    } catch {
      this.logger.warn({
        category: 'notification_preparation_failed',
        event,
        trainerId: student.trainer?.id,
        studentId: student.id,
      });
    }
  }

  private async processStudent(
    student: ActiveStudentForNotification,
    preferences: NotificationPreferences,
    now: Date,
  ): Promise<void> {
    const trainerEmail = student.trainer?.email ?? '';
    const pushToken = student.expoPushToken ?? '';

    await this.prepareEvent('inactivity', student, async () => {
      if (!preferences.inactivity.enabled) return;
      const inactiveSince = dateDaysFrom(now, -preferences.inactivity.afterDays);
      const studentCreatedOn = student.createdAt.toISOString().slice(0, 10);
      if (studentCreatedOn > inactiveSince) return;
      const hasRecentLog = await this.notificationsRepository.hasRecentWorkoutLog(
        student.id,
        inactiveSince,
      );
      if (!hasRecentLog) {
        await this.deliver('inactivity', preferences.inactivity.channel, student, {
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
    });

    await this.prepareEvent('workout_plan_expiring', student, async () => {
      if (!preferences.workoutPlanExpiring.enabled) return;
      const today = dateDaysFrom(now, 0);
      const warningDate = dateDaysFrom(now, preferences.workoutPlanExpiring.daysBefore);
      const workoutPlanEndDate = await this.notificationsRepository.findActiveWorkoutPlanEndDate(
        student.id,
        today,
        warningDate,
      );
      if (workoutPlanEndDate) {
        await this.deliver(
          'workout_plan_expiring',
          preferences.workoutPlanExpiring.channel,
          student,
          {
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
          },
        );
      }
    });

    await this.prepareEvent('pending_assessment', student, async () => {
      if (!preferences.pendingAssessment.enabled) return;
      const lastAssessmentDate = await this.notificationsRepository.findLastAssessmentDate(
        student.id,
      );
      const staleAssessmentBefore = dateDaysFrom(
        now,
        -preferences.pendingAssessment.staleAfterDays,
      );
      if (!lastAssessmentDate || lastAssessmentDate < staleAssessmentBefore) {
        await this.deliver('pending_assessment', preferences.pendingAssessment.channel, student, {
          email: {
            to: trainerEmail,
            subject: 'Aluno com avaliacao vencida',
            html: assessmentReminderTemplate(
              student.name,
              preferences.pendingAssessment.staleAfterDays,
            ),
          },
          push: {
            token: pushToken,
            title: 'Avaliação física pendente',
            body: 'Converse com seu treinador para atualizar sua avaliação.',
          },
        });
      }
    });
  }

  async execute(now = new Date()): Promise<void> {
    let students: ActiveStudentForNotification[];
    try {
      students = await this.notificationsRepository.listActiveStudents();
    } catch {
      this.logger.warn({
        category: 'notification_preparation_failed',
        event: 'daily_notifications',
      });
      return;
    }
    const preferencesByTrainer = new Map<string, NotificationPreferences>();

    for (const student of students) {
      if (student.trainer === null) continue;
      let preferences = preferencesByTrainer.get(student.trainer.id);
      if (preferences === undefined) {
        try {
          preferences = await findEffectiveNotificationPreferences(
            this.notificationsRepository,
            student.trainer.id,
          );
        } catch {
          this.logger.warn({
            category: 'notification_preparation_failed',
            event: 'preferences',
            trainerId: student.trainer.id,
            studentId: student.id,
          });
          continue;
        }
        preferencesByTrainer.set(student.trainer.id, preferences);
      }
      await this.processStudent(student, preferences, now);
    }
  }
}
