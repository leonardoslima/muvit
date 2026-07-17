import { describe, expect, it } from 'vitest';
import { buildAssessmentPayload } from './assessment-form-data';

function formDataFrom(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe('buildAssessmentPayload', () => {
  it('requires date', () => {
    expect(buildAssessmentPayload(formDataFrom({ date: '' }))).toEqual({
      ok: false,
      state: { error: 'Informe a data.' },
    });
  });

  it('omits measurements when all values are empty', () => {
    const result = buildAssessmentPayload(formDataFrom({ date: '2026-06-11', notes: '  ok  ' }));

    expect(result).toEqual({
      ok: true,
      body: {
        date: '2026-06-11',
        weightKg: undefined,
        heightCm: undefined,
        bodyFatPct: undefined,
        measurements: undefined,
        photos: undefined,
        notes: 'ok',
      },
    });
  });

  it('includes numeric measurements and optional photos', () => {
    const result = buildAssessmentPayload(
      formDataFrom({
        date: '2026-06-11',
        weightKg: '80,5',
        chest: '100',
        calfRight: '37,5',
        calfLeft: '37',
      }),
      ['https://cdn.muvit.test/front.jpg', 'https://cdn.muvit.test/back.jpg'],
    );

    expect(result).toEqual({
      ok: true,
      body: {
        date: '2026-06-11',
        weightKg: 80.5,
        heightCm: undefined,
        bodyFatPct: undefined,
        measurements: {
          chest: 100,
          waist: undefined,
          hip: undefined,
          armRight: undefined,
          armLeft: undefined,
          thighRight: undefined,
          thighLeft: undefined,
          calfRight: 37.5,
          calfLeft: 37,
        },
        photos: ['https://cdn.muvit.test/front.jpg', 'https://cdn.muvit.test/back.jpg'],
        notes: undefined,
      },
    });
  });
});
