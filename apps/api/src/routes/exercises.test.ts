import { db, schema } from '@muvit/db';
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

async function createGlobalExercises() {
  await db.insert(schema.exercises).values({ name: 'Supino reto', muscleGroup: 'chest' });
  await db.insert(schema.exercises).values({ name: 'Agachamento', muscleGroup: 'legs' });
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

describe('exercises', () => {
  it('lists global exercises for any authenticated user', async () => {
    await createGlobalExercises();
    const trainer = await signupTrainer('a@a.com');

    const r = await app.inject({
      method: 'GET',
      url: '/exercises?scope=global',
      headers: { cookie: trainer.cookie },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().items.length).toBe(2);
  });

  it('trainer creates a custom exercise', async () => {
    const trainer = await signupTrainer('a@a.com');

    const r = await app.inject({
      method: 'POST',
      url: '/exercises',
      headers: { cookie: trainer.cookie },
      payload: { name: 'Crucifixo invertido', muscleGroup: 'shoulders' },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json().trainerId).toBe(trainer.profileId);
  });

  it('students cannot create exercises', async () => {
    const student = await signUpWithSession(app, {
      name: 'Aluno',
      email: 's@s.com',
      password: '12345678',
      role: 'student',
    });
    const r = await app.inject({
      method: 'POST',
      url: '/exercises',
      headers: { cookie: student.cookie },
      payload: { name: 'Crucifixo invertido', muscleGroup: 'chest' },
    });
    expect(r.statusCode).toBe(403);
  });

  it('coerces scope=mine to global for students (does not leak trainer-owned exercises)', async () => {
    await createGlobalExercises();
    const trainer = await signupTrainer('a@a.com');

    await app.inject({
      method: 'POST',
      url: '/exercises',
      headers: { cookie: trainer.cookie },
      payload: { name: 'Custom do trainer', muscleGroup: 'chest' },
    });

    const student = await signUpWithSession(app, {
      name: 'Aluno',
      email: 's@s.com',
      password: '12345678',
      role: 'student',
    });
    const r = await app.inject({
      method: 'GET',
      url: '/exercises?scope=mine',
      headers: { cookie: student.cookie },
    });
    const items = r.json().items as Array<{ name: string; trainerId: string | null }>;
    expect(items.every((e) => e.trainerId === null)).toBe(true);
    expect(items.find((e) => e.name === 'Custom do trainer')).toBeUndefined();
  });

  it('filters by muscle group', async () => {
    await createGlobalExercises();
    const trainer = await signupTrainer('a@a.com');

    const r = await app.inject({
      method: 'GET',
      url: '/exercises?muscleGroup=chest&scope=global',
      headers: { cookie: trainer.cookie },
    });
    const items = r.json().items as Array<{ muscleGroup: string }>;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((e) => e.muscleGroup === 'chest')).toBe(true);
  });

  it('filtra equipamentos sem misturar exercícios de outro equipamento', async () => {
    await createGlobalExercises();
    await db.insert(schema.exercises).values({
      name: 'Supino com halteres',
      muscleGroup: 'chest',
      equipment: 'Halteres',
    });
    const trainer = await signupTrainer('equipment@a.com');

    const response = await app.inject({
      method: 'GET',
      url: '/exercises?equipment=Halteres&scope=global',
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items).toEqual([
      expect.objectContaining({ name: 'Supino com halteres', equipment: 'Halteres' }),
    ]);
  });

  it('lista todos os equipamentos visíveis nas facets sem aplicar filtros nem paginação', async () => {
    const trainer = await signupTrainer('facets@a.com');
    const otherTrainer = await signupTrainer('facets-other@a.com');
    await db.insert(schema.exercises).values(
      Array.from({ length: 101 }, (_, index) => ({
        name: `Exercício global ${index.toString().padStart(3, '0')}`,
        muscleGroup: index === 100 ? ('chest' as const) : ('legs' as const),
        equipment: `Equipamento ${index.toString().padStart(3, '0')}`,
      })),
    );
    await db.insert(schema.exercises).values([
      {
        name: 'Exercício particular',
        muscleGroup: 'back',
        equipment: '  Personalizado  ',
        trainerId: trainer.profileId,
      },
      {
        name: 'Exercício de outro trainer',
        muscleGroup: 'chest',
        equipment: 'Oculto',
        trainerId: otherTrainer.profileId,
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/exercises?q=global%20100&muscleGroup=chest&equipment=Equipamento%20100&scope=global&limit=1',
      headers: { cookie: trainer.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items).toHaveLength(1);
    expect(response.json().facets.equipment).toHaveLength(102);
    expect(response.json().facets.equipment).toContain('Equipamento 000');
    expect(response.json().facets.equipment).toContain('Equipamento 100');
    expect(response.json().facets.equipment).toContain('Personalizado');
    expect(response.json().facets.equipment).not.toContain('Oculto');
  });
});
