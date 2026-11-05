import { AsyncLocalStorage } from 'node:async_hooks';
import { expo } from '@better-auth/expo';
import type { Database } from '@muvit/db';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware, createEmailVerificationToken } from 'better-auth/api';
import { verifyJWT } from 'better-auth/crypto';
import type { ProfileProvisioner } from '../modules/auth/profile-provisioner.js';
import { createDrizzleAuthAdapter } from '../modules/auth/repositories/drizzle-auth-adapter.js';

const THIRTY_DAYS = 60 * 60 * 24 * 30;
const ONE_DAY = 60 * 60 * 24;
const ONE_HOUR = 60 * 60;

export type PasswordResetMessage = {
  user: { name: string; email: string };
  url: string;
};

export type SendResetPassword = (message: PasswordResetMessage) => Promise<void>;

export type EmailVerificationMessage = PasswordResetMessage;
export type SendVerificationEmail = (message: EmailVerificationMessage) => Promise<void>;

export type AuthDependencies = {
  db: Database;
  profileProvisioner: ProfileProvisioner;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  sendResetPassword?: SendResetPassword;
  sendVerificationEmail?: SendVerificationEmail;
  onVerificationDeliveryError?: () => void;
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

type AuthSession = {
  user: {
    id: string;
    role: unknown;
    email: string;
    name: string;
    image: string | null;
    emailVerified: boolean;
  };
};

export type MuvitAuth = {
  handler(request: Request): Promise<Response>;
  withDeferredVerificationDelivery<T>(operation: () => Promise<T>): Promise<T>;
  api: {
    signUpEmail(options: { body: SignUpEmailInput }): Promise<SignedUpIdentity>;
    getSession(options: {
      headers: Headers;
    }): Promise<AuthSession | null>;
    getSessionWithHeaders(options: { headers: Headers }): Promise<{
      session: AuthSession | null;
      headers: Headers;
    }>;
    changeEmail(options: {
      headers: Headers;
      body: { newEmail: string; callbackURL?: string };
    }): Promise<Headers>;
    updateUser(options: {
      headers: Headers;
      body: { name: string; image: string | null };
    }): Promise<Headers>;
  };
};

function isAuthRole(value: unknown): value is 'trainer' | 'student' {
  return value === 'trainer' || value === 'student';
}

function readRole(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || !('role' in body)) return undefined;
  return body.role;
}

function mapSession(
  session: {
    user: {
      id: string;
      role: unknown;
      email: string;
      name: string;
      image?: string | null;
      emailVerified: boolean;
    };
  } | null,
): AuthSession | null {
  if (session === null) return null;

  return {
    user: {
      id: session.user.id,
      role: session.user.role,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image ?? null,
      emailVerified: session.user.emailVerified,
    },
  };
}

