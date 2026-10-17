import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../env.js';
import { createUploadObjectKey } from './object-key.js';
import type {
  PresignUploadInput,
  PresignUploadResult,
  UploadSigner,
} from './use-cases/presign-upload.js';

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
    const key = createUploadObjectKey(input.kind, input.userId, input.contentType);
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
