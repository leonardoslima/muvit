import type { Student } from '@muvit/db/schema';
import type { NotificationPreferences } from '@muvit/validators';
import type { EmailMessage, PushMessage } from '../../../lib/notification-types.js';
import type { NewStudentNotificationRepository } from '../repositories/notifications-repository.js';
import { findEffectiveNotificationPreferences } from './get-notification-preferences.js';

type NewStudent = Pick<Student, 'id' | 'name' | 'expoPushToken'>;
type NotificationChannel = NotificationPreferences['inactivity']['channel'];

type NotificationServices = {
  sendEmail: (message: EmailMessage) => Promise<void> | void;
  sendPush: (message: PushMessage) => Promise<void> | void;
};

type NotificationLogger = {
  warn(fields: {
    category: 'notification_delivery_failed';
    event: 'new_student_registration';
    channel: 'email' | 'push';
    trainerId: string;
    studentId: string;
  }): void;
};

export class NotifyNewStudentUseCase {
  constructor(
    private readonly repository: NewStudentNotificationRepository,
    private readonly services: NotificationServices,
    private readonly logger: NotificationLogger,
  ) {}

  private async deliver(
    channel: 'email' | 'push',
    trainerId: string,
    studentId: string,
    operation: () => Promise<void> | void,
  ): Promise<void> {
    try {
      await operation();
    } catch {
      this.logger.warn({
        category: 'notification_delivery_failed',
        event: 'new_student_registration',
        channel,
        trainerId,
        studentId,
      });
    }
  }

  async execute(trainerId: string, student: NewStudent): Promise<void> {
    const preferences = await findEffectiveNotificationPreferences(this.repository, trainerId);
    const event = preferences.newStudentRegistration;
    if (!event.enabled) return;

    const deliveries: Promise<void>[] = [];
    const trainerEmail = await this.repository.findTrainerEmail(trainerId);
    if (this.includesChannel(event.channel, 'email') && trainerEmail) {
      deliveries.push(
        this.deliver('email', trainerId, student.id, () =>
          this.services.sendEmail({
            to: trainerEmail,
            subject: 'Novo aluno cadastrado',
            html: `<p>O aluno ${student.name} foi cadastrado com sucesso.</p>`,
          }),
        ),
      );
    }
    if (this.includesChannel(event.channel, 'push') && student.expoPushToken) {
      deliveries.push(
        this.deliver('push', trainerId, student.id, () =>
          this.services.sendPush({
            token: student.expoPushToken ?? '',
            title: 'Boas-vindas ao Muvit',
            body: 'Seu cadastro foi concluído.',
          }),
        ),
      );
    }
    await Promise.all(deliveries);
  }

  private includesChannel(channel: NotificationChannel, target: 'email' | 'push'): boolean {
    return channel === target || channel === 'both';
  }
}
