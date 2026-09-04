import { describe, expect, it } from 'vitest';
import {
  buildCreateAssessmentInput,
  calculateBmi,
  emptyTrainerAssessmentMeasurements,
} from './assessment-form';
import type { TrainerAssessmentFormValues } from './assessment-form';

function validFormValues(): TrainerAssessmentFormValues {
  return {
    date: '2026-09-03',
    weightKg: '',
    heightCm: '',
    bodyFatPct: '',
    measurements: emptyTrainerAssessmentMeasurements(),
    notes: '',
  };
}

const measurementLabels = [
  { key: 'chest', label: 'Peito' },
  { key: 'waist', label: 'Cintura' },
  { key: 'hip', label: 'Quadril' },
  { key: 'armRight', label: 'Braço direito' },
  { key: 'armLeft', label: 'Braço esquerdo' },
  { key: 'thighRight', label: 'Coxa direita' },
  { key: 'thighLeft', label: 'Coxa esquerda' },
  { key: 'calfRight', label: 'Panturrilha direita' },
  { key: 'calfLeft', label: 'Panturrilha esquerda' },
] as const;

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

  it('aceita número decimal com ponto', () => {
    const result = buildCreateAssessmentInput(
      {
        ...validFormValues(),
        weightKg: '82.5',
        heightCm: '178.5',
        bodyFatPct: '18.4',
        measurements: {
          ...emptyTrainerAssessmentMeasurements(),
          chest: '101.5',
        },
      },
      [],
    );

    expect(result).toEqual({
      ok: true,
      body: {
        date: '2026-09-03',
        weightKg: 82.5,
        heightCm: 178.5,
        bodyFatPct: 18.4,
        measurements: { chest: 101.5 },
      },
    });
  });

  it('localiza data inválida em pt-BR', () => {
    const result = buildCreateAssessmentInput({ ...validFormValues(), date: '2026-02-30' }, []);

    expect(result).toEqual({
      ok: false,
      message: 'Informe uma data válida.',
    });
  });

  it('localiza limite máximo de peso em pt-BR', () => {
    const result = buildCreateAssessmentInput({ ...validFormValues(), weightKg: '501' }, []);

    expect(result).toEqual({
      ok: false,
      message: 'Peso está fora dos limites permitidos.',
    });
  });

  it('localiza limite máximo de altura em pt-BR', () => {
    const result = buildCreateAssessmentInput({ ...validFormValues(), heightCm: '301' }, []);

    expect(result).toEqual({
      ok: false,
      message: 'Altura está fora dos limites permitidos.',
    });
  });

  it('localiza limites de gordura corporal em pt-BR', () => {
    const result = buildCreateAssessmentInput({ ...validFormValues(), bodyFatPct: '81' }, []);

    expect(result).toEqual({
      ok: false,
      message: 'Gordura corporal está fora dos limites permitidos.',
    });
  });

  it.each(measurementLabels)('localiza medida $label não positiva em pt-BR', ({ key, label }) => {
    const values = validFormValues();
    values.measurements = { ...values.measurements, [key]: '0' };

    const result = buildCreateAssessmentInput(values, []);

    expect(result).toEqual({
      ok: false,
      message: `${label} deve ser maior que zero.`,
    });
  });

  it('localiza URL de foto inválida em pt-BR', () => {
    const result = buildCreateAssessmentInput(validFormValues(), ['foto-invalida']);

    expect(result).toEqual({
      ok: false,
      message: 'A foto informada deve ser uma URL válida.',
    });
  });

  it('localiza observações longas em pt-BR', () => {
    const result = buildCreateAssessmentInput(
      { ...validFormValues(), notes: 'a'.repeat(2001) },
      [],
    );

    expect(result).toEqual({
      ok: false,
      message: 'As observações excedem o limite permitido.',
    });
  });

  it('calcula IMC somente com peso e altura válidos', () => {
    expect(calculateBmi('82,5', '178')).toBeCloseTo(26.04, 2);
    expect(calculateBmi('', '178')).toBeNull();
    expect(calculateBmi('82', '0')).toBeNull();
    expect(calculateBmi('abc', '178')).toBeNull();
  });
});
