import { describe, expect, it, vi } from 'vitest';
import { type UploadFetcher, uploadFileWithPresignedUrl } from './uploads';

describe('uploadFileWithPresignedUrl', () => {
  it('uses a presigned URL to upload a file and returns the public URL', async () => {
    const file = new File(['image-bytes'], 'photo.jpg', { type: 'image/jpeg' });
    const presign = vi.fn(async () => ({
      uploadUrl: 'https://r2.example.com/upload',
      publicUrl: 'https://cdn.example.com/assessment-photo/user/photo.jpg',
      fields: {},
    }));
    const fetcher = vi.fn<UploadFetcher>().mockResolvedValue(new Response(null, { status: 200 }));

    const publicUrl = await uploadFileWithPresignedUrl({
      file,
      kind: 'assessment-photo',
      presign,
      fetcher,
    });

    expect(publicUrl).toBe('https://cdn.example.com/assessment-photo/user/photo.jpg');
    expect(presign).toHaveBeenCalledWith({
      kind: 'assessment-photo',
      contentType: 'image/jpeg',
    });
    expect(fetcher).toHaveBeenCalledWith('https://r2.example.com/upload', {
      method: 'PUT',
      headers: { 'content-type': 'image/jpeg' },
      body: file,
    });
  });
});
