import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { env } from '../env.js';

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

const fileExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
} satisfies Record<z.infer<typeof uploadContentTypeSchema>, string>;

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

function createObjectKey(
  kind: z.infer<typeof uploadKindSchema>,
  userId: string,
  contentType: z.infer<typeof uploadContentTypeSchema>,
) {
  return `${kind}/${userId}/${randomUUID()}.${fileExtensions[contentType]}`;
}

export const uploadsRoutes: FastifyPluginAsyncZod = async (app) => {
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
    async (req) => {
      const key = createObjectKey(req.body.kind, req.user.sub, req.body.contentType);
      const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        ContentType: req.body.contentType,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 5 * 60 });
      const publicBaseUrl = env.R2_PUBLIC_URL.replace(/\/$/, '');

      return {
        uploadUrl,
        publicUrl: `${publicBaseUrl}/${key}`,
        fields: {},
      };
    },
  );
};
