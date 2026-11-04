import { describe, expect, it, vi } from 'vitest';
import type { MuvitAuth } from '../../../lib/auth.js';
import { BetterAuthTrainerIdentityUpdater } from './better-auth-trainer-identity-updater.js';

function cookieHeaders(value: string): Headers {
  const headers = new Headers();
  headers.append('set-cookie', value);
  return headers;
}

describe('BetterAuthTrainerIdentityUpdater', () => {
  it('preserva cookies das leituras e mutações da sessão', async () => {
    let user = {
      id: 'auth-user-id',
      role: 'trainer',
      email: 'antes@example.com',
      name: 'Antes',
      image: null,
    };
    let sessionRead = 0;
    const auth: MuvitAuth = {
      handler: vi.fn(async () => new Response()),
      api: {
        signUpEmail: vi.fn(async () => ({ user: { id: user.id } })),
        getSession: vi.fn(async () => ({ user })),
        getSessionWithHeaders: vi.fn(async () => {
          sessionRead += 1;
          return {
            session: { user },
            headers: cookieHeaders(`session-read-${sessionRead}=value`),
          };
        }),
        changeEmail: vi.fn(async ({ body }) => {
          user = { ...user, email: body.newEmail };
          return cookieHeaders('email-change=value');
        }),
        updateUser: vi.fn(async ({ body }) => {
          user = { ...user, ...body };
          return cookieHeaders('user-update=value');
        }),
      },
    };
    const updater = new BetterAuthTrainerIdentityUpdater(auth, { cookie: 'session=value' });

    await updater.updateIdentity({
      authUserId: user.id,
      current: { email: user.email, name: user.name, image: user.image },
      next: { email: 'depois@example.com', name: 'Depois', image: 'https://example.com/a.png' },
    });

    expect(updater.takeSetCookieHeaders()).toEqual([
      'session-read-1=value',
      'email-change=value',
      'user-update=value',
      'session-read-2=value',
    ]);
  });
});
