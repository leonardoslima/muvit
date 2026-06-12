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

  it('rejects unsupported file types without presigning', async () => {
    const file = new File(['pdf-bytes'], 'file.pdf', { type: 'application/pdf' });
    const presign = vi.fn();
    const fetcher = vi.fn<UploadFetcher>();

    await expect(
      uploadFileWithPresignedUrl({
        file,
        kind: 'assessment-photo',
        presign,
        fetcher,
      }),
    ).rejects.toThrow('Tipo de arquivo nao suportado.');

    expect(presign).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects failed uploads after receiving a presigned URL', async () => {
    const file = new File(['image-bytes'], 'photo.png', { type: 'image/png' });
    const presign = vi.fn(async () => ({
      uploadUrl: 'https://r2.example.com/upload',
      publicUrl: 'https://cdn.example.com/photo.png',
      fields: {},
    }));
    const fetcher = vi.fn<UploadFetcher>().mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      uploadFileWithPresignedUrl({
        file,
        kind: 'avatar',
        presign,
        fetcher,
      }),
    ).rejects.toThrow('Falha ao enviar arquivo.');

    expect(presign).toHaveBeenCalledWith({ kind: 'avatar', contentType: 'image/png' });
  });
});
