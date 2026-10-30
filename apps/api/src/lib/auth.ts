import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { expo } from '@better-auth/expo';
import type { Database } from '@muvit/db';
import * as schema from '@muvit/db/schema';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { ProfileProvisioner } from '../modules/auth/profile-provisioner.js';

const THIRTY_DAYS = 60 * 60 * 24 * 30;
const ONE_DAY = 60 * 60 * 24;
const ONE_HOUR = 60 * 60;

export type PasswordResetMessage = {
  user: { name: string; email: string };
  url: string;
};

export type SendResetPassword = (message: PasswordResetMessage) => Promise<void>;

export type AuthDependencies = {
  db: Database;
  profileProvisioner: ProfileProvisioner;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  sendResetPassword?: SendResetPassword;
  onPasswordResetDeliveryError?: () => void;
  onAuthError?: () => void;
};

export type SignUpEmailInput = {
  name: string;
  email: string;
  password: string;
  role: 'trainer' | 'student';
};

export type SignedUpIdentity = {
  user: {
    id: string;
  };
};

export type MuvitAuth = {
  handler(request: Request): Promise<Response>;
  api: {
    signUpEmail(options: { body: SignUpEmailInput }): Promise<SignedUpIdentity>;
    getSession(options: {
      headers: Headers;
    }): Promise<{ user: { id: string; role: unknown } } | null>;
  };
};

function isAuthRole(value: unknown): value is 'trainer' | 'student' {
  return value === 'trainer' || value === 'student';
}

function readRole(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || !('role' in body)) return undefined;
  return body.role;
}

export function createMuvitAuth(dependencies: AuthDependencies): MuvitAuth {
  const auth = betterAuth({
    database: drizzleAdapter(dependencies.db, {
      provider: 'pg',
      schema: {
        user: schema.authUsers,
        session: schema.authSessions,
        account: schema.authAccounts,
        verification: schema.authVerifications,
      },
      transaction: true,
    }),
    secret: dependencies.secret,
    baseURL: dependencies.baseURL,
    logger: {
      level: 'error',
      log: () => dependencies.onAuthError?.(),
    },
    emailAndPassword: {
      enabled: true,
      resetPasswordTokenExpiresIn: ONE_HOUR,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async (message) => {
        const send = dependencies.sendResetPassword;
        if (!send) return;

        // A entrega externa não participa do tempo de resposta da solicitação.
        void Promise.resolve()
          .then(() => send(message))
          .catch(() => dependencies.onPasswordResetDeliveryError?.());
      },
    },
    advanced: {
      disableOriginCheck: false,
      database: { generateId: 'uuid' },
      cookiePrefix: 'muvit',
    },
    session: { expiresIn: THIRTY_DAYS, updateAge: ONE_DAY },
    user: {
      additionalFields: {
        role: { type: 'string', required: true, input: true },
      },
    },
    trustedOrigins: dependencies.trustedOrigins,
    plugins: [expo()],
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (context.path === '/request-password-reset' && !dependencies.sendResetPassword) {
          throw new APIError('SERVICE_UNAVAILABLE', {
            code: 'PASSWORD_RESET_UNAVAILABLE',
            message: 'Recuperação de senha temporariamente indisponível',
          });
        }
        const requestedRole = readRole(context.body);
        if (context.path === '/sign-up/email' && !isAuthRole(requestedRole)) {
          throw new APIError('BAD_REQUEST', { message: 'invalid role' });
        }
        if (context.path === '/update-user' && requestedRole !== undefined) {
          throw new APIError('BAD_REQUEST', { message: 'role cannot be changed' });
        }
      }),
      after: createAuthMiddleware(async (context) => {
        if (context.path !== '/sign-up/email') return;

        const user = context.context.newSession?.user;
        if (!user || !isAuthRole(user.role)) {
          throw new APIError('INTERNAL_SERVER_ERROR', {
            message: 'invalid provisioned identity',
          });
        }

        try {
          await dependencies.profileProvisioner.provision({
            authUserId: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          });
        } catch {
          await dependencies.profileProvisioner.removeIdentity(user.id);
          throw new APIError('INTERNAL_SERVER_ERROR', {
            message: 'unable to provision profile',
          });
        }
      }),
    },
  });

  return {
    handler: (request: Request) => auth.handler(request),
    api: {
      signUpEmail: async (options: { body: SignUpEmailInput }) => {
        const identity = await auth.api.signUpEmail(options);
        return { user: { id: identity.user.id } };
      },
      getSession: async (options: { headers: Headers }) => {
        const session = await auth.api.getSession(options);
        if (session === null) return null;

        return { user: { id: session.user.id, role: session.user.role } };
      },
    },
  };
}
