import { describe, expect, it } from 'vitest';
import { canCompareAssessmentDates, isAssessmentDateAmbiguous } from './assessment-chronology.js';
import { assessmentListItemSchema, assessmentSchema } from './assessments.js';

describe('cronologia das avaliações', () => {
  it.each([
    ['2026-04-02', 1, '2026-04-01', 1, true],
    ['2026-04-01', 1, '2026-04-01', 1, false],
    ['2026-04-01', 1, '2026-04-02', 1, false],
    ['2026-04-02', 2, '2026-04-01', 1, false],
    ['2026-04-02', 1, '2026-04-01', 3, false],
  ])('compara %s (%s) com %s (%s)', (date, count, previousDate, previousCount, expected) => {
    expect(
      canCompareAssessmentDates(
        { date, dateAssessmentCount: count },
        { date: previousDate, dateAssessmentCount: previousCount },
      ),
    ).toBe(expected);
  });
  it('identifica a ambiguidade pela contagem global', () => {
    expect(isAssessmentDateAmbiguous({ date: '2026-04-01', dateAssessmentCount: 2 })).toBe(true);
    expect(isAssessmentDateAmbiguous({ date: '2026-04-01', dateAssessmentCount: 1 })).toBe(false);
  });
  it('exige contagem inteira positiva apenas na lista', () => {
    const item = {
      id: '00000000-0000-4000-8000-000000000001',
      studentId: '00000000-0000-4000-8000-000000000002',
      date: '2026-04-01',
      weightKg: null,
      heightCm: null,
      bodyFatPct: null,
      measurements: null,
      photos: null,
      notes: null,
      createdAt: new Date('2026-04-01T12:00:00Z'),
    };
    expect(assessmentSchema.safeParse(item).success).toBe(true);
    for (const dateAssessmentCount of [undefined, 0, -1, 1.5]) {
      expect(assessmentListItemSchema.safeParse({ ...item, dateAssessmentCount }).success).toBe(
        false,
      );
    }
    expect(assessmentListItemSchema.parse({ ...item, dateAssessmentCount: 3 })).toMatchObject({
      dateAssessmentCount: 3,
      createdAt: '2026-04-01T12:00:00.000Z',
    });
  });
});
