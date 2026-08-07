import { describe, expect, it } from 'vitest';
import { reportQuerySchema, studentReportSchema } from './reports.js';

describe('contratos de relatórios', () => {
  it('exige período ordenado para alcance personalizado', () => {
    expect(
      reportQuerySchema.safeParse({ range: 'custom', from: '2026-08-10', to: '2026-08-01' }).success,
    ).toBe(false);
    expect(
      reportQuerySchema.safeParse({ range: 'custom', from: '2026-08-01', to: '2026-08-10' }).success,
    ).toBe(true);
  });

  it('rejeita datas explícitas para alcances predefinidos', () => {
    expect(reportQuerySchema.safeParse({ range: '30d', from: '2026-08-01' }).success).toBe(false);
  });

  it('representa cada seção do relatório com a respectiva suficiência de dados', () => {
    expect(
      studentReportSchema.parse({
        student: { id: '10000000-0000-4000-8000-000000000001', name: 'João', avatarUrl: null },
        period: { range: '30d', from: null, to: null },
        physicalEvolution: {
          hasEnoughData: false,
          points: [],
          changes: { weightKg: null, bodyFatPct: null, waistCm: null, armCm: null },
        },
        beforeAfter: { hasEnoughData: false, before: null, after: null },
        workoutAdherence: { hasEnoughData: false, completed: 0, planned: 0, percentage: null },
        trainingFrequency: { hasEnoughData: false, days: [] },
        topExercises: { hasEnoughData: false, items: [] },
        rpeTrend: { hasEnoughData: false, points: [] },
        summary: 'Ainda não há dados suficientes.',
      }),
    ).toMatchObject({ summary: 'Ainda não há dados suficientes.' });
  });
});
