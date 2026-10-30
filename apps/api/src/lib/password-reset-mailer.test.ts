import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const resendMock = vi.hoisted(() => ({ Resend: vi.fn(), send: vi.fn() }));
vi.mock('resend', () => ({ Resend: resendMock.Resend }));
import { env } from '../env.js';
import { passwordResetTemplate, sendPasswordResetEmail } from './mailer.js';
const original = { key: env.RESEND_API_KEY, from: env.EMAIL_FROM };
beforeEach(() => {
  resendMock.send.mockReset().mockResolvedValue({ data: { id: 'message-id' }, error: null });
  resendMock.Resend.mockImplementation(function ResendMock() {
    return { emails: { send: resendMock.send } };
  });
});
afterEach(() => {
  env.RESEND_API_KEY = original.key;
  env.EMAIL_FROM = original.from;
});

describe('email transacional de recuperação', () => {
  it('entrega a mensagem mesmo com notificações opcionais desabilitadas', async () => {
    expect(env.EMAIL_NOTIFICATIONS_ENABLED).toBe(false);
    await sendPasswordResetEmail({
      user: { name: 'Ana', email: 'ana@example.com' },
      url: 'https://api.example.com/api/auth/reset-password/token',
    });
    expect(resendMock.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        from: original.from,
        subject: 'Redefina sua senha no Muvit',
        html: expect.stringContaining('https://api.example.com/api/auth/reset-password/token'),
      }),
    );
  });
  it('escapa o nome e a URL no HTML sem permitir injeção', () => {
    const html = passwordResetTemplate(
      '<img src=x onerror="alert(1)">',
      'https://api.example.com/reset?callbackURL=" onmouseover="alert(1)&x=1',
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('callbackURL=&quot; onmouseover=&quot;alert(1)&amp;x=1');
    expect(html).toContain('1 hora');
  });
  it.each(['RESEND_API_KEY', 'EMAIL_FROM'] as const)('não silencia a falta de %s', async (key) => {
    env[key] = undefined;
    await expect(
      sendPasswordResetEmail({
        user: { name: 'Ana', email: 'ana@example.com' },
        url: 'https://api.example.com/reset/token',
      }),
    ).rejects.toThrow('Entrega de email transacional não configurada');
    expect(resendMock.send).not.toHaveBeenCalled();
  });
  it('não propaga detalhes potencialmente sensíveis da falha do provedor', async () => {
    resendMock.send.mockResolvedValue({
      data: null,
      error: { message: 'token-secreto-na-mensagem' },
    });
    await expect(
      sendPasswordResetEmail({
        user: { name: 'Ana', email: 'ana@example.com' },
        url: 'https://api.example.com/reset/token',
      }),
    ).rejects.toThrow('Falha ao enviar email transacional');
  });
});
