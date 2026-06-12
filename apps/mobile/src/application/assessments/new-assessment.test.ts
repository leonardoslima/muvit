import { describe, expect, it, vi } from 'vitest';
import {
  buildAssessmentPayload,
  submitAssessment,
  toOptionalNumber,
  toSupportedContentType,
} from './new-assessment';

describe('new assessment service', () => {
  it('normalizes optional numbers and content types', () => {
    expect(toOptionalNumber('12,5')).toBe(12.5);
    expect(toOptionalNumber('abc')).toBeUndefined();
    expect(toSupportedContentType('image/jpeg')).toBe('image/jpeg');
    expect(toSupportedContentType('image/gif')).toBeNull();
  });

  it('builds payload with optional photo and trimmed notes', () => {
    expect(
      buildAssessmentPayload({
        date: '2026-06-11',
        weightKg: '80,5',
        bodyFatPct: '',
        notes: '  Evoluiu  ',
        photoUrl: 'https://cdn.test/photo.jpg',
      }),
    ).toEqual({
      date: '2026-06-11',
      weightKg: 80.5,
      bodyFatPct: undefined,
      photos: ['https://cdn.test/photo.jpg'],
      notes: 'Evoluiu',
    });
  });

  it('submits assessment and invalidates the assessments query', async () => {
    const api = { request: vi.fn().mockResolvedValue(undefined) };
    const uploadPhoto = vi.fn().mockResolvedValue('https://cdn.test/photo.jpg');
    const invalidateAssessments = vi.fn().mockResolvedValue(undefined);

    await submitAssessment({
      api,
      userId: 'student-id',
      values: {
        date: '2026-06-11',
        weightKg: '80',
        bodyFatPct: '20',
        notes: '',
        photo: { uri: 'file://photo.jpg', contentType: 'image/jpeg' },
      },
      uploadPhoto,
      invalidateAssessments,
    });

    expect(uploadPhoto).toHaveBeenCalledWith({
      uri: 'file://photo.jpg',
      contentType: 'image/jpeg',
    });
    expect(api.request).toHaveBeenCalledWith('/students/student-id/assessments', {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-06-11',
        weightKg: 80,
        bodyFatPct: 20,
        photos: ['https://cdn.test/photo.jpg'],
        notes: undefined,
      }),
    });
    expect(invalidateAssessments).toHaveBeenCalledWith('student-id');
  });

  it('submits assessment without upload when photo is absent', async () => {
    const api = { request: vi.fn().mockResolvedValue(undefined) };
    const uploadPhoto = vi.fn().mockResolvedValue('https://cdn.test/photo.jpg');
    const invalidateAssessments = vi.fn().mockResolvedValue(undefined);

    await submitAssessment({
      api,
      userId: 'student-id',
      values: {
        date: '2026-06-11',
        weightKg: '',
        bodyFatPct: '',
        notes: '',
      },
      uploadPhoto,
      invalidateAssessments,
    });

    expect(uploadPhoto).not.toHaveBeenCalled();
    expect(api.request).toHaveBeenCalledWith('/students/student-id/assessments', {
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
        userId: 'student-id',
        values: {
          date: '2026-06-11',
          weightKg: '80',
          bodyFatPct: '20',
          notes: '',
        },
        uploadPhoto,
        invalidateAssessments,
      }),
    ).rejects.toThrow('request failed');

    expect(invalidateAssessments).not.toHaveBeenCalled();
  });
});
