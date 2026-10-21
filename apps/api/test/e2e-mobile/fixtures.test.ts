import { randomUUID } from 'node:crypto';
import { db, schema } from '@muvit/db';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/build.js';
import { closeDb } from '../helpers/db.js';
import {
  type FixtureCredentials,
  type Scenario,
  assertProfessorOutcome,
  assertStudentWorkoutOutcome,
  cleanupScenarioFixture,
  prepareScenario,
  runIsolationChecks,
  verifyScenario,
} from './fixtures.js';

let app: FastifyInstance | undefined;
let baseUrl: string;
const activeFixtureScopes: Array<{ runId: string; scenario: Scenario }> = [];

async function prepareTestScenario(input: Parameters<typeof prepareScenario>[0]) {
  activeFixtureScopes.push({ runId: input.runId, scenario: input.scenario });
  return prepareScenario(input);
}

function credentials(runId: string, scenario: Scenario): FixtureCredentials {
  const email = (role: string, account: string) =>
    `mobile-e2e-${runId}-${scenario}-${role}-${account}@example.invalid`;
  const password = `MobileE2E-${randomUUID()}-aA1!`;

  return {
    studentA: { name: `Aluno A ${runId}`, email: email('student', 'a'), password },
    studentB: { name: `Aluno B ${runId}`, email: email('student', 'b'), password },
    trainerA: { name: `Professor A ${runId}`, email: email('trainer', 'a'), password },
    trainerB: { name: `Professor B ${runId}`, email: email('trainer', 'b'), password },
  };
}

function localDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

beforeAll(async () => {
  app = await buildTestApp();
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  baseUrl = address;
});

afterEach(async () => {
  const scopes = activeFixtureScopes.splice(0);
  for (const scope of scopes.reverse()) await cleanupScenarioFixture(scope);
});

afterAll(async () => {
  await app?.close();
  await closeDb();
});

