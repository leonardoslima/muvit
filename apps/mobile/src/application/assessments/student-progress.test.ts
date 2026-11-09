import { describe, expect, it } from 'vitest';
import type { Assessment } from './assessment-data';
import { buildStudentProgressReadout } from './student-progress';

function assessment(
  overrides: Partial<Assessment & { dateAssessmentCount: number }> = {},
): Assessment & { dateAssessmentCount: number } {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    studentId: '22222222-2222-4222-8222-222222222222',
    date: '2026-10-14',
    dateAssessmentCount: 1,
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
  it.each([78.5, 80])('omite evolução em data empatada com peso %s', (weightKg) => {
    const current = assessment({ weightKg: 80, bodyFatPct: 20, dateAssessmentCount: 2 });
    const previous = assessment({ weightKg, bodyFatPct: 20, dateAssessmentCount: 2 });
    const result = buildStudentProgressReadout(current, previous);
    expect(result.weightComparison).toBeUndefined();
    expect(result.bodyFatComparison).toBeUndefined();
    expect(result.dateAmbiguityMessage).toBeTruthy();
  });
  it('não compara data única com referência ambígua ou desconhecida', () => {
    const current = assessment({ weightKg: 80 });
    const previous = assessment({ date: '2026-10-13', weightKg: 82, dateAssessmentCount: 2 });
    expect(buildStudentProgressReadout(current, previous).weightComparison).toBeUndefined();
    const { dateAssessmentCount: _dateAssessmentCount, ...unknown } = previous;
    expect(buildStudentProgressReadout(current, unknown).weightComparison).toBeUndefined();
  });
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
    expect(readout.bodyFatLabel).toBe('19,25%');
  });

  it('não inventa zero para medidas nulas ou inválidas', () => {
    const readout = buildStudentProgressReadout(
      assessment({ weightKg: 'inválido', bodyFatPct: Number.NaN }),
    );

    expect(readout.weightLabel).toBe('— kg');
    expect(readout.bodyFatLabel).toBe('—%');
  });

  it('preserva zero como valor válido de gordura corporal', () => {
    expect(buildStudentProgressReadout(assessment({ bodyFatPct: 0 })).bodyFatLabel).toBe('0%');
  });

  it('trata peso e gordura vazios ou em branco como ausência, não como zero', () => {
    const readout = buildStudentProgressReadout(
      assessment({ weightKg: '', bodyFatPct: '   ' }),
      assessment({ date: '2026-10-13', weightKg: 82, bodyFatPct: 21 }),
    );

    expect(readout.weightLabel).toBe('— kg');
    expect(readout.bodyFatLabel).toBe('—%');
    expect(readout.weightComparison).toBeUndefined();
    expect(readout.bodyFatComparison).toBeUndefined();
  });

  it('omite comparações quando o valor de referência vazio ou em branco não é numérico', () => {
    const readout = buildStudentProgressReadout(
      assessment({ weightKg: 80, bodyFatPct: 0 }),
      assessment({ date: '2026-10-13', weightKg: '', bodyFatPct: '  ' }),
    );

    expect(readout.weightComparison).toBeUndefined();
    expect(readout.bodyFatComparison).toBeUndefined();
    expect(readout.bodyFatLabel).toBe('0%');
  });

  it('formata medidas parciais sem criar comparações sem referência', () => {
    const readout = buildStudentProgressReadout(
      assessment({ weightKg: 78.5, heightCm: '170.4', bodyFatPct: null }),
    );

    expect(readout.weightLabel).toBe('78,5 kg');
    expect(readout.heightLabel).toBe('170,4 cm');
    expect(readout.bodyFatLabel).toBe('—%');
    expect(readout.weightComparison).toBeUndefined();
    expect(readout.bodyFatComparison).toBeUndefined();
  });

  it('compara apenas os valores válidos da avaliação adjacente', () => {
    const readout = buildStudentProgressReadout(
      assessment({ weightKg: 80, bodyFatPct: 19 }),
      assessment({ date: '2026-10-13', weightKg: 82, bodyFatPct: 21 }),
    );

    expect(readout.weightComparison).toBe('2 kg a menos');
    expect(readout.bodyFatComparison).toBe('2 p.p. a menos');
  });

  it('exibe comparação neutra para peso sem alteração', () => {
    const readout = buildStudentProgressReadout(
      assessment({ weightKg: 80 }),
      assessment({ date: '2026-10-13', weightKg: 80 }),
    );

    expect(readout.weightComparison).toBe('Sem alteração em kg');
  });

  it('omite comparação quando o registro adjacente não tem a métrica', () => {
    const readout = buildStudentProgressReadout(
      assessment({ weightKg: 80, bodyFatPct: 19 }),
      assessment({ date: '2026-10-13', weightKg: null, bodyFatPct: null }),
    );

    expect(readout.weightComparison).toBeUndefined();
    expect(readout.bodyFatComparison).toBeUndefined();
  });
});
