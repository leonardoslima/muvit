import { db, schema } from '@muvit/db';
import { and, desc, eq, gte } from 'drizzle-orm';
import { assessmentReminderTemplate, sendEmail as defaultSendEmail } from '../lib/mailer.js';
import { sendPush as defaultSendPush } from '../lib/push.js';

const INACTIVE_DAYS = 7;
const ASSESSMENT_STALE_DAYS = 60;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type PushMessage = {
  token: string;
  title: string;
  body: string;
};

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

type DailyNotificationsOptions = {
  now?: Date;
  sendPush?: (message: PushMessage) => Promise<void> | void;
  sendEmail?: (message: EmailMessage) => Promise<void> | void;
};

export async function runDailyNotifications({
  now = new Date(),
  sendPush = defaultSendPush,
  sendEmail = defaultSendEmail,
}: DailyNotificationsOptions = {}): Promise<void> {
  const inactiveSince = new Date(now.getTime() - INACTIVE_DAYS * ONE_DAY_MS)
    .toISOString()
    .slice(0, 10);
  const staleAssessmentBefore = new Date(now.getTime() - ASSESSMENT_STALE_DAYS * ONE_DAY_MS)
    .toISOString()
    .slice(0, 10);

  const students = await db.query.students.findMany({
    with: { trainer: true },
    where: eq(schema.students.status, 'active'),
  });

  for (const student of students) {
    const recentLog = await db.query.workoutLogs.findFirst({
      where: and(
        eq(schema.workoutLogs.studentId, student.id),
        gte(schema.workoutLogs.date, inactiveSince),
      ),
    });

    if (!recentLog && student.expoPushToken) {
      await sendPush({
        token: student.expoPushToken,
        title: 'Hora de voltar ao treino',
        body: 'Voce esta ha 7 dias sem registrar treino.',
      });
    }

    if (!student.trainer?.email) continue;

    const lastAssessment = await db.query.assessments.findFirst({
      where: eq(schema.assessments.studentId, student.id),
      orderBy: desc(schema.assessments.date),
    });

    if (!lastAssessment || lastAssessment.date < staleAssessmentBefore) {
      await sendEmail({
        to: student.trainer.email,
        subject: 'Aluno com avaliacao vencida',
        html: assessmentReminderTemplate(student.name),
      });
    }
  }
}

export async function startNotificationCron(): Promise<void> {
  const cron = await import('node-cron');
  cron.schedule('0 9 * * *', () => {
    void runDailyNotifications();
  });
}
