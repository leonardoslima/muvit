import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../env.js';
import type {
  PresignUploadInput,
  PresignUploadResult,
  UploadContentType,
  UploadKind,
  UploadSigner,
} from './use-cases/presign-upload.js';

const fileExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
} satisfies Record<UploadContentType, string>;

function createObjectKey(kind: UploadKind, userId: string, contentType: UploadContentType) {
  return `${kind}/${userId}/${randomUUID()}.${fileExtensions[contentType]}`;
}

export class R2UploadSigner implements UploadSigner {
  private readonly s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  async presign(input: PresignUploadInput & { userId: string }): Promise<PresignUploadResult> {
    const key = createObjectKey(input.kind, input.userId, input.contentType);
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ContentType: input.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 5 * 60 });
    const publicBaseUrl = env.R2_PUBLIC_URL.replace(/\/$/, '');

    return {
      uploadUrl,
      publicUrl: `${publicBaseUrl}/${key}`,
      fields: {},
    };
  }
}
