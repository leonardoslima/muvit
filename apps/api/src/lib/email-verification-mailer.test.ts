import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const resendMock = vi.hoisted(() => ({ Resend: vi.fn(), send: vi.fn() }));
vi.mock('resend', () => ({ Resend: resendMock.Resend }));
import { env } from '../env.js';
import { emailVerificationTemplate, sendVerificationEmail } from './mailer.js';
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
describe('email transacional de confirmação', () => {
  it('envia mesmo com notificações opcionais desativadas', async () => {
    expect(env.EMAIL_NOTIFICATIONS_ENABLED).toBe(false);
    await sendVerificationEmail({
      user: { name: 'Ana', email: 'ana@example.com' },
      url: 'https://api.example.com/verify-email?token=teste',
    });
    expect(resendMock.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        subject: 'Confirme seu email no Muvit',
        html: expect.stringContaining('1 hora'),
      }),
    );
  });
  it('escapa nome e link no HTML', () => {
    const html = emailVerificationTemplate('<img src=x>', 'https://api.example.com/?x="&y=1');
    expect(html).toContain('&lt;img');
    expect(html).toContain('x=&quot;&amp;y=1');
  });
  it.each(['RESEND_API_KEY', 'EMAIL_FROM'] as const)(
    'rejeita configuração ausente: %s',
    async (key) => {
      env[key] = undefined;
      await expect(
        sendVerificationEmail({
          user: { name: 'Ana', email: 'ana@example.com' },
          url: 'https://example.com',
        }),
      ).rejects.toThrow('Entrega de email transacional não configurada');
      expect(resendMock.send).not.toHaveBeenCalled();
    },
  );
  it('não expõe erro do provedor', async () => {
    resendMock.send.mockResolvedValue({ data: null, error: { message: 'segredo' } });
    await expect(
      sendVerificationEmail({
        user: { name: 'Ana', email: 'ana@example.com' },
        url: 'https://example.com',
      }),
    ).rejects.toThrow('Falha ao enviar email transacional');
  });
});
