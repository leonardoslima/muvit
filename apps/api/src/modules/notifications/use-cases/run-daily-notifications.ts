import { assessmentReminderTemplate } from '../../../lib/mailer.js';
import type { EmailMessage, PushMessage } from '../../../lib/notification-types.js';
import type { NotificationsRepository } from '../repositories/notifications-repository.js';

const INACTIVE_DAYS = 7;
const ASSESSMENT_STALE_DAYS = 60;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type DailyNotificationsServices = {
  sendPush: (message: PushMessage) => Promise<void> | void;
  sendEmail: (message: EmailMessage) => Promise<void> | void;
};

export class RunDailyNotificationsUseCase {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly services: DailyNotificationsServices,
  ) {}

  async execute(now = new Date()): Promise<void> {
    const inactiveSince = new Date(now.getTime() - INACTIVE_DAYS * ONE_DAY_MS)
      .toISOString()
      .slice(0, 10);
    const staleAssessmentBefore = new Date(now.getTime() - ASSESSMENT_STALE_DAYS * ONE_DAY_MS)
      .toISOString()
      .slice(0, 10);

    const students = await this.notificationsRepository.listActiveStudents();

    for (const student of students) {
      const hasRecentLog = await this.notificationsRepository.hasRecentWorkoutLog(
        student.id,
        inactiveSince,
      );

      if (!hasRecentLog && student.expoPushToken) {
        await this.services.sendPush({
          token: student.expoPushToken,
          title: 'Hora de voltar ao treino',
          body: 'Voce esta ha 7 dias sem registrar treino.',
        });
      }

      if (!student.trainer?.email) continue;

      const lastAssessmentDate = await this.notificationsRepository.findLastAssessmentDate(
        student.id,
      );
      if (!lastAssessmentDate || lastAssessmentDate < staleAssessmentBefore) {
        await this.services.sendEmail({
          to: student.trainer.email,
          subject: 'Aluno com avaliacao vencida',
          html: assessmentReminderTemplate(student.name),
        });
      }
    }
  }
}
