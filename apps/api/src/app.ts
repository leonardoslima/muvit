import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import scalar from '@scalar/fastify-api-reference';
import Fastify, { type FastifyRequest } from 'fastify';
import {
  type ZodTypeProvider,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { env } from './env.js';
import { sanitizeAuthRequestUrl } from './lib/auth-request-logging.js';
import type { MuvitAuth, SendResetPassword } from './lib/auth.js';
import { sendPasswordResetEmail } from './lib/mailer.js';
import type { ProfileProvisioner } from './modules/auth/profile-provisioner.js';
import type { ProfileResolver } from './modules/auth/profile-resolver.js';
import { createDrizzleAuth } from './modules/auth/repositories/drizzle-auth.js';
import { createDrizzleProfileResolver } from './modules/auth/repositories/drizzle-profile-resolver.js';
import authPlugin from './plugins/auth.js';
import { assessmentsRoutes } from './routes/assessments.js';
import { betterAuthRoutes } from './routes/better-auth.js';
import { exercisesRoutes } from './routes/exercises.js';
import { healthRoutes } from './routes/health.js';
import { studentsRoutes } from './routes/students.js';
import { trainerSummaryRoutes } from './routes/trainer-summary.js';
import { trainersRoutes } from './routes/trainers.js';
import { uploadsRoutes } from './routes/uploads.js';
import { workoutEvolutionRoutes } from './routes/workout-evolution.js';
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
  profileResolver?: ProfileResolver;
  sendResetPassword?: SendResetPassword;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      ...(env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
      serializers: {
        req: (request: FastifyRequest) => ({
          method: request.method,
          url: sanitizeAuthRequestUrl(request.url),
          host: request.hostname,
          remoteAddress: request.ip,
        }),
      },
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: corsOrigins(), credentials: true });
  await app.register(rateLimit, {
    global: false,
    allowList: env.NODE_ENV === 'test' ? ['127.0.0.1'] : [],
  });

  const auth = createDrizzleAuth({
    profileProvisioner: options.profileProvisioner,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.WEB_URL, ...env.EXPO_TRUSTED_ORIGINS],
    sendResetPassword:
      options.sendResetPassword ??
      (env.RESEND_API_KEY && env.EMAIL_FROM ? sendPasswordResetEmail : undefined),
    onPasswordResetDeliveryError: () => {
      app.log.error({ category: 'password_reset_delivery_failed' });
    },
    onAuthError: () => {
      app.log.error({ category: 'auth_provider_error' });
    },
  });
  if (!options.sendResetPassword && (!env.RESEND_API_KEY || !env.EMAIL_FROM)) {
    app.log.error({ category: 'password_reset_email_not_configured' });
  }
  app.decorate('auth', auth);
  await app.register(authPlugin, {
    profileResolver: options.profileResolver ?? createDrizzleProfileResolver(),
  });

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
  await app.register(studentsRoutes);
  await app.register(exercisesRoutes);
  await app.register(trainersRoutes);
  await app.register(assessmentsRoutes);
  await app.register(workoutsRoutes);
  await app.register(workoutLogsRoutes);
  await app.register(workoutEvolutionRoutes);
  await app.register(trainerSummaryRoutes);
  await app.register(uploadsRoutes);

  return app;
}
