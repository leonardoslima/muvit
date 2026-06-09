import { describe, expect, it, vi } from 'vitest';
import { type UploadApiClient, type UploadFetcher, uploadAssessmentPhoto } from './uploads';

describe('uploadAssessmentPhoto', () => {
  it('presigns, uploads the local file and returns the public URL', async () => {
    const api = {
      request: vi.fn<UploadApiClient['request']>().mockResolvedValue({
        uploadUrl: 'https://r2.example.com/upload',
        publicUrl: 'https://cdn.example.com/avatar/user/photo.jpg',
        fields: {},
      }),
    };
    const fetcher = vi
      .fn<UploadFetcher>()
      .mockResolvedValueOnce(new Response('image-bytes'))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const publicUrl = await uploadAssessmentPhoto({
      api,
      fetcher,
      photo: { uri: 'file:///photo.jpg', contentType: 'image/jpeg' },
    });

    expect(publicUrl).toBe('https://cdn.example.com/avatar/user/photo.jpg');
    expect(api.request).toHaveBeenCalledWith('/uploads/presign', {
      method: 'POST',
      body: JSON.stringify({ kind: 'assessment-photo', contentType: 'image/jpeg' }),
    });
    expect(fetcher).toHaveBeenNthCalledWith(1, 'file:///photo.jpg');
    expect(fetcher).toHaveBeenNthCalledWith(2, 'https://r2.example.com/upload', {
      method: 'PUT',
      headers: { 'content-type': 'image/jpeg' },
      body: expect.any(Blob),
    });
  });
});
