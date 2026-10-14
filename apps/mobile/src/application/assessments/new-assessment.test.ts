import { describe, expect, it, vi } from 'vitest';
import {
  buildAssessmentPayload,
  normalizeAssessmentPhotoSelection,
  submitAssessment,
  toOptionalNumber,
  toSupportedContentType,
  type AssessmentPhotoInput,
} from './new-assessment';

function photo(uri: string, contentType: AssessmentPhotoInput['contentType'] = 'image/jpeg') {
  return { uri, contentType };
}

function createDeferredPromise<T>() {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve(value: T) {
      if (!resolvePromise) throw new Error('Promise resolver is unavailable');
      resolvePromise(value);
    },
  };
}

describe('new assessment service', () => {
  it('normalizes optional numbers and content types', () => {
    expect(toOptionalNumber('12,5')).toBe(12.5);
    expect(toOptionalNumber('abc')).toBeUndefined();
    expect(toSupportedContentType('image/jpeg')).toBe('image/jpeg');
    expect(toSupportedContentType('image/gif')).toBeNull();
  });

  it('normalizes JPEG and PNG selections in order without deduplicating', () => {
    expect(
      normalizeAssessmentPhotoSelection([
        { uri: 'file://front.jpg', mimeType: 'image/jpeg' },
        { uri: 'file://front.jpg', mimeType: 'image/jpeg' },
        { uri: 'file://side.png', mimeType: 'image/png' },
      ]),
    ).toEqual([
      { uri: 'file://front.jpg', contentType: 'image/jpeg' },
      { uri: 'file://front.jpg', contentType: 'image/jpeg' },
      { uri: 'file://side.png', contentType: 'image/png' },
    ]);
  });

  it('rejects the whole selection when an asset has no URI or supported MIME type', () => {
    expect(
      normalizeAssessmentPhotoSelection([
        { uri: 'file://valid.jpg', mimeType: 'image/jpeg' },
        { uri: 'file://unsupported.gif', mimeType: 'image/gif' },
      ]),
    ).toBeNull();
    expect(
      normalizeAssessmentPhotoSelection([
        { uri: 'file://valid.jpg', mimeType: 'image/jpeg' },
        { mimeType: 'image/png' },
      ]),
    ).toBeNull();
  });

  it('builds payload with photo URLs and trimmed notes', () => {
    expect(
      buildAssessmentPayload({
        date: '2026-06-11',
        weightKg: '80,5',
        bodyFatPct: '',
        notes: '  Evoluiu  ',
        photoUrls: ['https://cdn.test/photo.jpg'],
      }),
    ).toEqual({
      date: '2026-06-11',
      weightKg: 80.5,
      bodyFatPct: undefined,
      photos: ['https://cdn.test/photo.jpg'],
      notes: 'Evoluiu',
    });
  });

  it('leaves photos undefined when there are no uploaded URLs', () => {
    expect(
      buildAssessmentPayload({
        date: '2026-06-11',
        weightKg: '',
        bodyFatPct: '',
        notes: '',
        photoUrls: [],
      }),
    ).toEqual({
      date: '2026-06-11',
      weightKg: undefined,
      bodyFatPct: undefined,
      photos: undefined,
      notes: undefined,
    });
  });

  it('submits assessment and invalidates the assessments query after upload', async () => {
    const events: string[] = [];
    const api = {
      request: vi.fn().mockImplementation(() => {
        events.push('post');
        return Promise.resolve(undefined);
      }),
    };
    const uploadPhoto = vi.fn().mockImplementation(async (input: AssessmentPhotoInput) => {
      events.push(`upload:${input.uri}`);
      return 'https://cdn.test/photo.jpg';
    });
    const invalidateAssessments = vi.fn().mockImplementation(() => {
      events.push('invalidate');
      return Promise.resolve();
    });

    await submitAssessment({
      api,
      values: {
        date: '2026-06-11',
        weightKg: '80',
        bodyFatPct: '20',
        notes: '',
        photos: [photo('file://photo.jpg')],
      },
      uploadPhoto,
      invalidateAssessments,
    });

    expect(uploadPhoto).toHaveBeenCalledWith({
      uri: 'file://photo.jpg',
      contentType: 'image/jpeg',
    });
    expect(api.request).toHaveBeenCalledWith('/students/me/assessments', {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-06-11',
        weightKg: 80,
        bodyFatPct: 20,
        photos: ['https://cdn.test/photo.jpg'],
        notes: undefined,
      }),
    });
    expect(invalidateAssessments).toHaveBeenCalledWith();
    expect(events).toEqual(['upload:file://photo.jpg', 'post', 'invalidate']);
  });

  it('uploads eight photos sequentially in order before creating and invalidating', async () => {
    const events: string[] = [];
    const uploadedUris: string[] = [];
    const photos = Array.from({ length: 8 }, (_, index) => photo(`file://photo-${index + 1}.jpg`));
    const uploadPromises = Array.from({ length: 8 }, () => createDeferredPromise<string>());
    const uploadStarts = Array.from({ length: 8 }, () => createDeferredPromise<void>());
    let activeUploads = 0;
    let maxActiveUploads = 0;
    const api = {
      request: vi.fn().mockImplementation(() => {
        events.push('post');
        return Promise.resolve(undefined);
      }),
    };
    const uploadPhoto = vi.fn().mockImplementation((input: AssessmentPhotoInput) => {
      const uploadIndex = uploadedUris.length;
      const uploadNumber = uploadIndex + 1;
      events.push(`upload-${uploadNumber}`);
      uploadedUris.push(input.uri);
      activeUploads += 1;
      maxActiveUploads = Math.max(maxActiveUploads, activeUploads);
      uploadStarts[uploadIndex].resolve(undefined);
      return uploadPromises[uploadIndex].promise.finally(() => {
        activeUploads -= 1;
      });
    });
    const invalidateAssessments = vi.fn().mockImplementation(() => {
      events.push('invalidate');
      return Promise.resolve();
    });

    const submission = submitAssessment({
      api,
      values: {
        date: '2026-06-11',
        weightKg: '80',
        bodyFatPct: '20',
        notes: '',
        photos,
      },
      uploadPhoto,
      invalidateAssessments,
    });

    expect(uploadPhoto).toHaveBeenCalledTimes(1);
    expect(uploadedUris).toEqual(['file://photo-1.jpg']);
    expect(activeUploads).toBe(1);
    expect(maxActiveUploads).toBe(1);

    for (let index = 0; index < uploadPromises.length; index += 1) {
      expect(activeUploads).toBe(1);
      uploadPromises[index].resolve(`https://cdn.test/photo-${index + 1}.jpg`);

      if (index < uploadPromises.length - 1) {
        await uploadStarts[index + 1].promise;
        expect(uploadPhoto).toHaveBeenCalledTimes(index + 2);
        expect(activeUploads).toBe(1);
        expect(maxActiveUploads).toBe(1);
      }
    }

    await submission;

    expect(uploadPhoto).toHaveBeenCalledTimes(8);
    expect(activeUploads).toBe(0);
    expect(maxActiveUploads).toBe(1);
    expect(uploadedUris).toEqual([
      'file://photo-1.jpg',
      'file://photo-2.jpg',
      'file://photo-3.jpg',
      'file://photo-4.jpg',
      'file://photo-5.jpg',
      'file://photo-6.jpg',
      'file://photo-7.jpg',
      'file://photo-8.jpg',
    ]);
    expect(api.request).toHaveBeenCalledWith('/students/me/assessments', {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-06-11',
        weightKg: 80,
        bodyFatPct: 20,
        photos: [
          'https://cdn.test/photo-1.jpg',
          'https://cdn.test/photo-2.jpg',
          'https://cdn.test/photo-3.jpg',
          'https://cdn.test/photo-4.jpg',
          'https://cdn.test/photo-5.jpg',
          'https://cdn.test/photo-6.jpg',
          'https://cdn.test/photo-7.jpg',
          'https://cdn.test/photo-8.jpg',
        ],
        notes: undefined,
      }),
    });
    expect(invalidateAssessments).toHaveBeenCalledOnce();
    expect(events).toEqual([
      'upload-1',
      'upload-2',
      'upload-3',
      'upload-4',
      'upload-5',
      'upload-6',
      'upload-7',
      'upload-8',
      'post',
      'invalidate',
    ]);
  });

  it('does not create or invalidate when the second photo upload fails', async () => {
    const events: string[] = [];
    let uploadNumber = 0;
    const api = { request: vi.fn().mockResolvedValue(undefined) };
    const uploadPhoto = vi.fn().mockImplementation(async () => {
      uploadNumber += 1;
      events.push(`upload-${uploadNumber}`);
      if (uploadNumber === 2) throw new Error('upload failed');
      return `https://cdn.test/photo-${uploadNumber}.jpg`;
    });
    const invalidateAssessments = vi.fn().mockResolvedValue(undefined);

    await expect(
      submitAssessment({
        api,
        values: {
          date: '2026-06-11',
          weightKg: '80',
          bodyFatPct: '20',
          notes: '',
          photos: [photo('file://1.jpg'), photo('file://2.jpg'), photo('file://3.jpg')],
        },
        uploadPhoto,
        invalidateAssessments,
      }),
    ).rejects.toThrow('upload failed');

    expect(uploadPhoto).toHaveBeenCalledTimes(2);
    expect(api.request).not.toHaveBeenCalled();
    expect(invalidateAssessments).not.toHaveBeenCalled();
    expect(events).toEqual(['upload-1', 'upload-2']);
  });

  it('submits assessment without upload when photos are absent', async () => {
    const api = { request: vi.fn().mockResolvedValue(undefined) };
    const uploadPhoto = vi.fn().mockResolvedValue('https://cdn.test/photo.jpg');
    const invalidateAssessments = vi.fn().mockResolvedValue(undefined);

    await submitAssessment({
      api,
      values: {
        date: '2026-06-11',
        weightKg: '',
        bodyFatPct: '',
        notes: '',
        photos: [],
      },
      uploadPhoto,
      invalidateAssessments,
    });

    expect(uploadPhoto).not.toHaveBeenCalled();
    expect(api.request).toHaveBeenCalledWith('/students/me/assessments', {
      method: 'POST',
      body: JSON.stringify({ date: '2026-06-11' }),
    });
  });

  it('does not invalidate assessments when request rejects', async () => {
    const api = { request: vi.fn().mockRejectedValue(new Error('request failed')) };
    const uploadPhoto = vi.fn().mockResolvedValue('https://cdn.test/photo.jpg');
    const invalidateAssessments = vi.fn().mockResolvedValue(undefined);

    await expect(
      submitAssessment({
        api,
        values: {
          date: '2026-06-11',
          weightKg: '80',
          bodyFatPct: '20',
          notes: '',
          photos: [],
        },
        uploadPhoto,
        invalidateAssessments,
      }),
    ).rejects.toThrow('request failed');

    expect(api.request).toHaveBeenCalledTimes(1);
    expect(invalidateAssessments).not.toHaveBeenCalled();
  });

  it('propagates invalidation failure without repeating the create request', async () => {
    const api = { request: vi.fn().mockResolvedValue(undefined) };
    const uploadPhoto = vi.fn().mockResolvedValue('https://cdn.test/photo.jpg');
    const invalidateAssessments = vi.fn().mockRejectedValue(new Error('invalidation failed'));

    await expect(
      submitAssessment({
        api,
        values: {
          date: '2026-06-11',
          weightKg: '80',
          bodyFatPct: '20',
          notes: '',
          photos: [],
        },
        uploadPhoto,
        invalidateAssessments,
      }),
    ).rejects.toThrow('invalidation failed');

    expect(api.request).toHaveBeenCalledTimes(1);
    expect(invalidateAssessments).toHaveBeenCalledTimes(1);
  });
});
