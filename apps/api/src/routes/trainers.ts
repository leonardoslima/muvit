import { trainerProfileSchema, updateTrainerProfileSchema } from '@muvit/validators';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { BetterAuthTrainerIdentityUpdater } from '../modules/auth/repositories/better-auth-trainer-identity-updater.js';
import { makeTrainersModule } from '../modules/trainers/factory.js';
import {
  TrainerProfileCompensationError,
  TrainerProfileUpdateConflictError,
  TrainerProfileUpdateError,
} from '../modules/trainers/use-cases/update-trainer-profile.js';

export const trainersRoutes: FastifyPluginAsyncZod = async (app) => {
  const errorResponseSchema = z.object({ error: z.string() });

  app.get(
    '/trainers/me',
    {
      preHandler: [app.requireAuth, app.requireRole('trainer')],
      schema: {
        operationId: 'getTrainerProfile',
        tags: ['trainers'],
        response: {
          200: trainerProfileSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const identityUpdater = new BetterAuthTrainerIdentityUpdater(app.auth, request.headers);
      return makeTrainersModule(identityUpdater).getProfile.execute(request.identity);
    },
  );

  app.patch(
    '/trainers/me',
    {
      preHandler: [app.requireAuth, app.requireRole('trainer')],
      schema: {
        operationId: 'updateTrainerProfile',
        tags: ['trainers'],
        body: updateTrainerProfileSchema,
        response: {
          200: trainerProfileSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          409: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const identityUpdater = new BetterAuthTrainerIdentityUpdater(app.auth, request.headers);
      const forwardSetCookies = () => {
        const setCookieHeaders = identityUpdater.takeSetCookieHeaders();
        if (setCookieHeaders.length > 0) reply.header('set-cookie', setCookieHeaders);
      };

      try {
        const profile = await makeTrainersModule(identityUpdater).updateProfile.execute(
          request.identity,
          request.body,
        );
        forwardSetCookies();
        return profile;
      } catch (error) {
        forwardSetCookies();
        if (error instanceof TrainerProfileUpdateConflictError) {
          return reply.code(409).send({ error: error.message });
        }
        if (
          error instanceof TrainerProfileUpdateError ||
          error instanceof TrainerProfileCompensationError
        ) {
          request.log.error({
            category:
              error instanceof TrainerProfileCompensationError
                ? 'trainer_profile_compensation_failed'
                : 'trainer_profile_update_failed',
          });
          return reply.code(500).send({ error: 'Não foi possível atualizar o perfil.' });
        }
        throw error;
      }
    },
  );

  app.post(
    '/trainers/onboarding',
    {
      preHandler: [app.requireAuth, app.requireRole('trainer')],
      schema: {
        tags: ['trainers'],
        response: {
          200: z.object({
            onboardedAt: z
              .union([z.string().datetime(), z.date()])
              .transform((value) => (value instanceof Date ? value.toISOString() : value)),
          }),
        },
      },
    },
    async (request) => {
      const identityUpdater = new BetterAuthTrainerIdentityUpdater(app.auth, request.headers);
      return makeTrainersModule(identityUpdater).completeOnboarding.execute(request.identity);
    },
  );
};
