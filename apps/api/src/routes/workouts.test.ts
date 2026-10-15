import { db, schema } from '@muvit/db';
import type { NewExercise } from '@muvit/db/schema';
import { eq, sql } from 'drizzle-orm';
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

  return {
    exerciseA,
    exerciseB,
    studentId,
    trainerId: trainer.profileId,
    trainerCookie: trainer.cookie,
  };
}

async function waitForWorkoutDayArchiveLock(timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const activity = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE pid <> pg_backend_pid()
          AND datname = current_database()
          AND state = 'active'
          AND wait_event_type = 'Lock'
          AND query ILIKE '%workout_days%'
          AND query ILIKE '%is_current%'
      ) AS blocked
    `);
    if (activity[0]?.blocked) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return false;
}

async function waitForWorkoutPlanAndDayLockWaits(timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const activity = await db.execute(sql`
      SELECT COUNT(*)::int AS waiting
      FROM pg_stat_activity
      WHERE pid <> pg_backend_pid()
        AND datname = current_database()
        AND state = 'active'
        AND wait_event_type = 'Lock'
        AND (query ILIKE '%workout_plans%' OR query ILIKE '%workout_days%')
    `);
    if (Number(activity[0]?.waiting) >= 2) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return false;
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

  it('persists a valid draft for later authenticated retrieval without publishing a plan', async () => {
    const { exerciseA, studentId, trainerCookie } = await createTrainerScenario();

    const saved = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        payload: {
          name: 'Rascunho remoto',
          days: [
            {
              label: 'Treino A',
              dayOrder: 0,
              exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
            },
          ],
        },
        selectedDayOrder: 0,
      },
    });

    expect(saved.statusCode).toBe(201);
    const draft = saved.json();
    expect(draft).toEqual(
      expect.objectContaining({
        studentId,
        sourcePlanId: null,
        revision: 1,
        selectedDayOrder: 0,
        exerciseReferences: [{ id: exerciseA, name: 'Supino', muscleGroup: 'chest' }],
      }),
    );

    const retrieved = await app.inject({
      method: 'GET',
      url: `/workout-plan-drafts/${draft.id}`,
      headers: { cookie: trainerCookie },
    });
    const listed = await app.inject({
      method: 'GET',
      url: `/students/${studentId}/workout-plan-drafts`,
      headers: { cookie: trainerCookie },
    });

    expect(retrieved.statusCode).toBe(200);
    expect(retrieved.json()).toEqual(draft);
    expect(listed.statusCode).toBe(200);
    expect(listed.json().items).toEqual([draft]);
    expect(await db.query.workoutPlans.findMany()).toHaveLength(0);
  });

  it('increments draft revisions and rejects stale saves without replacing the latest payload', async () => {
    const { exerciseA, studentId, trainerCookie } = await createTrainerScenario();
    const payload = {
      name: 'Rascunho versão 1',
      days: [
        {
          label: 'Treino A',
          dayOrder: 0,
          exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
        },
      ],
    };
    const initial = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: { studentId, payload, selectedDayOrder: 0 },
    });
    const saved = initial.json();
    const duplicateCreate = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: { studentId, payload, selectedDayOrder: 0 },
    });

    const next = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        payload: { ...payload, name: 'Rascunho versão 2' },
        selectedDayOrder: 0,
        draftId: saved.id,
        revision: 1,
      },
    });
    const stalePublish = await app.inject({
      method: 'POST',
      url: `/workout-plan-drafts/${saved.id}/publish`,
      headers: { cookie: trainerCookie },
      payload: { revision: 1, payload },
    });
    const stale = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        payload: { ...payload, name: 'Valor antigo' },
        selectedDayOrder: 0,
        draftId: saved.id,
        revision: 1,
      },
    });
    const concurrentUpdates = await Promise.all(
      ['Rascunho 3A', 'Rascunho 3B'].map((name) =>
        app.inject({
          method: 'POST',
          url: '/workout-plan-drafts',
          headers: { cookie: trainerCookie },
          payload: {
            studentId,
            payload: { ...payload, name },
            selectedDayOrder: 0,
            draftId: saved.id,
            revision: 2,
          },
        }),
      ),
    );
    const current = await app.inject({
      method: 'GET',
      url: `/workout-plan-drafts/${saved.id}`,
      headers: { cookie: trainerCookie },
    });

    expect(initial.statusCode).toBe(201);
    expect(duplicateCreate.statusCode).toBe(409);
    expect(next.statusCode).toBe(201);
    expect(next.json()).toEqual(expect.objectContaining({ id: saved.id, revision: 2 }));
    expect(stalePublish.statusCode).toBe(409);
    expect(stale.statusCode).toBe(409);
    expect(current.json()).toEqual(
      expect.objectContaining({
        revision: 3,
        payload: expect.objectContaining({ name: expect.stringMatching(/^Rascunho 3[AB]$/) }),
      }),
    );
    expect(concurrentUpdates.map((response) => response.statusCode).sort()).toEqual([201, 409]);
  });

  it('does not let a published draft overwrite a later draft with the same source', async () => {
    const { exerciseA, studentId, trainerCookie } = await createTrainerScenario();
    const sourcePlan = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        name: 'Plano inicial',
        status: 'active',
        days: [
          {
            label: 'Dia inicial',
            dayOrder: 0,
            exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
          },
        ],
      },
    });
    const sourcePlanId = sourcePlan.json().id as string;
    const firstPayload = {
      name: 'Rascunho D1',
      days: [
        {
          label: 'Dia D1',
          dayOrder: 0,
          exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 4, reps: '8' }],
        },
      ],
    };
    const firstCreated = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: { studentId, sourcePlanId, payload: firstPayload, selectedDayOrder: 0 },
    });
    const firstDraft = firstCreated.json();
    const published = await app.inject({
      method: 'POST',
      url: `/workout-plan-drafts/${firstDraft.id}/publish`,
      headers: { cookie: trainerCookie },
      payload: { revision: firstDraft.revision, payload: firstPayload },
    });
    const secondPayload = {
      name: 'Rascunho D2',
      days: [
        {
          label: 'Dia D2',
          dayOrder: 0,
          exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 5, reps: '6' }],
        },
      ],
    };
    const secondCreated = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: { studentId, sourcePlanId, payload: secondPayload, selectedDayOrder: 0 },
    });
    const secondDraft = secondCreated.json();
    const lateSave = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        sourcePlanId,
        draftId: firstDraft.id,
        revision: firstDraft.revision,
        payload: { ...firstPayload, name: 'Rascunho D1 atrasado' },
        selectedDayOrder: 0,
      },
    });
    const secondRetrieved = await app.inject({
      method: 'GET',
      url: `/workout-plan-drafts/${secondDraft.id}`,
      headers: { cookie: trainerCookie },
    });

    expect(firstCreated.statusCode).toBe(201);
    expect(published.statusCode).toBe(200);
    expect(secondCreated.statusCode).toBe(201);
    expect(lateSave.statusCode).toBe(409);
    expect(secondRetrieved.json()).toEqual(
      expect.objectContaining({
        id: secondDraft.id,
        revision: 1,
        payload: expect.objectContaining({ name: 'Rascunho D2' }),
      }),
    );
  });

  it('publishes the current client payload once and consumes its draft', async () => {
    const { exerciseA, exerciseB, studentId, trainerCookie } = await createTrainerScenario();
    const saved = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        selectedDayOrder: 0,
        payload: {
          name: 'Nome salvo',
          days: [
            {
              label: 'Dia salvo',
              dayOrder: 0,
              exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
            },
          ],
        },
      },
    });
    const draft = saved.json();
    const published = await app.inject({
      method: 'POST',
      url: `/workout-plan-drafts/${draft.id}/publish`,
      headers: { cookie: trainerCookie },
      payload: {
        revision: draft.revision,
        payload: {
          name: 'Nome publicado',
          notes: 'Conteúdo confirmado no publicar',
          days: [
            {
              label: 'Dia atualizado',
              dayOrder: 0,
              exercises: [{ exerciseId: exerciseB, exerciseOrder: 0, sets: 4, reps: '8' }],
            },
          ],
        },
      },
    });
    const repeated = await app.inject({
      method: 'POST',
      url: `/workout-plan-drafts/${draft.id}/publish`,
      headers: { cookie: trainerCookie },
      payload: {
        revision: draft.revision,
        payload: draft.payload,
      },
    });
    const missingDraft = await app.inject({
      method: 'GET',
      url: `/workout-plan-drafts/${draft.id}`,
      headers: { cookie: trainerCookie },
    });

    expect(published.statusCode).toBe(200);
    expect(published.json()).toEqual(
      expect.objectContaining({
        studentId,
        trainerId: expect.any(String),
        name: 'Nome publicado',
        notes: 'Conteúdo confirmado no publicar',
        status: 'active',
        days: [
          expect.objectContaining({
            label: 'Dia atualizado',
            exercises: [expect.objectContaining({ exerciseId: exerciseB, reps: '8' })],
          }),
        ],
      }),
    );
    expect(repeated.statusCode).toBe(404);
    expect(missingDraft.statusCode).toBe(404);
    expect(await db.query.workoutPlans.findMany()).toHaveLength(1);
    expect(await db.query.workoutPlanDrafts.findMany()).toHaveLength(0);
  });

  it('keeps an active source plan unchanged until its draft is published', async () => {
    const { exerciseA, exerciseB, studentId, trainerCookie } = await createTrainerScenario();
    const source = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        name: 'Plano ativo atual',
        status: 'active',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        notes: 'Notas atuais',
        days: [
          {
            label: 'Prescrição atual',
            dayOrder: 0,
            exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
          },
        ],
      },
    });
    const original = source.json();
    const saved = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        sourcePlanId: original.id,
        selectedDayOrder: 0,
        payload: {
          name: 'Rascunho de edição',
          notes: 'Notas novas',
          days: [
            {
              label: 'Prescrição nova',
              dayOrder: 0,
              exercises: [{ exerciseId: exerciseB, exerciseOrder: 0, sets: 4, reps: '8' }],
            },
          ],
        },
      },
    });
    const afterSave = await app.inject({
      method: 'GET',
      url: `/workout-plans/${original.id}`,
      headers: { cookie: trainerCookie },
    });

    expect(afterSave.json()).toEqual(original);

    const published = await app.inject({
      method: 'POST',
      url: `/workout-plan-drafts/${saved.json().id}/publish`,
      headers: { cookie: trainerCookie },
      payload: {
        revision: saved.json().revision,
        payload: {
          ...saved.json().payload,
          name: 'Plano finalmente publicado',
        },
      },
    });

    expect(published.statusCode).toBe(200);
    expect(published.json()).toEqual(
      expect.objectContaining({
        id: original.id,
        name: 'Plano finalmente publicado',
        notes: 'Notas novas',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: 'active',
        days: [
          expect.objectContaining({
            label: 'Prescrição nova',
            exercises: [expect.objectContaining({ exerciseId: exerciseB, reps: '8' })],
          }),
        ],
      }),
    );
  });

  it('accepts exercises from the current trainer catalog and resolves their names', async () => {
    const { studentId, trainerCookie, trainerId } = await createTrainerScenario();
    const [privateExercise] = await db
      .insert(schema.exercises)
      .values({ trainerId, name: 'Puxada exclusiva', muscleGroup: 'back' })
      .returning();
    if (!privateExercise) throw new Error('trainer exercise seed failed');

    const saved = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        selectedDayOrder: 0,
        payload: {
          name: 'Catálogo próprio',
          days: [
            {
              label: 'Treino A',
              dayOrder: 0,
              exercises: [
                { exerciseId: privateExercise.id, exerciseOrder: 0, sets: 3, reps: '10' },
              ],
            },
          ],
        },
      },
    });

    expect(saved.statusCode).toBe(201);
    expect(saved.json().exerciseReferences).toEqual([
      { id: privateExercise.id, name: 'Puxada exclusiva', muscleGroup: 'back' },
    ]);
  });

  it('serializes concurrent publication so only one request creates the plan', async () => {
    const { exerciseA, studentId, trainerCookie } = await createTrainerScenario();
    const saved = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        selectedDayOrder: 0,
        payload: {
          name: 'Publicação concorrente',
          days: [
            {
              label: 'Treino A',
              dayOrder: 0,
              exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
            },
          ],
        },
      },
    });
    const draft = saved.json();
    const publish = () =>
      app.inject({
        method: 'POST',
        url: `/workout-plan-drafts/${draft.id}/publish`,
        headers: { cookie: trainerCookie },
        payload: { revision: draft.revision, payload: draft.payload },
      });

    const results = await Promise.all([publish(), publish()]);

    expect(results.map((result) => result.statusCode).sort()).toEqual([200, 404]);
    expect(await db.query.workoutPlans.findMany()).toHaveLength(1);
    expect(await db.query.workoutPlanDrafts.findMany()).toHaveLength(0);
  });

  it('locks the plan before replacing days when PATCH overlaps draft publication', async () => {
    const { exerciseA, studentId, trainerCookie } = await createTrainerScenario();
    const sourcePlan = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        name: 'Plano original',
        status: 'active',
        days: [
          {
            label: 'Dia original',
            dayOrder: 0,
            exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
          },
        ],
      },
    });
    const sourcePlanId = sourcePlan.json().id as string;
    const draftPayload = {
      name: 'Plano publicado',
      days: [
        {
          label: 'Dia publicado',
          dayOrder: 0,
          exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 4, reps: '8' }],
        },
      ],
    };
    const draftResponse = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: { studentId, sourcePlanId, payload: draftPayload, selectedDayOrder: 0 },
    });
    const draft = draftResponse.json();

    await db.execute(
      sql.raw('DROP TRIGGER IF EXISTS pause_workout_day_archival_for_test ON workout_days'),
    );
    await db.execute(sql.raw('DROP FUNCTION IF EXISTS pause_workout_day_archival_for_test()'));
    await db.execute(sql.raw('DROP TABLE IF EXISTS workout_day_archive_test_gate'));
    await db.execute(
      sql.raw('CREATE TABLE workout_day_archive_test_gate (id integer PRIMARY KEY)'),
    );
    await db.execute(sql.raw('INSERT INTO workout_day_archive_test_gate (id) VALUES (1)'));
    await db.execute(
      sql.raw(`
        CREATE OR REPLACE FUNCTION pause_workout_day_archival_for_test()
        RETURNS trigger AS $$
        BEGIN
          IF OLD.is_current = true AND NEW.is_current = false THEN
            PERFORM id FROM workout_day_archive_test_gate WHERE id = 1 FOR UPDATE;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `),
    );
    await db.execute(
      sql.raw(`
        CREATE TRIGGER pause_workout_day_archival_for_test
        BEFORE UPDATE OF is_current ON workout_days
        FOR EACH ROW EXECUTE FUNCTION pause_workout_day_archival_for_test()
      `),
    );

    let patchPromise: Promise<Awaited<ReturnType<FastifyInstance['inject']>>> | undefined;
    let publishPromise: Promise<Awaited<ReturnType<FastifyInstance['inject']>>> | undefined;
    let releaseLockBarrier = () => {};
    let signalLockBarrierAcquired = () => {};
    const lockBarrier = new Promise<void>((resolve) => {
      releaseLockBarrier = resolve;
    });
    const lockBarrierAcquired = new Promise<void>((resolve) => {
      signalLockBarrierAcquired = resolve;
    });
    const lockBarrierTransaction = db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM workout_day_archive_test_gate WHERE id = 1 FOR UPDATE`);
      signalLockBarrierAcquired();
      await lockBarrier;
    });

    try {
      await lockBarrierAcquired;
      patchPromise = Promise.resolve(
        app.inject({
          method: 'PATCH',
          url: `/workout-plans/${sourcePlanId}`,
          headers: { cookie: trainerCookie },
          payload: {
            days: [
              {
                label: 'Dia do PATCH',
                dayOrder: 0,
                exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 5, reps: '6' }],
              },
            ],
          },
        }),
      );
      expect(await waitForWorkoutDayArchiveLock()).toBe(true);

      publishPromise = Promise.resolve(
        app.inject({
          method: 'POST',
          url: `/workout-plan-drafts/${draft.id}/publish`,
          headers: { cookie: trainerCookie },
          payload: { revision: draft.revision, payload: draftPayload },
        }),
      );
      expect(await waitForWorkoutPlanAndDayLockWaits()).toBe(true);
      if (!patchPromise || !publishPromise) throw new Error('concurrent requests did not start');
      releaseLockBarrier();
      await lockBarrierTransaction;
      const [patched, published] = await Promise.all([patchPromise, publishPromise]);

      expect(patched.statusCode).toBe(200);
      expect(published.statusCode).toBe(200);
    } finally {
      releaseLockBarrier();
      await lockBarrierTransaction.catch(() => undefined);
      await patchPromise?.catch(() => undefined);
      await publishPromise?.catch(() => undefined);
      await db.execute(
        sql.raw('DROP TRIGGER IF EXISTS pause_workout_day_archival_for_test ON workout_days'),
      );
      await db.execute(sql.raw('DROP FUNCTION IF EXISTS pause_workout_day_archival_for_test()'));
      await db.execute(sql.raw('DROP TABLE IF EXISTS workout_day_archive_test_gate'));
    }
  }, 10_000);

  it('rolls back the published plan when consuming the draft fails', async () => {
    const { exerciseA, studentId, trainerCookie } = await createTrainerScenario();
    const originalPlanResponse = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        name: 'Plano original',
        status: 'active',
        days: [
          {
            label: 'Dia original',
            dayOrder: 0,
            exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
          },
        ],
      },
    });
    const originalPlan = originalPlanResponse.json();
    const saved = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        sourcePlanId: originalPlan.id,
        selectedDayOrder: 0,
        payload: {
          name: 'Mudança não confirmada',
          days: [
            {
              label: 'Dia novo',
              dayOrder: 0,
              exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
            },
          ],
        },
      },
    });
    const draft = saved.json();
    await db.execute(
      sql.raw(`
        CREATE FUNCTION fail_workout_plan_draft_consumption() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced draft consumption failure'; END; $$
      `),
    );
    await db.execute(
      sql.raw(`
        CREATE TRIGGER fail_workout_plan_draft_consumption
        BEFORE DELETE ON workout_plan_drafts
        FOR EACH ROW EXECUTE FUNCTION fail_workout_plan_draft_consumption()
      `),
    );

    let responseStatus = 0;
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/workout-plan-drafts/${draft.id}/publish`,
        headers: { cookie: trainerCookie },
        payload: { revision: draft.revision, payload: draft.payload },
      });
      responseStatus = response.statusCode;
    } finally {
      await db.execute(
        sql.raw(
          'DROP TRIGGER IF EXISTS fail_workout_plan_draft_consumption ON workout_plan_drafts',
        ),
      );
      await db.execute(sql.raw('DROP FUNCTION IF EXISTS fail_workout_plan_draft_consumption()'));
    }

    expect(responseStatus).toBe(500);
    const plans = await db.query.workoutPlans.findMany();
    const days = await db.query.workoutDays.findMany({
      where: (workoutDays, { eq }) => eq(workoutDays.planId, originalPlan.id),
    });
    const draftAfterRollback = await app.inject({
      method: 'GET',
      url: `/workout-plan-drafts/${draft.id}`,
      headers: { cookie: trainerCookie },
    });

    expect(plans).toHaveLength(1);
    expect(plans[0]).toEqual(
      expect.objectContaining({ id: originalPlan.id, name: 'Plano original', status: 'active' }),
    );
    expect(days).toEqual([expect.objectContaining({ label: 'Dia original', isCurrent: true })]);
    expect(await db.query.workoutPlanDrafts.findMany()).toHaveLength(1);
    expect(draftAfterRollback.json()).toEqual(draft);
  });

  it('rejects invalid draft payloads and student-role access', async () => {
    const { studentId, trainerCookie } = await createTrainerScenario();
    const invalid = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        selectedDayOrder: 0,
        payload: {
          name: 'Inválido',
          days: [{ label: 'Treino A', dayOrder: 0, exercises: [] }],
        },
      },
    });
    const student = await signupStudent('draft-student@i.com');
    const forbidden = await app.inject({
      method: 'GET',
      url: `/students/${student.id}/workout-plan-drafts`,
      headers: { cookie: student.cookie },
    });

    expect(invalid.statusCode).toBe(400);
    expect(forbidden.statusCode).toBe(403);
  });

  it('does not expose another trainer student or private catalog exercise', async () => {
    const { exerciseA, studentId, trainerCookie } = await createTrainerScenario();
    const otherTrainer = await signupTrainer('catalog-owner@b.com');
    const otherStudentId = await createStudent(otherTrainer.cookie);
    const [privateExercise] = await db
      .insert(schema.exercises)
      .values({ trainerId: otherTrainer.profileId, name: 'Privado', muscleGroup: 'back' })
      .returning();
    if (!privateExercise) throw new Error('private exercise seed failed');
    const foreignPlan = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { cookie: otherTrainer.cookie },
      payload: {
        studentId: otherStudentId,
        name: 'Plano de outro professor',
        status: 'active',
        days: [
          {
            label: 'Treino A',
            dayOrder: 0,
            exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
          },
        ],
      },
    });

    const foreignList = await app.inject({
      method: 'GET',
      url: `/students/${otherStudentId}/workout-plan-drafts`,
      headers: { cookie: trainerCookie },
    });
    const privateExerciseDraft = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        selectedDayOrder: 0,
        payload: {
          name: 'Exercício alheio',
          days: [
            {
              label: 'Treino A',
              dayOrder: 0,
              exercises: [
                { exerciseId: privateExercise.id, exerciseOrder: 0, sets: 3, reps: '10' },
              ],
            },
          ],
        },
      },
    });
    const foreignSourceDraft = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        sourcePlanId: foreignPlan.json().id,
        selectedDayOrder: 0,
        payload: {
          name: 'Plano fora de contexto',
          days: [
            {
              label: 'Treino A',
              dayOrder: 0,
              exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
            },
          ],
        },
      },
    });
    const ownDraft = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        selectedDayOrder: 0,
        payload: {
          name: 'Draft próprio',
          days: [
            {
              label: 'Treino A',
              dayOrder: 0,
              exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
            },
          ],
        },
      },
    });
    const foreignGet = await app.inject({
      method: 'GET',
      url: `/workout-plan-drafts/${ownDraft.json().id}`,
      headers: { cookie: otherTrainer.cookie },
    });

    expect(foreignList.statusCode).toBe(404);
    expect(privateExerciseDraft.statusCode).toBe(404);
    expect(foreignSourceDraft.statusCode).toBe(404);
    expect(foreignGet.statusCode).toBe(404);
    expect(await db.query.workoutPlanDrafts.findMany()).toHaveLength(1);
  });

  it('does not create a new plan when an edit source becomes archived', async () => {
    const { exerciseA, exerciseB, studentId, trainerCookie } = await createTrainerScenario();
    const created = await app.inject({
      method: 'POST',
      url: '/workout-plans',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        name: 'Plano ativo',
        status: 'active',
        days: [
          {
            label: 'Treino antigo',
            dayOrder: 0,
            exercises: [{ exerciseId: exerciseA, exerciseOrder: 0, sets: 3, reps: '10' }],
          },
        ],
      },
    });
    const sourcePlanId = created.json().id as string;
    const saved = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        sourcePlanId,
        selectedDayOrder: 0,
        payload: {
          name: 'Plano editado',
          days: [
            {
              label: 'Treino novo',
              dayOrder: 0,
              exercises: [{ exerciseId: exerciseB, exerciseOrder: 0, sets: 4, reps: '8' }],
            },
          ],
        },
      },
    });
    const draft = saved.json();
    await db
      .update(schema.workoutPlans)
      .set({ status: 'archived' })
      .where(eq(schema.workoutPlans.id, sourcePlanId));

    const resave = await app.inject({
      method: 'POST',
      url: '/workout-plan-drafts',
      headers: { cookie: trainerCookie },
      payload: {
        studentId,
        sourcePlanId,
        draftId: draft.id,
        selectedDayOrder: 0,
        payload: draft.payload,
        revision: draft.revision,
      },
    });

    const publication = await app.inject({
      method: 'POST',
      url: `/workout-plan-drafts/${draft.id}/publish`,
      headers: { cookie: trainerCookie },
      payload: { revision: draft.revision, payload: draft.payload },
    });

    expect(resave.statusCode).toBe(404);
    expect(publication.statusCode).toBe(404);
    expect(await db.query.workoutPlans.findMany()).toHaveLength(1);
    expect(await db.query.workoutPlanDrafts.findMany()).toHaveLength(1);
    expect((await db.query.workoutPlans.findFirst())?.status).toBe('archived');
  });
});
