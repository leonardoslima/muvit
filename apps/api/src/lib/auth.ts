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

function isAuthRole(value: unknown): value is 'trainer' | 'student' {
  return value === 'trainer' || value === 'student';
}

function readRole(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || !('role' in body)) return undefined;
  return body.role;
}

export function createMuvitAuth(dependencies: AuthDependencies) {
  return betterAuth({
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
}

export type MuvitAuth = ReturnType<typeof createMuvitAuth>;
