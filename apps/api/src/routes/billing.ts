import {
  billingInvoiceSchema,
  trainerSubscriptionSchema,
  updateTrainerSubscriptionSchema,
} from '@muvit/validators';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { makeBillingModule } from '../modules/billing/factory.js';
import { sendUseCaseError } from '../shared/http-error.js';

const planCatalogEntrySchema = z.object({
  activeStudentLimit: z.number().int().positive().nullable(),
  monthlyPriceCents: z.number().int().nonnegative(),
  annualPriceCents: z.number().int().nonnegative(),
});

const subscriptionOverviewSchema = z.object({
  catalog: z.object({
    free: planCatalogEntrySchema,
    starter: planCatalogEntrySchema,
    pro: planCatalogEntrySchema,
    team: planCatalogEntrySchema,
  }),
  subscription: trainerSubscriptionSchema,
  usage: z.object({
    activeStudents: z.number().int().nonnegative(),
    activeStudentLimit: z.number().int().positive().nullable(),
  }),
  invoices: z.array(billingInvoiceSchema),
});

export const billingRoutes: FastifyPluginAsyncZod = async (app) => {
  const billingModule = makeBillingModule();
  app.addHook('preHandler', app.requireAuth);

  app.get(
    '/trainers/me/subscription',
    {
      preHandler: [app.requireRole('trainer')],
      schema: {
        operationId: 'getTrainerSubscription',
        tags: ['billing'],
        response: { 200: subscriptionOverviewSchema },
      },
    },
    async (request, reply) => {
      try {
        return await billingModule.getSubscription.execute(request.identity.profileId);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.patch(
    '/trainers/me/subscription',
    {
      preHandler: [app.requireRole('trainer')],
      schema: {
        operationId: 'updateTrainerSubscription',
        tags: ['billing'],
        body: updateTrainerSubscriptionSchema,
        response: {
          200: z.object({
            subscription: trainerSubscriptionSchema,
            invoice: billingInvoiceSchema.nullable(),
          }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        return await billingModule.updateSubscription.execute(request.identity, request.body);
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );

  app.get(
    '/trainers/me/invoices/:id',
    {
      preHandler: [app.requireRole('trainer')],
      schema: {
        operationId: 'getTrainerInvoice',
        tags: ['billing'],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: billingInvoiceSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        return await billingModule.getInvoice.execute(
          request.params.id,
          request.identity.profileId,
        );
      } catch (error) {
        return sendUseCaseError(reply, error);
      }
    },
  );
};