export function createMuvitAuth(dependencies: AuthDependencies): MuvitAuth {
  const pendingVerificationMessages = new AsyncLocalStorage<EmailVerificationMessage[]>();
  const verificationIdentity = new AsyncLocalStorage<{ id: string | null; email: string | null }>();
  function deliverVerification(message: EmailVerificationMessage): void {
    const send = dependencies.sendVerificationEmail;
    if (!send) return;
    void Promise.resolve()
      .then(() => send(message))
      .catch(() => dependencies.onVerificationDeliveryError?.());
  }
  const auth = betterAuth({
    database: createDrizzleAuthAdapter(dependencies.db, () => verificationIdentity.getStore()?.id),
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
    emailVerification: {
      expiresIn: ONE_HOUR,
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async (message) => {
        const payload = await verifyJWT<Record<string, unknown>>(
          message.token,
          dependencies.secret,
        );
        if (!payload || typeof payload.email !== 'string' || typeof payload.exp !== 'number') {
          throw new Error('Token de confirmação inválido');
        }
        const remaining = payload.exp - Math.floor(Date.now() / 1000);
        if (remaining <= 0) throw new Error('Token de confirmação expirado');
        const token = await createEmailVerificationToken(
          dependencies.secret,
          payload.email,
          typeof payload.updateTo === 'string' ? payload.updateTo : undefined,
          remaining,
          {
            authUserId: message.user.id,
            ...(typeof payload.requestType === 'string'
              ? { requestType: payload.requestType }
              : {}),
          },
        );
        const verificationUrl = new URL(message.url);
        verificationUrl.searchParams.set('token', token);
        const pending = pendingVerificationMessages.getStore();
        if (pending) {
          const webOrigin = dependencies.trustedOrigins[0];
          if (!webOrigin) throw new Error('Callback de confirmação indisponível');
          const callback = new URL('/verify-email', webOrigin);
          callback.hash = new URLSearchParams({ token }).toString();
          pending.push({ user: message.user, url: callback.toString() });
        } else deliverVerification({ user: message.user, url: verificationUrl.toString() });
      },
    },
    advanced: {
      disableOriginCheck: false,
      database: { generateId: 'uuid' },
      cookiePrefix: 'muvit',
    },
    session: { expiresIn: THIRTY_DAYS, updateAge: ONE_DAY },
    databaseHooks: {
      session: {
        create: {
          before: async (_session, context) => {
            if (context?.path === '/verify-email') {
              throw new APIError('UNAUTHORIZED', {
                code: 'SESSION_REQUIRED',
                message: 'Entre na conta para confirmar a troca de email.',
              });
            }
          },
        },
      },
    },
    user: {
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: true,
      },
      additionalFields: {
        role: { type: 'string', required: true, input: true },
      },
    },
    trustedOrigins: dependencies.trustedOrigins,
    plugins: [expo()],
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (context.path === '/verify-email') {
          const binding = verificationIdentity.getStore();
          if (binding) {
            const current = binding.email
              ? await context.context.internalAdapter.findUserByEmail(binding.email)
              : null;
            if (!binding.id || current?.user.id !== binding.id) {
              const callback = context.query?.callbackURL;
              if (
                typeof callback === 'string' &&
                context.context.isTrustedOrigin(callback, { allowRelativePaths: true })
              ) {
                const target = new URL(callback, dependencies.trustedOrigins[0]);
                target.searchParams.set('error', 'INVALID_TOKEN');
                throw context.redirect(target.toString());
              }
              throw new APIError('UNAUTHORIZED', {
                code: 'INVALID_TOKEN',
                message: 'Link inválido.',
              });
            }
          }
        }
        if (context.path === '/send-verification-email' && !dependencies.sendVerificationEmail) {
          throw new APIError('SERVICE_UNAVAILABLE', {
            code: 'EMAIL_VERIFICATION_UNAVAILABLE',
            message: 'Confirmação de email temporariamente indisponível',
          });
        }
        if (context.path === '/change-email' && !dependencies.sendVerificationEmail) {
          throw new APIError('SERVICE_UNAVAILABLE', {
            code: 'EMAIL_VERIFICATION_UNAVAILABLE',
            message: 'Confirmação de email temporariamente indisponível',
          });
        }
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
        if (
          (context.path === '/change-email' || context.path === '/update-user') &&
          context.request !== undefined
        ) {
          throw new APIError('BAD_REQUEST', {
            message: 'Atualize seus dados pela rota de perfil.',
          });
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
    handler: async (request: Request) => {
      const url = new URL(request.url);
      const token = url.pathname.endsWith('/verify-email') ? url.searchParams.get('token') : null;
      if (!token) return auth.handler(request);
      const payload = await verifyJWT<Record<string, unknown>>(token, dependencies.secret);
      if (!payload) return auth.handler(request);
      return verificationIdentity.run(
        {
          id: typeof payload.authUserId === 'string' ? payload.authUserId : null,
          email: typeof payload.email === 'string' ? payload.email : null,
        },
        () => auth.handler(request),
      );
    },
    withDeferredVerificationDelivery: async <T>(operation: () => Promise<T>): Promise<T> => {
      const pending: EmailVerificationMessage[] = [];
      const result = await pendingVerificationMessages.run(pending, operation);
      for (const message of pending) deliverVerification(message);
      return result;
    },
    api: {
      signUpEmail: async (options: { body: SignUpEmailInput }) => {
        const identity = await auth.api.signUpEmail(options);
        return { user: { id: identity.user.id } };
      },
      getSession: async (options: { headers: Headers }) => {
        const session = await auth.api.getSession(options);
        return mapSession(session);
      },
      getSessionWithHeaders: async (options: { headers: Headers }) => {
        const result = await auth.api.getSession({ ...options, returnHeaders: true });
        return { session: mapSession(result.response), headers: result.headers };
      },
      changeEmail: async (options: {
        headers: Headers;
        body: { newEmail: string; callbackURL?: string };
      }) => {
        const result = await auth.api.changeEmail({ ...options, returnHeaders: true });
        return result.headers;
      },
      updateUser: async (options: {
        headers: Headers;
        body: { name: string; image: string | null };
      }) => {
        const result = await auth.api.updateUser({ ...options, returnHeaders: true });
        return result.headers;
      },
    },
  };
}
