import { sendEmail } from '../../lib/mailer.js';
import { sendPush } from '../../lib/push.js';
import { DrizzleNotificationsRepository } from './repositories/drizzle-notifications-repository.js';
import { RunDailyNotificationsUseCase } from './use-cases/run-daily-notifications.js';

export function makeNotificationsModule() {
  return {
    runDailyNotifications: new RunDailyNotificationsUseCase(new DrizzleNotificationsRepository(), {
      sendPush,
      sendEmail,
    }),
  };
}
