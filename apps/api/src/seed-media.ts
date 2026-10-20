import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { DemoIdentities, DemoMedia } from '@muvit/db/seed';
import { env } from './env.js';
import { createUploadObjectKey } from './modules/uploads/object-key.js';
import type { UploadKind } from './modules/uploads/use-cases/presign-upload.js';

type DemoMediaDependencies = {
  publicBaseUrl: string;
  readAsset(path: string): Promise<Uint8Array>;
  putObject(key: string, body: Uint8Array, metadata: Record<string, string>): Promise<void>;
  fetchPublic(url: string): Promise<Response>;
};

const demoAssets = [
  { name: 'avatar', kind: 'avatar', path: '../../../apps/mobile/assets/icon.png' },
  {
    name: 'front',
    kind: 'assessment-photo',
    path: '../../../assets/design/assessment-photo-samples/assessment-front.png',
  },
  {
    name: 'side',
    kind: 'assessment-photo',
    path: '../../../assets/design/assessment-photo-samples/assessment-side.png',
  },
  {
    name: 'back',
    kind: 'assessment-photo',
    path: '../../../assets/design/assessment-photo-samples/assessment-back.png',
  },
] as const satisfies readonly { name: string; kind: UploadKind; path: string }[];

const digest = (body: Uint8Array): string => createHash('sha256').update(body).digest('hex');

async function prepareProfileMedia(
  profileId: string,
  dependencies: DemoMediaDependencies,
): Promise<Pick<DemoMedia, 'avatarUrl' | 'assessmentPhotos'>> {
  const urls = new Map<string, string>();
  for (const { name, kind, path } of demoAssets) {
    const body = await dependencies.readAsset(fileURLToPath(new URL(path, import.meta.url)));
    const hash = digest(body);
    const key = createUploadObjectKey(kind, profileId, 'image/png', hash.slice(0, 32));
    const url = `${dependencies.publicBaseUrl.replace(/\/$/, '')}/${key}`;
    await dependencies.putObject(key, body, {
      source: 'muvit-seed',
      'seed-version': '2',
      asset: name,
      'profile-id': profileId,
      sha256: hash,
    });
    const response = await dependencies.fetchPublic(url);
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
      throw new Error(`Imagem demo indisponível publicamente: ${name} (HTTP ${response.status}).`);
    }
    if (digest(new Uint8Array(await response.arrayBuffer())) !== hash) {
      throw new Error(`Conteúdo público da imagem demo divergente: ${name}.`);
    }
    urls.set(name, url);
  }
  const avatarUrl = urls.get('avatar');
  const front = urls.get('front');
  const side = urls.get('side');
  const back = urls.get('back');
  if (!avatarUrl || !front || !side || !back) throw new Error('Imagens demo incompletas.');
  return { avatarUrl, assessmentPhotos: [front, side, back] };
}

export async function prepareDemoMedia(
  identities: DemoIdentities,
  dependencies: DemoMediaDependencies,
): Promise<DemoMedia> {
  const trainer = await prepareProfileMedia(identities.trainer.profileId, dependencies);
  const independentStudent = await prepareProfileMedia(
    identities.independentStudent.profileId,
    dependencies,
  );
  return { ...trainer, independentStudent };
}

export async function publishDemoMedia(identities: DemoIdentities): Promise<DemoMedia> {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  try {
    return await prepareDemoMedia(identities, {
      publicBaseUrl: env.R2_PUBLIC_URL,
      readAsset: readFile,
      putObject: async (
        key: string,
        body: Uint8Array,
        metadata: Record<string, string>,
      ): Promise<void> => {
        await client.send(
          new PutObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: key,
            Body: body,
            ContentType: 'image/png',
            CacheControl: 'public, max-age=31536000, immutable',
            Metadata: metadata,
          }),
        );
      },
      fetchPublic: (url: string): Promise<Response> =>
        fetch(url, { signal: AbortSignal.timeout(30_000) }),
    });
  } finally {
    client.destroy();
  }
}
