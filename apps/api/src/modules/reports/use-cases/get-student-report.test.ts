import type { StudentReport } from '@muvit/validators';
import { describe, expect, it } from 'vitest';
import type { RequestIdentity } from '../../../shared/request-identity.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import { resolveReportPeriod } from '../report-period.js';
import { buildReportSummary } from '../report-summary.js';
import type {
  ReportAssessment,
  ReportExerciseSet,
  ReportPlan,
  ReportWorkoutLog,
  ReportsRepository,
} from '../repositories/reports-repository.js';
import { GetStudentReportUseCase } from './get-student-report.js';

describe('resolveReportPeriod', () => {
  const now = new Date('2026-08-07T12:00:00Z');

  it.each([
    ['30d', { from: '2026-07-09', to: '2026-08-07' }],
    ['90d', { from: '2026-05-10', to: '2026-08-07' }],
    ['6m', { from: '2026-02-08', to: '2026-08-07' }],
  ] as const)('resolve %s como período inclusivo em UTC', (range, expected) => {
    expect(resolveReportPeriod({ range }, now)).toEqual(expected);
  });

  it('mantém os limites explícitos do período personalizado', () => {
    expect(
      resolveReportPeriod({ range: 'custom', from: '2026-04-01', to: '2026-04-30' }, now),
    ).toEqual({ from: '2026-04-01', to: '2026-04-30' });
  });

  it('não limita o histórico completo', () => {
    expect(resolveReportPeriod({ range: 'all' }, now)).toEqual({ from: null, to: null });
  });

  it('não deixa o calendário saltar dias ao subtrair seis meses no fim do mês', () => {
    expect(resolveReportPeriod({ range: '6m' }, new Date('2026-08-31T23:59:59Z'))).toEqual({
      from: '2026-03-01',
      to: '2026-08-31',
    });
  });
});

describe('buildReportSummary', () => {
  function report(overrides: Partial<StudentReport> = {}): StudentReport {
    return {
      student: { id: '10000000-0000-4000-8000-000000000001', name: 'João', avatarUrl: null },
      period: { range: '90d', from: '2026-05-10', to: '2026-08-07' },
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
      summary: '',
      ...overrides,
    };
  }

  it('resume a aderência observada no período', () => {
    const value = report({
      workoutAdherence: { hasEnoughData: true, completed: 18, planned: 24, percentage: 75 },
    });

    expect(buildReportSummary(value)).toContain('concluiu 18 de 24 treinos');
  });

  it('explicita quando nenhuma seção tem dados suficientes', () => {
    expect(buildReportSummary(report())).toBe('Ainda não há dados suficientes.');
  });

  it('não afirma evolução quando existem apenas dados de treino', () => {
    const value = report({
      topExercises: {
        hasEnoughData: true,
        items: [
          {
            exerciseId: '40000000-0000-4000-8000-000000000001',
            name: 'Supino',
            maxLoadKg: 60,
            totalSets: 1,
            totalVolumeKg: 600,
            progression: [{ date: '2026-08-01', loadKg: 60 }],
          },
        ],
      },
    });

    expect(buildReportSummary(value)).toBe('O relatório de João apresenta dados do período.');
  });
});

