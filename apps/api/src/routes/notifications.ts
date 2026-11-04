import {
  notificationPreferencesSchema,
  updateNotificationPreferencesSchema,
} from '@muvit/validators';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { makeNotificationsModule } from '../modules/notifications/factory.js';

export const notificationsRoutes: FastifyPluginAsyncZod = async (app) => {
  const notificationsModule = makeNotificationsModule(app.log);
  app.addHook('preHandler', app.requireAuth);

  app.get(
    '/trainers/me/notification-preferences',
    {
      preHandler: [app.requireRole('trainer')],
      schema: {
        operationId: 'getTrainerNotificationPreferences',
        tags: ['notifications'],
        response: { 200: notificationPreferencesSchema },
      },
    },
    async (request) => notificationsModule.getPreferences.execute(request.identity.profileId),
  );

  app.patch(
    '/trainers/me/notification-preferences',
    {
      preHandler: [app.requireRole('trainer')],
      schema: {
        operationId: 'updateTrainerNotificationPreferences',
        tags: ['notifications'],
        body: updateNotificationPreferencesSchema,
        response: { 200: notificationPreferencesSchema },
      },
    },
    async (request) =>
      notificationsModule.updatePreferences.execute(request.identity.profileId, request.body),
  );
};
