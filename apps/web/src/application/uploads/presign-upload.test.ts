import { describe, expect, it, vi } from 'vitest';
import { presignUpload } from './presign-upload';

describe('presignUpload', () => {
  it('posts to the API base URL with configured headers', async () => {
    const client = {
      getConfig: () => ({
        baseUrl: 'https://api.muvit.test/',
        headers: { authorization: 'Bearer token' },
      }),
    };
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          uploadUrl: 'https://r2.test/upload',
          publicUrl: 'https://cdn.test/photo.jpg',
          fields: {},
        }),
        { status: 200 },
      ),
    );

    await expect(
      presignUpload({
        client,
        body: { kind: 'assessment-photo', contentType: 'image/jpeg' },
        fetcher,
      }),
    ).resolves.toEqual({
      uploadUrl: 'https://r2.test/upload',
      publicUrl: 'https://cdn.test/photo.jpg',
      fields: {},
    });

    expect(fetcher).toHaveBeenCalledWith('https://api.muvit.test/uploads/presign', {
      method: 'POST',
      headers: expect.any(Headers),
      body: JSON.stringify({ kind: 'assessment-photo', contentType: 'image/jpeg' }),
    });
  });

  it('rejects invalid presign payloads', async () => {
    const client = { getConfig: () => ({ baseUrl: 'https://api.muvit.test' }) };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    await expect(
      presignUpload({
        client,
        body: { kind: 'assessment-photo', contentType: 'image/jpeg' },
        fetcher,
      }),
    ).rejects.toThrow('invalid presign response');
  });
});
