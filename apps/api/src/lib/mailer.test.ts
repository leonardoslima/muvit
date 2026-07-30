import { describe, expect, it, vi } from 'vitest';

const resendMock = vi.hoisted(() => ({
  Resend: vi.fn(),
  send: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: resendMock.Resend,
}));

import { sendEmail } from './mailer.js';

describe('sendEmail', () => {
  it('does not send email when email notifications are not explicitly enabled', async () => {
    resendMock.send.mockResolvedValue({});
    resendMock.Resend.mockImplementation(function ResendMock() {
      return {
        emails: { send: resendMock.send },
      };
    });

    await sendEmail({
      to: 'trainer@example.com',
      subject: 'Avaliacao pendente',
      html: '<p>Aluno com avaliacao pendente.</p>',
    });

    expect(resendMock.Resend).not.toHaveBeenCalled();
    expect(resendMock.send).not.toHaveBeenCalled();
  });
});
