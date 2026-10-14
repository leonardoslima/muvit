import { describe, expect, it } from 'vitest';
import { createAssessmentSchema, updateAssessmentSchema } from './assessments.js';

describe('assessment photo validation', () => {
  it('aceita oito e muitas URLs sem teto de produto', () => {
    const eightPhotos = Array.from({ length: 8 }, (_, index) => `https://cdn.test/${index}.jpg`);
    const manyPhotos = Array.from({ length: 100 }, (_, index) => `https://cdn.test/${index}.jpg`);

    expect(
      createAssessmentSchema.safeParse({ date: '2026-10-14', photos: eightPhotos }).success,
    ).toBe(true);
    expect(updateAssessmentSchema.safeParse({ photos: eightPhotos }).success).toBe(true);
    expect(
      createAssessmentSchema.safeParse({ date: '2026-10-14', photos: manyPhotos }).success,
    ).toBe(true);
    expect(updateAssessmentSchema.safeParse({ photos: manyPhotos }).success).toBe(true);
  });

  it.each([
    { description: 'ausência', photos: undefined },
    { description: 'lista vazia', photos: [] },
    { description: 'uma URL', photos: ['https://cdn.test/0.jpg'] },
    {
      description: 'seis URLs',
      photos: Array.from({ length: 6 }, (_, index) => `https://cdn.test/${index}.jpg`),
    },
    {
      description: 'oito URLs',
      photos: Array.from({ length: 8 }, (_, index) => `https://cdn.test/${index}.jpg`),
    },
    {
      description: '100 URLs',
      photos: Array.from({ length: 100 }, (_, index) => `https://cdn.test/${index}.jpg`),
    },
  ])('aceita $description no contrato de criação e atualização', ({ photos }) => {
    const createInput = {
      date: '2026-10-14',
      ...(photos === undefined ? {} : { photos }),
    };
    const updateInput = photos === undefined ? {} : { photos };

    expect(createAssessmentSchema.safeParse(createInput).success).toBe(true);
    expect(updateAssessmentSchema.safeParse(updateInput).success).toBe(true);
  });

  it('preserva validação de URL e limites dos demais campos', () => {
    expect(
      createAssessmentSchema.safeParse({ date: '2026-10-14', photos: ['inválida'] }).success,
    ).toBe(false);
    expect(createAssessmentSchema.safeParse({ date: '2026-10-14', weightKg: 501 }).success).toBe(
      false,
    );
    expect(createAssessmentSchema.safeParse({ date: '2026-10-14', bodyFatPct: 81 }).success).toBe(
      false,
    );
    expect(createAssessmentSchema.safeParse({ date: '2026-02-30' }).success).toBe(false);
    expect(
      createAssessmentSchema.safeParse({ date: '2026-10-14', notes: 'a'.repeat(2001) }).success,
    ).toBe(false);
  });
});
