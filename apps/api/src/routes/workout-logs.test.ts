import { db, schema } from '@muvit/db';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';
import type { StudentAccessPolicy } from '../modules/students/use-cases/student-access-policy.js';
import { DrizzleWorkoutLogsRepository } from '../modules/workout-logs/repositories/drizzle-workout-logs-repository.js';
import { StartWorkoutLogUseCase } from '../modules/workout-logs/use-cases/start-workout-log.js';
import type { RequestIdentity } from '../shared/request-identity.js';

let app: FastifyInstance;

async function signupStudent(email: string) {
  const session = await signUpWithSession(app, {
    name: 'Independente',
    email,
    password: '12345678',
    role: 'student',
  });
  const id = session.profileId;
  if (id === undefined) throw new Error('student profile not provisioned');
  return { id, cookie: session.cookie };
}

async function createStudentWorkoutScenario() {
  const [exercise] = await db
    .insert(schema.exercises)
    .values({ name: 'Supino', muscleGroup: 'chest' })
    .returning();
  if (!exercise) throw new Error('exercise seed failed');

  const { id: studentId, cookie: studentCookie } = await signupStudent('i@i.com');

  const plan = await app.inject({
    method: 'POST',
    url: '/workout-plans',
    headers: { cookie: studentCookie },
    payload: {
      studentId,
      name: 'Plano',
      status: 'active',
      days: [
        {
          label: 'A',
          dayOrder: 0,
          exercises: [{ exerciseId: exercise.id, exerciseOrder: 0, sets: 3, reps: '10' }],
        },
      ],
    },
  });

  return {
    studentId,
    studentCookie,
    planId: plan.json().id as string,
    workoutDayId: plan.json().days[0].id as string,
    workoutExerciseId: plan.json().days[0].exercises[0].id as string,
  };
}

async function signupTrainer(email: string) {
  return signUpWithSession(app, {
    name: 'Outro',
    email,
    password: '12345678',
    role: 'trainer',
  });
}

beforeEach(async () => {
  app = await buildTestApp();
  await truncateAll();
});

afterEach(async () => {
  await app.close();
});

afterAll(async () => {
  await closeDb();
});

