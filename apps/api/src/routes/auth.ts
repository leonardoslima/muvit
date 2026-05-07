import { db, schema } from '@muvit/db';
import {
  authResponseSchema,
  loginSchema,
  refreshSchema,
  signupStudentSchema,
  signupTrainerSchema,
} from '@muvit/validators';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../lib/passwords.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/tokens.js';

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/auth/signup/trainer',
    {
      schema: { tags: ['auth'], body: signupTrainerSchema, response: { 201: authResponseSchema } },
    },
    async (req, reply) => {
      const existing = await db.query.trainers.findFirst({
        where: eq(schema.trainers.email, req.body.email),
      });
      if (existing) return reply.code(409).send({ error: 'email already registered' });

      const [trainer] = await db
        .insert(schema.trainers)
        .values({
          name: req.body.name,
          email: req.body.email,
          passwordHash: await hashPassword(req.body.password),
        })
        .returning();

      return reply.code(201).send({
        accessToken: await signAccessToken(app, { sub: trainer.id, role: 'trainer' }),
        refreshToken: await signRefreshToken(app, { sub: trainer.id, role: 'trainer' }),
        user: { id: trainer.id, name: trainer.name, email: trainer.email, role: 'trainer' },
      });
    },
  );

  app.post(
    '/auth/signup/student',
    {
      schema: { tags: ['auth'], body: signupStudentSchema, response: { 201: authResponseSchema } },
    },
    async (req, reply) => {
      const existing = await db.query.students.findFirst({
        where: eq(schema.students.email, req.body.email),
      });
      if (existing) return reply.code(409).send({ error: 'email already registered' });

      const [student] = await db
        .insert(schema.students)
        .values({
          name: req.body.name,
          email: req.body.email,
          passwordHash: await hashPassword(req.body.password),
          isIndependent: true,
        })
        .returning();

      const email = student.email ?? req.body.email;
      return reply.code(201).send({
        accessToken: await signAccessToken(app, { sub: student.id, role: 'student' }),
        refreshToken: await signRefreshToken(app, { sub: student.id, role: 'student' }),
        user: { id: student.id, name: student.name, email, role: 'student' },
      });
    },
  );

  app.post(
    '/auth/login',
    { schema: { tags: ['auth'], body: loginSchema, response: { 200: authResponseSchema } } },
    async (req, reply) => {
      if (req.body.role === 'trainer') {
        const t = await db.query.trainers.findFirst({
          where: eq(schema.trainers.email, req.body.email),
        });
        if (!t || !(await verifyPassword(req.body.password, t.passwordHash))) {
          return reply.code(401).send({ error: 'invalid credentials' });
        }
        return {
          accessToken: await signAccessToken(app, { sub: t.id, role: 'trainer' }),
          refreshToken: await signRefreshToken(app, { sub: t.id, role: 'trainer' }),
          user: { id: t.id, name: t.name, email: t.email, role: 'trainer' as const },
        };
      }
      const s = await db.query.students.findFirst({
        where: eq(schema.students.email, req.body.email),
      });
      if (!s || !s.passwordHash || !(await verifyPassword(req.body.password, s.passwordHash))) {
        return reply.code(401).send({ error: 'invalid credentials' });
      }
      const studentEmail = s.email ?? req.body.email;
      return {
        accessToken: await signAccessToken(app, { sub: s.id, role: 'student' }),
        refreshToken: await signRefreshToken(app, { sub: s.id, role: 'student' }),
        user: { id: s.id, name: s.name, email: studentEmail, role: 'student' as const },
      };
    },
  );

  app.post(
    '/auth/refresh',
    {
      schema: {
        tags: ['auth'],
        body: refreshSchema,
        response: { 200: z.object({ accessToken: z.string() }) },
      },
    },
    async (req, reply) => {
      try {
        const decoded = await verifyRefreshToken(app, req.body.refreshToken);
        return {
          accessToken: await signAccessToken(app, { sub: decoded.sub, role: decoded.role }),
        };
      } catch {
        return reply.code(401).send({ error: 'invalid refresh token' });
      }
    },
  );

  app.get(
    '/auth/me',
    { preHandler: [app.requireAuth], schema: { tags: ['auth'] } },
    async (req, reply) => {
      if (req.user.role === 'trainer') {
        const t = await db.query.trainers.findFirst({
          where: eq(schema.trainers.id, req.user.sub),
        });
        if (!t) return reply.code(404).send({ error: 'not found' });
        return { id: t.id, name: t.name, email: t.email, role: 'trainer' };
      }
      const s = await db.query.students.findFirst({
        where: eq(schema.students.id, req.user.sub),
      });
      if (!s) return reply.code(404).send({ error: 'not found' });
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        role: 'student',
        isIndependent: s.isIndependent,
      };
    },
  );
};
