import { describe, expect, it } from 'vitest';
import {
  buildCreateAssessmentInput,
  calculateBmi,
  emptyTrainerAssessmentMeasurements,
} from './assessment-form';

describe('assessment form', () => {
  it('monta payload completo aceitando vírgula decimal', () => {
    const result = buildCreateAssessmentInput(
      {
        date: '2026-09-03',
        weightKg: '82,5',
        heightCm: '178',
        bodyFatPct: '18,4',
        measurements: {
          ...emptyTrainerAssessmentMeasurements(),
          chest: '101,5',
          waist: '84',
        },
        notes: '  Evolução consistente  ',
      },
      ['https://cdn.test/front.jpg', 'https://cdn.test/back.jpg'],
    );

    expect(result).toEqual({
      ok: true,
      body: {
        date: '2026-09-03',
        weightKg: 82.5,
        heightCm: 178,
        bodyFatPct: 18.4,
        measurements: {
          chest: 101.5,
          waist: 84,
        },
        photos: ['https://cdn.test/front.jpg', 'https://cdn.test/back.jpg'],
        notes: 'Evolução consistente',
      },
    });
  });

  it('omite opcionais vazios e objeto de medidas vazio', () => {
    const result = buildCreateAssessmentInput(
      {
        date: '2026-09-03',
        weightKg: '',
        heightCm: '',
        bodyFatPct: '',
        measurements: emptyTrainerAssessmentMeasurements(),
        notes: '   ',
      },
      [],
    );

    expect(result).toEqual({
      ok: true,
      body: { date: '2026-09-03' },
    });
  });

  it('rejeita conteúdo numérico digitado que não é número', () => {
    const result = buildCreateAssessmentInput(
      {
        date: '2026-09-03',
        weightKg: 'abc',
        heightCm: '',
        bodyFatPct: '',
        measurements: emptyTrainerAssessmentMeasurements(),
        notes: '',
      },
      [],
    );

    expect(result).toEqual({
      ok: false,
      message: 'Peso deve ser um número válido.',
    });
  });

  it('rejeita limites usando createAssessmentSchema', () => {
    const result = buildCreateAssessmentInput(
      {
        date: '2026-09-03',
        weightKg: '501',
        heightCm: '',
        bodyFatPct: '',
        measurements: emptyTrainerAssessmentMeasurements(),
        notes: '',
      },
      [],
    );

    expect(result.ok).toBe(false);
  });

  it('calcula IMC somente com peso e altura válidos', () => {
    expect(calculateBmi('82,5', '178')).toBeCloseTo(26.04, 2);
    expect(calculateBmi('', '178')).toBeNull();
    expect(calculateBmi('82', '0')).toBeNull();
    expect(calculateBmi('abc', '178')).toBeNull();
  });
});
