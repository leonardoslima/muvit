import { db, schema } from '@muvit/db';
import type { NewExercise } from '@muvit/db/schema';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../test/helpers/auth.js';
import { buildTestApp } from '../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../test/helpers/db.js';

let app: FastifyInstance;

async function signupTrainer(email: string) {
  return signUpWithSession(app, {
    name: 'Trainer',
    email,
    password: '12345678',
    role: 'trainer',
  });
}

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

async function createExercise(
  name: string,
  muscleGroup: NewExercise['muscleGroup'],
): Promise<string> {
  const [exercise] = await db.insert(schema.exercises).values({ name, muscleGroup }).returning();
  if (!exercise) throw new Error('exercise seed failed');
  return exercise.id;
}

async function createStudent(cookie: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/students',
    headers: { cookie },
    payload: { name: 'Aluno' },
  });
  return response.json().id as string;
}

async function createTrainerScenario() {
  const exerciseA = await createExercise('Supino', 'chest');
  const exerciseB = await createExercise('Agacha', 'legs');
  const trainer = await signupTrainer('a@a.com');
  const studentId = await createStudent(trainer.cookie);

  return { exerciseA, exerciseB, studentId, trainerCookie: trainer.cookie };
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

describe('workout plans', () => {
  it('trainer creates a 2-day plan with exercises', async () => {
    const { exerciseA, exerciseB, studentId, trainerCookie } = await createTrainerScenario();

    const r = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        name: 'Hipertrofia A/B',
        status: 'active',
        days: [
          {
            label: 'Treino A',
            dayOrder: 0,
            exercises: [
              {
                exerciseId: exerciseA,
                exerciseOrder: 0,
                sets: 4,
                reps: '8-12',
                restSeconds: 90,
                loadKg: 60,
              },
            ],
          },
          {
            label: 'Treino B',
            dayOrder: 1,
            exercises: [
              { exerciseId: exerciseB, exerciseOrder: 0, sets: 3, reps: '10', restSeconds: 60 },
            ],
          },
        ],
      },
    });
    expect(r.statusCode).toBe(201);
    const body = r.json();
    expect(body.days).toHaveLength(2);
    expect(body.days[0].exercises[0].exercise.name).toBe('Supino');
  });

  it('lists plans for a student (trainer view)', async () => {
    const { studentId, trainerCookie } = await createTrainerScenario();

    await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        name: 'Plano 1',
        status: 'active',
        days: [{ label: 'A', dayOrder: 0, exercises: [] }],
      },
    });
    const r = await app.inject({
      method: 'GET',
      url: `/students/${studentId}/workout-plans`,
      headers: { cookie: trainerCookie },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().items).toHaveLength(1);
  });

  it('cross-tenant 404: other trainer cannot list plans for our student', async () => {
    const { studentId } = await createTrainerScenario();
    const otherTrainer = await signupTrainer('b@b.com');

    const r = await app.inject({
      method: 'GET',
      url: `/students/${studentId}/workout-plans`,
      headers: { cookie: otherTrainer.cookie },
    });
    expect(r.statusCode).toBe(404);
  });

  it('returns 404 when another student lists workout plans', async () => {
    const owner = await signupStudent('owner@i.com');
    const other = await signupStudent('other@i.com');

    const r = await app.inject({
      method: 'GET',
      url: `/students/${owner.id}/workout-plans`,
      headers: { cookie: other.cookie },
    });
    expect(r.statusCode).toBe(404);
  });

  it('independent student creates own plan (trainerId null)', async () => {
    const exerciseA = await createExercise('Supino', 'chest');

    const { id: myId, cookie } = await signupStudent('i@i.com');
    const r = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { cookie },
      payload: {
        studentId: myId,
        name: 'Meu Treino',
        status: 'active',
        days: [
          {
            label: 'A',
            dayOrder: 0,
            exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
          },
        ],
      },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json().trainerId).toBeNull();
  });

  it('independent student lists own plans and loads the full plan without sending a student ID', async () => {
    const exerciseId = await createExercise('Remada', 'back');
    const { id: profileId, cookie } = await signupStudent('self@i.com');
    const created = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { cookie },
      payload: {
        studentId: profileId,
        name: 'Meu Plano',
        status: 'active',
        days: [
          {
            label: 'Treino A',
            dayOrder: 0,
            exercises: [{ exerciseId, exerciseOrder: 0, sets: 3, reps: '10' }],
          },
        ],
      },
    });
    const planId = created.json().id as string;
    const dayId = created.json().days[0].id as string;

    const listed = await app.inject({
      method: 'GET',
      url: '/students/me/workout-plans',
      headers: { cookie },
    });

    expect(listed.statusCode).toBe(200);
    expect(listed.json().items).toEqual([
      expect.objectContaining({ id: planId, studentId: profileId, status: 'active' }),
    ]);

    const full = await app.inject({
      method: 'GET',
      url: `/workout-plans/${planId}`,
      headers: { cookie },
    });

    expect(full.statusCode).toBe(200);
    expect(full.json().days).toEqual([
      expect.objectContaining({
        id: dayId,
        exercises: [
          expect.objectContaining({ exercise: expect.objectContaining({ id: exerciseId }) }),
        ],
      }),
    ]);
  });

  it('rejects trainer access to self-scoped workout plans', async () => {
    const trainer = await signupTrainer('self-trainer@a.com');

    const response = await app.inject({
      method: 'GET',
      url: '/students/me/workout-plans',
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(403);
  });

  it('update replaces days idempotently', async () => {
    const { exerciseA, exerciseB, studentId, trainerCookie } = await createTrainerScenario();

    const c = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        name: 'Plano',
        status: 'draft',
        days: [
          {
            label: 'A',
            dayOrder: 0,
            exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
          },
        ],
      },
    });
    const id = c.json().id;
    const u = await app.inject({
      method: 'PATCH',
      url: `/workout-plans/${id}`,
      headers: { cookie: trainerCookie },
      payload: {
        name: 'Plano renomeado',
        days: [
          {
            label: 'B',
            dayOrder: 0,
            exercises: [{ exerciseId: exerciseB, exerciseOrder: 0, sets: 4, reps: '8' }],
          },
        ],
      },
    });
    expect(u.statusCode).toBe(200);
    expect(u.json().name).toBe('Plano renomeado');
    expect(u.json().days).toHaveLength(1);
    expect(u.json().days[0].label).toBe('B');
    expect(u.json().days[0].exercises[0].exercise.name).toBe('Agacha');
  });

  it('rejects empty days array with 400', async () => {
    const { studentId, trainerCookie } = await createTrainerScenario();

    const r = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { cookie: trainerCookie },
      payload: { studentId, name: 'X', status: 'draft', days: [] },
    });
    expect(r.statusCode).toBe(400);
  });
});