describe('GetStudentReportUseCase', () => {
  const identity: RequestIdentity = {
    authUserId: '20000000-0000-4000-8000-000000000001',
    profileId: '30000000-0000-4000-8000-000000000001',
    role: 'trainer',
  };
  const student = {
    id: '10000000-0000-4000-8000-000000000001',
    authUserId: null,
    trainerId: identity.profileId,
    isIndependent: false,
    name: 'João',
    email: null,
    phone: null,
    birthDate: null,
    gender: null,
    goals: null,
    trainingDays: null,
    restrictions: null,
    internalNotes: null,
    status: 'active' as const,
    avatarUrl: null,
    expoPushToken: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  function makeUseCase(rows: {
    assessments?: ReportAssessment[];
    logs?: ReportWorkoutLog[];
    sets?: ReportExerciseSet[];
    plans?: ReportPlan[];
  }) {
    const repository: ReportsRepository = {
      listAssessments: async () => rows.assessments ?? [],
      listWorkoutLogs: async () => rows.logs ?? [],
      listExerciseSets: async () => rows.sets ?? [],
      listPlans: async () => rows.plans ?? [],
    };
    const access: StudentAccessPolicy = { execute: async () => student };
    return new GetStudentReportUseCase(repository, access, () => new Date('2026-08-07T12:00:00Z'));
  }

  it('retorna seções vazias e válidas quando não há dados', async () => {
    const result = await makeUseCase({}).execute(identity, student.id, { range: '30d' });

    expect(result).toMatchObject({
      student: { id: student.id, name: 'João', avatarUrl: null },
      period: { range: '30d', from: '2026-07-09', to: '2026-08-07' },
      physicalEvolution: { hasEnoughData: false, points: [] },
      workoutAdherence: { hasEnoughData: false, completed: 0, planned: 0, percentage: null },
      rpeTrend: { hasEnoughData: false, points: [] },
      summary: 'Ainda não há dados suficientes.',
    });
  });

  it('mantém uma avaliação sem fabricar evolução', async () => {
    const result = await makeUseCase({
      assessments: [
        {
          date: '2026-08-01',
          weightKg: 80,
          bodyFatPct: 18,
          measurements: { waist: 90, armRight: 35 },
          photos: ['https://example.com/first.jpg'],
        },
      ],
    }).execute(identity, student.id, { range: '30d' });

    expect(result.physicalEvolution).toEqual({
      hasEnoughData: false,
      points: [
        {
          date: '2026-08-01',
          weightKg: 80,
          bodyFatPct: 18,
          measurements: { waist: 90, armRight: 35 },
        },
      ],
      changes: { weightKg: null, bodyFatPct: null, waistCm: null, armCm: null },
    });
    expect(result.beforeAfter).toEqual({
      hasEnoughData: false,
      before: { date: '2026-08-01', photoUrl: 'https://example.com/first.jpg' },
      after: null,
    });
  });

  it('agrega e ordena evolução, frequência, RPE e exercícios', async () => {
    const result = await makeUseCase({
      assessments: [
        {
          date: '2026-08-07',
          weightKg: 76,
          bodyFatPct: 15,
          measurements: { waist: 84, armLeft: 37 },
          photos: ['https://example.com/after.jpg'],
        },
        {
          date: '2026-07-10',
          weightKg: 80,
          bodyFatPct: 18,
          measurements: { waist: 90, armLeft: 35 },
          photos: ['https://example.com/before.jpg'],
        },
      ],
      logs: [
        { date: '2026-08-02', completed: true, rpe: 8 },
        { date: '2026-08-01', completed: true, rpe: 6 },
        { date: '2026-08-02', completed: false, rpe: null },
      ],
      sets: [
        {
          date: '2026-08-02',
          exerciseId: '40000000-0000-4000-8000-000000000002',
          name: 'Remada',
          loadKg: null,
          repsDone: 10,
          completed: true,
        },
        {
          date: '2026-08-01',
          exerciseId: '40000000-0000-4000-8000-000000000001',
          name: 'Supino',
          loadKg: 60,
          repsDone: 10,
          completed: true,
        },
        {
          date: '2026-08-03',
          exerciseId: '40000000-0000-4000-8000-000000000001',
          name: 'Supino',
          loadKg: 65,
          repsDone: null,
          completed: true,
        },
      ],
      plans: [{ startDate: '2026-07-09', endDate: '2026-08-07', workoutDays: 3 }],
    }).execute(identity, student.id, { range: '30d' });

    expect(result.physicalEvolution.changes).toEqual({
      weightKg: -4,
      bodyFatPct: -3,
      waistCm: -6,
      armCm: 2,
    });
    expect(result.trainingFrequency.days).toEqual([
      { date: '2026-08-01', count: 1 },
      { date: '2026-08-02', count: 1 },
    ]);
    expect(result.rpeTrend.points).toEqual([
      { date: '2026-08-01', averageRpe: 6 },
      { date: '2026-08-02', averageRpe: 8 },
    ]);
    expect(result.topExercises.items).toEqual([
      {
        exerciseId: '40000000-0000-4000-8000-000000000001',
        name: 'Supino',
        maxLoadKg: 65,
        totalSets: 2,
        totalVolumeKg: 600,
        progression: [
          { date: '2026-08-01', loadKg: 60 },
          { date: '2026-08-03', loadKg: 65 },
        ],
      },
      {
        exerciseId: '40000000-0000-4000-8000-000000000002',
        name: 'Remada',
        maxLoadKg: null,
        totalSets: 1,
        totalVolumeKg: 0,
        progression: [],
      },
    ]);
    expect(result.workoutAdherence).toEqual({
      hasEnoughData: true,
      completed: 2,
      planned: 15,
      percentage: 13,
    });
  });

  it('não produz tendência quando todos os treinos estão sem RPE', async () => {
    const result = await makeUseCase({
      logs: [{ date: '2026-08-01', completed: true, rpe: null }],
    }).execute(identity, student.id, { range: '30d' });

    expect(result.rpeTrend).toEqual({ hasEnoughData: false, points: [] });
  });

  it('usa os limites do filtro para plano sem datas próprias', async () => {
    const result = await makeUseCase({
      plans: [{ startDate: null, endDate: null, workoutDays: 3 }],
    }).execute(identity, student.id, { range: '30d' });

    expect(result.workoutAdherence.planned).toBe(15);
  });

  it('calcula plano aberto no histórico completo desde o início até hoje', async () => {
    const result = await makeUseCase({
      plans: [{ startDate: '2026-07-01', endDate: null, workoutDays: 3 }],
    }).execute(identity, student.id, { range: 'all' });

    expect(result.workoutAdherence.planned).toBe(18);
  });

  it('usa a maior meta semanal quando planos se sobrepõem', async () => {
    const result = await makeUseCase({
      plans: [
        { startDate: '2026-07-01', endDate: '2026-08-07', workoutDays: 3 },
        { startDate: '2026-07-15', endDate: '2026-08-07', workoutDays: 5 },
      ],
    }).execute(identity, student.id, { range: 'all' });

    expect(result.workoutAdherence.planned).toBe(26);
  });

  it('limita a aderência a cem por cento quando há treinos extras', async () => {
    const result = await makeUseCase({
      plans: [{ startDate: '2026-08-01', endDate: '2026-08-07', workoutDays: 1 }],
      logs: Array.from({ length: 2 }, () => ({
        date: '2026-08-02',
        completed: true,
        rpe: null,
      })),
    }).execute(identity, student.id, {
      range: 'custom',
      from: '2026-08-01',
      to: '2026-08-07',
    });

    expect(result.workoutAdherence).toMatchObject({ planned: 1, completed: 2, percentage: 100 });
  });

  it('não declara evolução física sem uma métrica comparável', async () => {
    const result = await makeUseCase({
      assessments: [
        {
          date: '2026-07-01',
          weightKg: 80,
          bodyFatPct: null,
          measurements: null,
          photos: null,
        },
        {
          date: '2026-08-01',
          weightKg: null,
          bodyFatPct: 18,
          measurements: null,
          photos: null,
        },
      ],
    }).execute(identity, student.id, { range: '90d' });

    expect(result.physicalEvolution.hasEnoughData).toBe(false);
    expect(result.summary).toBe('Ainda não há dados suficientes.');
  });

  it('não trata a mesma foto repetida como antes e depois', async () => {
    const result = await makeUseCase({
      assessments: [
        {
          date: '2026-07-01',
          weightKg: null,
          bodyFatPct: null,
          measurements: null,
          photos: ['https://example.com/same.jpg'],
        },
        {
          date: '2026-08-01',
          weightKg: null,
          bodyFatPct: null,
          measurements: null,
          photos: ['https://example.com/same.jpg'],
        },
      ],
    }).execute(identity, student.id, { range: '90d' });

    expect(result.beforeAfter).toEqual({
      hasEnoughData: false,
      before: { date: '2026-07-01', photoUrl: 'https://example.com/same.jpg' },
      after: null,
    });
  });
});
