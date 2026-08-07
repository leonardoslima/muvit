import type { IncomingHttpHeaders } from 'node:http';
import { fromNodeHeaders } from 'better-auth/node';
import type { MuvitAuth } from '../../../lib/auth.js';
import {
  type TrainerIdentity,
  TrainerIdentityConflictError,
  type TrainerIdentityUpdater,
} from '../trainer-identity-updater.js';

function isSameIdentity(actual: TrainerIdentity, expected: TrainerIdentity): boolean {
  return (
    actual.email === expected.email &&
    actual.name === expected.name &&
    actual.image === expected.image
  );
}

export class BetterAuthTrainerIdentityUpdater implements TrainerIdentityUpdater {
  private readonly setCookieHeaders: string[] = [];

  constructor(
    private readonly auth: MuvitAuth,
    headers: IncomingHttpHeaders,
  ) {
    this.headers = fromNodeHeaders(headers);
  }

  private readonly headers: Headers;

  takeSetCookieHeaders(): string[] {
    return this.setCookieHeaders.splice(0);
  }

  async updateIdentity(input: {
    authUserId: string;
    current: TrainerIdentity;
    next: TrainerIdentity;
  }): Promise<void> {
    const sessionResult = await this.auth.api.getSessionWithHeaders({ headers: this.headers });
    this.setCookieHeaders.push(...sessionResult.headers.getSetCookie());
    const session = sessionResult.session;
    if (session?.user.id !== input.authUserId) throw new Error('invalid trainer identity session');

    const nextIdentity = {
      ...input.next,
      email: input.next.email.trim().toLowerCase(),
    };

    if (session.user.email !== nextIdentity.email) {
      const responseHeaders = await this.auth.api.changeEmail({
        headers: this.headers,
        body: { newEmail: nextIdentity.email },
      });
      this.setCookieHeaders.push(...responseHeaders.getSetCookie());
    }

    if (session.user.name !== nextIdentity.name || session.user.image !== nextIdentity.image) {
      const responseHeaders = await this.auth.api.updateUser({
        headers: this.headers,
        body: { name: nextIdentity.name, image: nextIdentity.image },
      });
      this.setCookieHeaders.push(...responseHeaders.getSetCookie());
    }

    const updatedSessionResult = await this.auth.api.getSessionWithHeaders({
      headers: this.headers,
    });
    this.setCookieHeaders.push(...updatedSessionResult.headers.getSetCookie());
    const updatedSession = updatedSessionResult.session;
    if (updatedSession?.user.id !== input.authUserId) {
      throw new Error('invalid updated trainer identity session');
    }

    const updatedIdentity: TrainerIdentity = {
      email: updatedSession.user.email,
      name: updatedSession.user.name,
      image: updatedSession.user.image,
    };
    if (updatedIdentity.email !== nextIdentity.email) {
      throw new TrainerIdentityConflictError();
    }
    if (!isSameIdentity(updatedIdentity, nextIdentity)) {
      throw new Error('trainer identity was not updated');
    }
  }
}