describe('fixtures E2E mobile', () => {
  it('prepara aluno independente com perfil próprio, plano e avaliação baseline', async () => {
    const runId = randomUUID().replaceAll('-', '').slice(0, 12);
    const scenario = 'aluno';
    const runCredentials = credentials(runId, scenario);
    const manifest = await prepareTestScenario({
      apiUrl: baseUrl,
      credentials: runCredentials,
      date: localDate(),
      runId,
      scenario,
    });

    expect(manifest.independentStudents?.a.authUserId).not.toBe(
      manifest.independentStudents?.a.profileId,
    );
    expect(JSON.stringify(manifest)).not.toMatch(/cookie|password|@example\.invalid/i);
    expect(manifest.plans.independentA).toMatchObject({
      name: expect.stringContaining(runId),
      exerciseSets: 2,
      exerciseReps: '10',
      exerciseLoadKg: 20,
    });
    expect(Number(manifest.assessments.independentA?.weightKg)).toBe(70);

    const result = await verifyScenario({
      apiUrl: baseUrl,
      credentials: runCredentials,
      manifest,
      stage: 'setup',
    });
    expect(result.checks.length).toBeGreaterThan(0);
    expect(result.checks.every((check) => check.status === 'passed')).toBe(true);
  }, 60_000);

  it('prepara professores com alunos vinculados e dados separados', async () => {
    const runId = randomUUID().replaceAll('-', '').slice(0, 12);
    const scenario = 'professor';
    const runCredentials = credentials(runId, scenario);
    const manifest = await prepareTestScenario({
      apiUrl: baseUrl,
      credentials: runCredentials,
      date: localDate(),
      runId,
      scenario,
    });

    expect(manifest.trainers.a.authUserId).not.toBe(manifest.trainers.a.profileId);
    expect(JSON.stringify(manifest)).not.toMatch(/cookie|password|@example\.invalid/i);
    expect(manifest.linkedStudents.a.id).not.toBe(manifest.linkedStudents.b.id);
    expect(manifest.plans.trainerStudentA.id).not.toBe(manifest.plans.trainerStudentB.id);
    expect(manifest.assessments.trainerStudentA).toBeUndefined();
    expect(manifest.assessments.trainerStudentB).toBeDefined();

    const result = await verifyScenario({
      apiUrl: baseUrl,
      credentials: runCredentials,
      manifest,
      stage: 'setup',
    });
    expect(result.checks.every((check) => check.status === 'passed')).toBe(true);
  }, 60_000);

  it('mantem professor e isolamento distintos quando compartilham o runId', async () => {
    const runId = randomUUID().replaceAll('-', '').slice(0, 12);
    const professorCredentials = credentials(runId, 'professor');
    const isolationCredentials = credentials(runId, 'isolamento');
    const date = localDate();
    const professor = await prepareTestScenario({
      apiUrl: baseUrl,
      credentials: professorCredentials,
      date,
      runId,
      scenario: 'professor',
    });
    const isolation = await prepareTestScenario({
      apiUrl: baseUrl,
      credentials: isolationCredentials,
      date,
      runId,
      scenario: 'isolamento',
    });

    expect(professor.linkedStudents?.a.id).not.toBe(isolation.linkedStudents?.a.id);
    expect(professor.linkedStudents?.a.name).not.toBe(isolation.linkedStudents?.a.name);
    expect(professor.exerciseId).not.toBe(isolation.exerciseId);
    expect(professor.plans.trainerStudentA?.id).not.toBe(isolation.plans.trainerStudentA?.id);
    expect(JSON.stringify(professor)).not.toMatch(/@example\.invalid/i);
    expect(JSON.stringify(isolation)).not.toMatch(/@example\.invalid/i);

    const professorSetup = await verifyScenario({
      apiUrl: baseUrl,
      credentials: professorCredentials,
      manifest: professor,
      stage: 'setup',
    });
    const isolationSetup = await verifyScenario({
      apiUrl: baseUrl,
      credentials: isolationCredentials,
      manifest: isolation,
      stage: 'setup',
    });
    expect(professorSetup.checks.every((check) => check.status === 'passed')).toBe(true);
    expect(isolationSetup.checks.every((check) => check.status === 'passed')).toBe(true);
  }, 60_000);

  it('valida isolamento por cookie real e confirma dados do dono após tentativas negadas', async () => {
    const runId = randomUUID().replaceAll('-', '').slice(0, 12);
    const scenario = 'isolamento';
    const runCredentials = credentials(runId, scenario);
    const manifest = await prepareTestScenario({
      apiUrl: baseUrl,
      credentials: runCredentials,
      date: localDate(),
      runId,
      scenario,
    });
    expect(JSON.stringify(manifest)).not.toMatch(/cookie|password|@example\.invalid/i);

    const result = await runIsolationChecks({
      apiUrl: baseUrl,
      credentials: runCredentials,
      manifest,
    });

    expect(result.cases.map((item) => item.status)).toEqual(
      expect.arrayContaining([401, 403, 404]),
    );
    expect(result.cases.length).toBeGreaterThanOrEqual(10);
    expect(result.ownerStateIntact).toBe(true);
  }, 60_000);

  it('reprova alteração exclusiva de notes após PATCH cruzado responder 404', async () => {
    const runId = randomUUID().replaceAll('-', '').slice(0, 12);
    const runCredentials = credentials(runId, 'isolamento');
    const manifest = await prepareTestScenario({
      apiUrl: baseUrl,
      credentials: runCredentials,
      date: localDate(),
      runId,
      scenario: 'isolamento',
    });
    const plan = manifest.plans.trainerStudentA;
    if (!plan) throw new Error('Plano A do professor ausente');

    const originalFetch = globalThis.fetch;
    let patchIntercepted = false;
    globalThis.fetch = async (input, init) => {
      const requestUrl = new URL(String(input));
      if (requestUrl.pathname === `/workout-plans/${plan.id}` && init?.method === 'PATCH') {
        patchIntercepted = true;
        await db
          .update(schema.workoutPlans)
          .set({ notes: 'alteracao-negada' })
          .where(eq(schema.workoutPlans.id, plan.id));
        return new Response(null, { status: 404 });
      }
      return originalFetch(input, init);
    };

    try {
      await expect(
        runIsolationChecks({ apiUrl: baseUrl, credentials: runCredentials, manifest }),
      ).rejects.toThrow('Tentativas negadas alteraram recursos consultados pelo dono');
      expect(patchIntercepted).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      await db
        .update(schema.workoutPlans)
        .set({ notes: null })
        .where(eq(schema.workoutPlans.id, plan.id));
    }
  }, 60_000);

  it('rejeita logs ausentes, duplicados, incompletos, séries erradas e evolução zero', () => {
    const valid = {
      date: localDate(),
      workoutDayId: randomUUID(),
      completedThisWeek: 1,
      logs: [
        {
          date: localDate(),
          workoutDayId: randomUUID(),
          completed: true,
          sets: [
            { setNumber: 1, repsDone: 10, loadKg: '22', completed: true },
            { setNumber: 2, repsDone: 8, loadKg: '18', completed: true },
          ],
        },
      ],
    };
    valid.logs[0].workoutDayId = valid.workoutDayId;

    expect(() => assertStudentWorkoutOutcome(valid)).not.toThrow();
    expect(() => assertStudentWorkoutOutcome({ ...valid, logs: [] })).toThrow();
    expect(() =>
      assertStudentWorkoutOutcome({ ...valid, logs: [...valid.logs, ...valid.logs] }),
    ).toThrow();
    expect(() =>
      assertStudentWorkoutOutcome({
        ...valid,
        logs: [{ ...valid.logs[0], completed: false }],
      }),
    ).toThrow();
    expect(() =>
      assertStudentWorkoutOutcome({
        ...valid,
        logs: [
          {
            ...valid.logs[0],
            sets: [{ ...valid.logs[0].sets[0], repsDone: 9 }, valid.logs[0].sets[1]],
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      assertStudentWorkoutOutcome({
        ...valid,
        logs: [
          {
            ...valid.logs[0],
            sets: [{ ...valid.logs[0].sets[0], loadKg: '23' }, valid.logs[0].sets[1]],
          },
        ],
      }),
    ).toThrow();
    expect(() => assertStudentWorkoutOutcome({ ...valid, completedThisWeek: 0 })).toThrow();
    expect(() =>
      assertStudentWorkoutOutcome({
        ...valid,
        logs: [{ ...valid.logs[0], date: '2020-01-01' }],
      }),
    ).toThrow();
    expect(() =>
      assertStudentWorkoutOutcome({
        ...valid,
        logs: [{ ...valid.logs[0], sets: [valid.logs[0].sets[0]] }],
      }),
    ).toThrow();
    expect(() =>
      assertStudentWorkoutOutcome({
        ...valid,
        logs: [
          {
            ...valid.logs[0],
            sets: [{ ...valid.logs[0].sets[0], setNumber: 3 }, valid.logs[0].sets[1]],
          },
        ],
      }),
    ).toThrow();
  });

  it('rejeita avaliação divergente e mutação do baseline do professor B', () => {
    const valid = {
      assessmentCount: 1,
      baselineAssessmentCount: 0,
      expectedDate: localDate(),
      newAssessment: {
        date: localDate(),
        weightKg: '78.50',
        heightCm: '170.0',
        notes: 'Avaliacao E2E',
      },
      planA: { sets: 2, reps: '10', loadKg: '24' },
      baselineBAssessmentsUnchanged: true,
      planBUnchanged: true,
    };

    expect(() => assertProfessorOutcome(valid)).not.toThrow();
    expect(() =>
      assertProfessorOutcome({ ...valid, assessmentCount: valid.baselineAssessmentCount }),
    ).toThrow();
    expect(() =>
      assertProfessorOutcome({
        ...valid,
        newAssessment: { ...valid.newAssessment, weightKg: '79' },
      }),
    ).toThrow();
    expect(() =>
      assertProfessorOutcome({
        ...valid,
        newAssessment: { ...valid.newAssessment, heightCm: '169' },
      }),
    ).toThrow();
    expect(() =>
      assertProfessorOutcome({
        ...valid,
        newAssessment: { ...valid.newAssessment, date: '2020-01-01' },
      }),
    ).toThrow();
    expect(() =>
      assertProfessorOutcome({
        ...valid,
        newAssessment: { ...valid.newAssessment, notes: 'outro' },
      }),
    ).toThrow();
    expect(() =>
      assertProfessorOutcome({ ...valid, planA: { ...valid.planA, loadKg: '20' } }),
    ).toThrow();
    expect(() =>
      assertProfessorOutcome({ ...valid, baselineBAssessmentsUnchanged: false }),
    ).toThrow();
    expect(() => assertProfessorOutcome({ ...valid, planBUnchanged: false })).toThrow();
  });
});
