import { Resend } from 'resend';
import { env } from '../env.js';
import type { PasswordResetMessage } from './auth.js';

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

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function passwordResetTemplate(name: string, url: string): string {
  return `<p>Olá, ${escapeHtml(name)}.</p><p>Recebemos uma solicitação para redefinir sua senha no Muvit.</p><p><a href="${escapeHtml(url)}">Redefinir senha</a></p><p>Este link expira em 1 hora e pode ser usado uma única vez. Se você não solicitou a alteração, ignore este email.</p>`;
}

export async function sendPasswordResetEmail({ user, url }: PasswordResetMessage): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error('Entrega de email transacional não configurada');
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: user.email,
      subject: 'Redefina sua senha no Muvit',
      html: passwordResetTemplate(user.name, url),
    });
    if (error) throw new Error('Falha ao enviar email transacional');
  } catch {
    throw new Error('Falha ao enviar email transacional');
  }
}

export async function sendEmail({ to, subject, html }: MailMessage): Promise<void> {
  if (!env.EMAIL_NOTIFICATIONS_ENABLED || !env.RESEND_API_KEY || !env.EMAIL_FROM) return;

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
