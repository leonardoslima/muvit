import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { expo } from '@better-auth/expo';
import type { Database } from '@muvit/db';
import * as schema from '@muvit/db/schema';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { ProfileProvisioner } from '../modules/auth/profile-provisioner.js';

const THIRTY_DAYS = 60 * 60 * 24 * 30;
const ONE_DAY = 60 * 60 * 24;

export type AuthDependencies = {
  db: Database;
  profileProvisioner: ProfileProvisioner;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
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
  };
};

export type MuvitAuth = {
  handler(request: Request): Promise<Response>;
  api: {
    signUpEmail(options: { body: SignUpEmailInput }): Promise<SignedUpIdentity>;
    getSession(options: {
      headers: Headers;
    }): Promise<AuthSession | null>;
    getSessionWithHeaders(options: { headers: Headers }): Promise<{
      session: AuthSession | null;
      headers: Headers;
    }>;
    changeEmail(options: { headers: Headers; body: { newEmail: string } }): Promise<Headers>;
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
    },
  };
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
    emailAndPassword: { enabled: true },
    advanced: {
      database: { generateId: 'uuid' },
      cookiePrefix: 'muvit',
    },
    session: { expiresIn: THIRTY_DAYS, updateAge: ONE_DAY },
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
    handler: (request: Request) => auth.handler(request),
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
      changeEmail: async (options: { headers: Headers; body: { newEmail: string } }) => {
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
