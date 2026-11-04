import { assessmentReminderTemplate } from '../lib/mailer.js';
import { sendEmail as defaultSendEmail } from '../lib/mailer.js';
import type { EmailMessage, PushMessage } from '../lib/notification-types.js';
import { sendPush as defaultSendPush } from '../lib/push.js';
import { DrizzleNotificationsRepository } from '../modules/notifications/repositories/drizzle-notifications-repository.js';
import type { NotificationLogger } from '../modules/notifications/use-cases/notify-new-student.js';
import { RunDailyNotificationsUseCase } from '../modules/notifications/use-cases/run-daily-notifications.js';

type DailyNotificationsOptions = {
  now?: Date;
  sendPush?: (message: PushMessage) => Promise<void> | void;
  sendEmail?: (message: EmailMessage) => Promise<void> | void;
  logger?: NotificationLogger;
};

const defaultLogger: NotificationLogger = {
  warn: (fields) => console.warn(fields),
};

export { assessmentReminderTemplate };

export async function runDailyNotifications({
  now = new Date(),
  sendPush = defaultSendPush,
  sendEmail = defaultSendEmail,
  logger = defaultLogger,
}: DailyNotificationsOptions = {}): Promise<void> {
  const useCase = new RunDailyNotificationsUseCase(
    new DrizzleNotificationsRepository(),
    { sendPush, sendEmail },
    logger,
  );
  await useCase.execute(now);
}

export async function startNotificationCron(): Promise<void> {
  const cron = await import('node-cron');
  cron.schedule('0 9 * * *', () => {
    void runDailyNotifications();
  });
}
