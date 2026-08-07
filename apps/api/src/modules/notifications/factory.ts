import { sendEmail } from '../../lib/mailer.js';
import { sendPush } from '../../lib/push.js';
import { DrizzleNotificationsRepository } from './repositories/drizzle-notifications-repository.js';
import { GetNotificationPreferencesUseCase } from './use-cases/get-notification-preferences.js';
import { NotifyNewStudentUseCase } from './use-cases/notify-new-student.js';
import { RunDailyNotificationsUseCase } from './use-cases/run-daily-notifications.js';
import { UpdateNotificationPreferencesUseCase } from './use-cases/update-notification-preferences.js';

type NotificationsLogger = ConstructorParameters<typeof NotifyNewStudentUseCase>[2];

const fallbackLogger: NotificationsLogger = {
  warn: (fields) => console.warn(fields),
};

export function makeNotificationsModule(logger: NotificationsLogger = fallbackLogger) {
  const repository = new DrizzleNotificationsRepository();
  const services = { sendPush, sendEmail };

  return {
    getPreferences: new GetNotificationPreferencesUseCase(repository),
    updatePreferences: new UpdateNotificationPreferencesUseCase(repository),
    runDailyNotifications: new RunDailyNotificationsUseCase(repository, services),
    notifyNewStudent: new NotifyNewStudentUseCase(repository, services, logger),
  };
}