describe('workout logs', () => {
  it('student starts a log', async () => {
    const { studentCookie, workoutDayId } = await createStudentWorkoutScenario();

    const r = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { cookie: studentCookie },
      payload: { workoutDayId, date: '2026-04-01' },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json().id).toBeDefined();
    expect(r.json().completed).toBe(false);
  });

  it('student finishes the log with sets', async () => {
    const { studentCookie, workoutDayId, workoutExerciseId } = await createStudentWorkoutScenario();

    const start = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { cookie: studentCookie },
      payload: { workoutDayId, date: '2026-04-01' },
    });
    const id = start.json().id;
    const r = await app.inject({
      method: 'PATCH',
      url: `/workout-logs/${id}/finish`,
      headers: { cookie: studentCookie },
      payload: {
        durationMin: 55,
        rpe: 8,
        sets: [
          { workoutExerciseId, setNumber: 1, repsDone: 10, loadKg: 60, completed: true },
          { workoutExerciseId, setNumber: 2, repsDone: 9, loadKg: 60, completed: true },
          { workoutExerciseId, setNumber: 3, repsDone: 8, loadKg: 60, completed: true },
        ],
      },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().completed).toBe(true);
    expect(r.json().sets).toHaveLength(3);
  });

  it('other trainer cannot read independent student logs (404)', async () => {
    const { studentCookie, workoutDayId } = await createStudentWorkoutScenario();
    const otherTrainer = await signupTrainer('b@b.com');

    const start = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { cookie: studentCookie },
      payload: { workoutDayId, date: '2026-04-01' },
    });
    const id = start.json().id;
    const r = await app.inject({
      method: 'GET',
      url: `/workout-logs/${id}`,
      headers: { cookie: otherTrainer.cookie },
    });
    expect(r.statusCode).toBe(404);
  });

  it('lists logs by date range', async () => {
    const { studentId, studentCookie, workoutDayId } = await createStudentWorkoutScenario();

    for (const date of ['2026-01-15', '2026-02-20', '2026-03-10']) {
      await app.inject({
        method: 'POST',
        url: '/workout-logs',
        headers: { cookie: studentCookie },
        payload: { workoutDayId, date },
      });
    }
    const r = await app.inject({
      method: 'GET',
      url: `/students/${studentId}/workout-logs?from=2026-02-01&to=2026-03-31`,
      headers: { cookie: studentCookie },
    });
    expect(r.json().items).toHaveLength(2);
  });

  it('student lists own logs without sending a student ID', async () => {
    const { studentId, studentCookie, workoutDayId } = await createStudentWorkoutScenario();

    await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { cookie: studentCookie },
      payload: { workoutDayId, date: '2026-04-01' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/students/me/workout-logs',
      headers: { cookie: studentCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items).toEqual([expect.objectContaining({ studentId, workoutDayId })]);
  });

  it('rejects trainer access to self-scoped workout logs', async () => {
    const trainer = await signupTrainer('self-trainer@a.com');

    const response = await app.inject({
      method: 'GET',
      url: '/students/me/workout-logs',
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 404 when another student lists logs', async () => {
    const { studentId } = await createStudentWorkoutScenario();
    const other = await signupStudent('other@i.com');

    const r = await app.inject({
      method: 'GET',
      url: `/students/${studentId}/workout-logs`,
      headers: { cookie: other.cookie },
    });
    expect(r.statusCode).toBe(404);
  });

  it('completed log cannot be finished again (409)', async () => {
    const { studentCookie, workoutDayId, workoutExerciseId } = await createStudentWorkoutScenario();

    const start = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { cookie: studentCookie },
      payload: { workoutDayId, date: '2026-04-01' },
    });
    const id = start.json().id;
    await app.inject({
      method: 'PATCH',
      url: `/workout-logs/${id}/finish`,
      headers: { cookie: studentCookie },
      payload: {
        durationMin: 30,
        sets: [{ workoutExerciseId, setNumber: 1, repsDone: 8, loadKg: 50, completed: true }],
      },
    });
    const second = await app.inject({
      method: 'PATCH',
      url: `/workout-logs/${id}/finish`,
      headers: { cookie: studentCookie },
      payload: {
        durationMin: 30,
        sets: [{ workoutExerciseId, setNumber: 1, repsDone: 8, loadKg: 50, completed: true }],
      },
    });
    expect(second.statusCode).toBe(409);
  });

  it('concurrent finishes resolve to exactly one success and one 409', async () => {
    const { studentCookie, workoutDayId, workoutExerciseId } = await createStudentWorkoutScenario();

    const start = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { cookie: studentCookie },
      payload: { workoutDayId, date: '2026-04-01' },
    });
    const id = start.json().id;
    const finish = () =>
      app.inject({
        method: 'PATCH',
        url: `/workout-logs/${id}/finish`,
        headers: { cookie: studentCookie },
        payload: {
          durationMin: 30,
          sets: [{ workoutExerciseId, setNumber: 1, repsDone: 8, loadKg: 50, completed: true }],
        },
      });
    const [a, b] = await Promise.all([finish(), finish()]);
    const codes = [a.statusCode, b.statusCode].sort();
    expect(codes).toEqual([200, 409]);

    // Verify only one set of sets was inserted (not duplicated by the loser)
    const get = await app.inject({
      method: 'GET',
      url: `/workout-logs/${id}`,
      headers: { cookie: studentCookie },
    });
    expect(get.json().sets).toHaveLength(1);
  });

  it('starting a log for a workoutDay the student does not own returns 404', async () => {
    const { workoutDayId } = await createStudentWorkoutScenario();

    const other = await signupStudent('o@o.com');
    const r = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { cookie: other.cookie },
      payload: { workoutDayId, date: '2026-04-01' },
    });
    expect(r.statusCode).toBe(404);
  });

  it('returns 404 when another student finishes a log', async () => {
    const { studentCookie, workoutDayId, workoutExerciseId } = await createStudentWorkoutScenario();
    const other = await signupStudent('other@i.com');

    const start = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { cookie: studentCookie },
      payload: { workoutDayId, date: '2026-04-01' },
    });
    const id = start.json().id;

    const r = await app.inject({
      method: 'PATCH',
      url: `/workout-logs/${id}/finish`,
      headers: { cookie: other.cookie },
      payload: {
        durationMin: 30,
        sets: [{ workoutExerciseId, setNumber: 1, repsDone: 8, loadKg: 50, completed: true }],
      },
    });
    expect(r.statusCode).toBe(404);
  });

  it('keeps completed history after replacing a plan and rejects new logs on archived days', async () => {
    const { studentCookie, planId, workoutDayId, workoutExerciseId } =
      await createStudentWorkoutScenario();
    const started = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { cookie: studentCookie },
      payload: { workoutDayId, date: '2026-10-14' },
    });
    const logId = started.json().id as string;
    const finished = await app.inject({
      method: 'PATCH',
      url: `/workout-logs/${logId}/finish`,
      headers: { cookie: studentCookie },
      payload: {
        durationMin: 35,
        sets: [{ workoutExerciseId, setNumber: 1, repsDone: 10, loadKg: 50, completed: true }],
      },
    });

    const updated = await app.inject({
      method: 'PATCH',
      url: `/workout-plans/${planId}`,
      headers: { cookie: studentCookie },
      payload: {
        days: [
          {
            label: 'Treino renovado',
            dayOrder: 0,
            exercises: [
              {
                exerciseId: finished.json().sets[0].exercise.id,
                exerciseOrder: 0,
                sets: 4,
                reps: '8',
              },
            ],
          },
        ],
      },
    });
    const archivedDay = await db.query.workoutDays.findFirst({
      where: (days, { eq }) => eq(days.id, workoutDayId),
    });
    const historicalLog = await app.inject({
      method: 'GET',
      url: `/workout-logs/${logId}`,
      headers: { cookie: studentCookie },
    });
    const newLogOnArchivedDay = await app.inject({
      method: 'POST',
      url: '/workout-logs',
      headers: { cookie: studentCookie },
      payload: { workoutDayId, date: '2026-10-15' },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json().days).toHaveLength(1);
    expect(updated.json().days[0].label).toBe('Treino renovado');
    expect(archivedDay?.isCurrent).toBe(false);
    expect(historicalLog.statusCode).toBe(200);
    expect(historicalLog.json().sets).toEqual([
      expect.objectContaining({
        workoutExerciseId,
        exercise: expect.objectContaining({ id: finished.json().sets[0].exercise.id }),
      }),
    ]);
    expect(newLogOnArchivedDay.statusCode).toBe(404);
  });

  it('rechecks the day after asynchronous access validation before inserting a log', async () => {
    const { studentId, studentCookie, planId, workoutDayId, workoutExerciseId } =
      await createStudentWorkoutScenario();
    const student = await db.query.students.findFirst({
      where: (students, { eq }) => eq(students.id, studentId),
    });
    if (!student) throw new Error('student fixture missing');
    const originalExercise = await db.query.workoutExercises.findFirst({
      where: (exercises, { eq }) => eq(exercises.id, workoutExerciseId),
      columns: { exerciseId: true },
    });
    if (!originalExercise) throw new Error('workout exercise fixture missing');

    let continueAccessCheck = () => {};
    let signalAccessCheckStarted = () => {};
    const accessCheckGate = new Promise<void>((resolve) => {
      continueAccessCheck = resolve;
    });
    const accessCheckStarted = new Promise<void>((resolve) => {
      signalAccessCheckStarted = resolve;
    });
    const accessPolicy: StudentAccessPolicy = {
      execute: async () => {
        signalAccessCheckStarted();
        await accessCheckGate;
        return student;
      },
    };
    const identity: RequestIdentity = {
      authUserId: 'test-auth-user',
      profileId: studentId,
      role: 'student',
    };
    const useCase = new StartWorkoutLogUseCase(new DrizzleWorkoutLogsRepository(), accessPolicy);
    const pendingStart = useCase.execute(identity, {
      workoutDayId,
      date: '2026-10-15',
    });

    await accessCheckStarted;
    const archived = await app.inject({
      method: 'PATCH',
      url: `/workout-plans/${planId}`,
      headers: { cookie: studentCookie },
      payload: {
        days: [
          {
            label: 'Dia novo',
            dayOrder: 0,
            exercises: [
              {
                exerciseId: originalExercise.exerciseId,
                exerciseOrder: 0,
                sets: 4,
                reps: '8',
              },
            ],
          },
        ],
      },
    });

    continueAccessCheck();
    expect(archived.statusCode).toBe(200);
    await expect(pendingStart).rejects.toMatchObject({ code: 'not_found' });
    expect(await db.query.workoutLogs.findMany()).toHaveLength(0);
  });
});
