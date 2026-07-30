import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { makeUploadsModule } from '../modules/uploads/factory.js';

const uploadKindSchema = z.enum(['assessment-photo', 'avatar']);
const uploadContentTypeSchema = z.enum(['image/jpeg', 'image/png']);

const presignUploadBodySchema = z.object({
  kind: uploadKindSchema,
  contentType: uploadContentTypeSchema,
});

const presignUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
  fields: z.object({}),
});

export const uploadsRoutes: FastifyPluginAsyncZod = async (app) => {
  const uploadsModule = makeUploadsModule();

  app.post(
    '/uploads/presign',
    {
      preHandler: [app.requireAuth],
      schema: {
        tags: ['uploads'],
        body: presignUploadBodySchema,
        response: { 200: presignUploadResponseSchema },
      },
    },
    async (req) => uploadsModule.presignUpload.execute(req.identity.profileId, req.body),
  );
};
