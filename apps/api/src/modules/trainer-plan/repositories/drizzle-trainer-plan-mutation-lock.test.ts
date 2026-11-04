import { db, schema } from '@muvit/db';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signUpWithSession } from '../../../../test/helpers/auth.js';
import { buildTestApp } from '../../../../test/helpers/build.js';
import { closeDb, truncateAll } from '../../../../test/helpers/db.js';
import { DrizzleStudentsRepository } from '../../students/repositories/drizzle-students-repository.js';
import { DrizzleTrainerPlanMutationLock } from './drizzle-trainer-plan-mutation-lock.js';

let app: FastifyInstance;

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

describe('DrizzleTrainerPlanMutationLock', () => {
  it('reverte a escrita protegida quando a seção crítica falha', async () => {
    const trainer = await signUpWithSession(app, {
      name: 'Treinador Transação',
      email: 'trainer-plan-transaction@example.com',
      password: '12345678',
      role: 'trainer',
    });
    const repository = new DrizzleStudentsRepository();
    const lock = new DrizzleTrainerPlanMutationLock();

    await expect(
      lock.withTrainerPlanMutationLock(trainer.profileId, async () => {
        await repository.createForTrainer(trainer.profileId, { name: 'Deve reverter' });
        throw new Error('falha controlada');
      }),
    ).rejects.toThrow('falha controlada');

    const persistedStudent = await db.query.students.findFirst({
      where: eq(schema.students.name, 'Deve reverter'),
    });
    expect(persistedStudent).toBeUndefined();
  });
});
