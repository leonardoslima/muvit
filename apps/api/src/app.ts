import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import { db } from '@muvit/db';
import scalar from '@scalar/fastify-api-reference';
import Fastify from 'fastify';
import {
  type ZodTypeProvider,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { env } from './env.js';
import { type MuvitAuth, createMuvitAuth } from './lib/auth.js';
import type { ProfileProvisioner } from './modules/auth/profile-provisioner.js';
import { DrizzleProfileProvisioner } from './modules/auth/repositories/drizzle-profile-provisioner.js';
import authPlugin from './plugins/auth.js';
import { assessmentsRoutes } from './routes/assessments.js';
import { authRoutes } from './routes/auth.js';
import { betterAuthRoutes } from './routes/better-auth.js';
import { exercisesRoutes } from './routes/exercises.js';
import { healthRoutes } from './routes/health.js';
import { studentsRoutes } from './routes/students.js';
import { trainerSummaryRoutes } from './routes/trainer-summary.js';
import { uploadsRoutes } from './routes/uploads.js';
import { workoutLogsRoutes } from './routes/workout-logs.js';
import { workoutsRoutes } from './routes/workouts.js';

function corsOrigins() {
  if (env.NODE_ENV === 'production') return env.WEB_URL;

  return [env.WEB_URL, /^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];
}

declare module 'fastify' {
  interface FastifyInstance {
    auth: MuvitAuth;
  }
}

export type BuildAppOptions = {
  profileProvisioner?: ProfileProvisioner;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: corsOrigins(), credentials: true });
  await app.register(rateLimit, {
    global: false,
    allowList: env.NODE_ENV === 'test' ? ['127.0.0.1'] : [],
  });
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(authPlugin);

  const profileProvisioner = options.profileProvisioner ?? new DrizzleProfileProvisioner(db);
  const auth = createMuvitAuth({
    db,
    profileProvisioner,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.WEB_URL, ...env.EXPO_TRUSTED_ORIGINS],
  });
  app.decorate('auth', auth);

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Muvit API',
        description: 'API REST do Muvit — plataforma de treinos.',
        version: '0.1.0',
      },
      servers: [{ url: `http://localhost:${env.API_PORT}` }],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(scalar, {
    routePrefix: '/docs',
    configuration: { theme: 'default' },
  });

  await app.register(healthRoutes);
  await app.register(betterAuthRoutes);
  await app.register(authRoutes);
  await app.register(studentsRoutes);
  await app.register(exercisesRoutes);
  await app.register(assessmentsRoutes);
  await app.register(workoutsRoutes);
  await app.register(workoutLogsRoutes);
  await app.register(trainerSummaryRoutes);
  await app.register(uploadsRoutes);

  return app;
}
