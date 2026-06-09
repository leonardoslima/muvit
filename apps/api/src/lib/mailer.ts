import { Resend } from 'resend';
import { env } from '../env.js';

type MailMessage = {
  to: string;
  subject: string;
  html: string;
};

export function assessmentReminderTemplate(studentName: string): string {
  return `<p>O aluno ${studentName} esta com avaliacao fisica pendente ha mais de 60 dias.</p>`;
}

export function welcomeTrainerTemplate(name: string): string {
  return `<p>Boas-vindas ao Muvit, ${name}.</p>`;
}

export function welcomeStudentTemplate(name: string): string {
  return `<p>Boas-vindas ao Muvit, ${name}. Seu treino esta pronto para acompanhar pelo app.</p>`;
}

export async function sendEmail({ to, subject, html }: MailMessage): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return;

  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}
