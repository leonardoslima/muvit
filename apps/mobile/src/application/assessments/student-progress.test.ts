import { describe, expect, it } from 'vitest';
import type { Assessment } from './assessment-data';
import { buildStudentProgressReadout } from './student-progress';

function assessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    studentId: '22222222-2222-4222-8222-222222222222',
    date: '2026-10-14',
    weightKg: null,
    heightCm: null,
    bodyFatPct: null,
    measurements: null,
    photos: null,
    notes: null,
    createdAt: '2026-10-14T12:00:00.000Z',
    ...overrides,
  };
}

describe('buildStudentProgressReadout', () => {
  it('formata a data em DD/MM/AAAA e mantém o fallback recebido', () => {
    expect(buildStudentProgressReadout(assessment()).dateLabel).toBe('14/10/2026');
    expect(buildStudentProgressReadout(assessment({ date: 'data não informada' })).dateLabel).toBe(
      'data não informada',
    );
  });

  it('formata decimais com vírgula e unidades de peso e gordura', () => {
    const readout = buildStudentProgressReadout(
      assessment({ weightKg: '82.5', bodyFatPct: 19.25 }),
    );

    expect(readout.weightLabel).toBe('82,5 kg');
    expect(readout.bodyFatLabel).toBe('19,25% de gordura');
  });

  it('não inventa zero para medidas nulas ou inválidas', () => {
    const readout = buildStudentProgressReadout(
      assessment({ weightKg: 'inválido', bodyFatPct: Number.NaN }),
    );

    expect(readout.weightLabel).toBe('— kg');
    expect(readout.bodyFatLabel).toBe('—% de gordura');
  });

  it('preserva zero como valor válido de gordura corporal', () => {
    expect(buildStudentProgressReadout(assessment({ bodyFatPct: 0 })).bodyFatLabel).toBe(
      '0% de gordura',
    );
  });

  it('formata medidas parciais sem criar comparações sem referência', () => {
    const readout = buildStudentProgressReadout(
      assessment({ weightKg: 78.5, heightCm: '170.4', bodyFatPct: null }),
    );

    expect(readout.weightLabel).toBe('78,5 kg');
    expect(readout.heightLabel).toBe('170,4 cm');
    expect(readout.bodyFatLabel).toBe('—% de gordura');
    expect(readout.weightComparison).toBeUndefined();
    expect(readout.bodyFatComparison).toBeUndefined();
  });

  it('compara apenas os valores válidos da avaliação adjacente', () => {
    const readout = buildStudentProgressReadout(
      assessment({ weightKg: 80, bodyFatPct: 19 }),
      assessment({ weightKg: 82, bodyFatPct: 21 }),
    );

    expect(readout.weightComparison).toBe('2 kg a menos');
    expect(readout.bodyFatComparison).toBe('2 p.p. a menos');
  });

  it('exibe comparação neutra para peso sem alteração', () => {
    const readout = buildStudentProgressReadout(
      assessment({ weightKg: 80 }),
      assessment({ weightKg: 80 }),
    );

    expect(readout.weightComparison).toBe('Sem alteração em kg');
  });

  it('omite comparação quando o registro adjacente não tem a métrica', () => {
    const readout = buildStudentProgressReadout(
      assessment({ weightKg: 80, bodyFatPct: 19 }),
      assessment({ weightKg: null, bodyFatPct: null }),
    );

    expect(readout.weightComparison).toBeUndefined();
    expect(readout.bodyFatComparison).toBeUndefined();
  });
});
