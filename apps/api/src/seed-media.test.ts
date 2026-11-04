import { describe, expect, it, vi } from 'vitest';
import { prepareDemoMedia } from './seed-media.js';

const identities = {
  trainer: {
    profileId: '20000000-0000-4000-8000-000000000001',
    authUserId: 'auth-trainer',
    email: 'trainer@muvit.dev',
    name: 'Professor Demo',
  },
  independentStudent: {
    profileId: '20000000-0000-4000-8000-000000000002',
    authUserId: 'auth-student',
    email: 'aluno.independente@muvit.dev',
    name: 'Aluno Independente Demo',
  },
};

describe('imagens do seed demo', () => {
  it('publica somente amostras locais e confere todos os bytes nas URLs públicas', async () => {
    const uploads: { key: string; body: Uint8Array; metadata: Record<string, string> }[] = [];
    const result = await prepareDemoMedia(identities, {
      publicBaseUrl: 'https://cdn.muvit.test/',
      readAsset: async (path: string) => Buffer.from(path),
      putObject: async (key: string, body: Uint8Array, metadata: Record<string, string>) => {
        uploads.push({ key, body, metadata });
      },
      fetchPublic: async (url: string) => {
        const item = uploads.find((upload) => url.endsWith(upload.key));
        return new Response(item ? Buffer.from(item.body) : null, {
          status: item ? 200 : 404,
          headers: { 'Content-Type': 'image/png' },
        });
      },
    });

    expect(uploads).toHaveLength(8);
    expect(uploads.every((upload) => upload.metadata.source === 'muvit-seed')).toBe(true);
    for (const identity of Object.values(identities)) {
      expect(
        uploads.filter((upload) => upload.key.startsWith(`avatar/${identity.profileId}/`)),
      ).toHaveLength(1);
      expect(
        uploads.filter((upload) =>
          upload.key.startsWith(`assessment-photo/${identity.profileId}/`),
        ),
      ).toHaveLength(3);
      expect(uploads.some((upload) => upload.key.includes(identity.authUserId))).toBe(false);
    }
    expect(result.avatarUrl).toContain(`/avatar/${identities.trainer.profileId}/`);
    expect(result.independentStudent?.avatarUrl).toContain(
      `/avatar/${identities.independentStudent.profileId}/`,
    );
    expect(result.independentStudent?.assessmentPhotos[0]).toContain(
      `/assessment-photo/${identities.independentStudent.profileId}/`,
    );
    expect(result.assessmentPhotos).toHaveLength(3);
    expect(new Set(result.assessmentPhotos).size).toBe(3);
    expect(result.independentStudent?.assessmentPhotos).toHaveLength(3);
    expect(
      result.assessmentPhotos.map(
        (url) => uploads.find((upload) => url.endsWith(upload.key))?.metadata.asset,
      ),
    ).toEqual(['front', 'side', 'back']);
  });

  it('interrompe antes do seed de banco quando uma imagem não está acessível publicamente', async () => {
    const putObject = vi.fn(async () => undefined);
    await expect(
      prepareDemoMedia(identities, {
        publicBaseUrl: 'https://cdn.muvit.test',
        readAsset: async () => Buffer.from('png'),
        putObject,
        fetchPublic: async () => new Response(null, { status: 404 }),
      }),
    ).rejects.toThrow('Imagem demo indisponível publicamente');
  });

  it('rejeita respostas com conteúdo diferente mesmo quando o status é 200', async () => {
    await expect(
      prepareDemoMedia(identities, {
        publicBaseUrl: 'https://cdn.muvit.test',
        readAsset: async () => Buffer.from('png'),
        putObject: async () => undefined,
        fetchPublic: async () =>
          new Response('outro conteúdo', { headers: { 'Content-Type': 'image/png' } }),
      }),
    ).rejects.toThrow('Conteúdo público da imagem demo divergente');
  });
});
