import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import scalar from '@scalar/fastify-api-reference';
import Fastify from 'fastify';
import {
  type ZodTypeProvider,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { env } from './env.js';
import authPlugin from './plugins/auth.js';
import { assessmentsRoutes } from './routes/assessments.js';
import { authRoutes } from './routes/auth.js';
import { exercisesRoutes } from './routes/exercises.js';
import { healthRoutes } from './routes/health.js';
import { studentsRoutes } from './routes/students.js';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: env.WEB_URL, credentials: true });
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(authPlugin);

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
  await app.register(authRoutes);
  await app.register(studentsRoutes);
  await app.register(exercisesRoutes);
  await app.register(assessmentsRoutes);

  return app;
}
