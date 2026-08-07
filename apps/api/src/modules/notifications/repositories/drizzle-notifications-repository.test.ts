import { db, schema } from '@muvit/db';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeDb, truncateAll } from '../../../../test/helpers/db.js';
import { DrizzleNotificationsRepository } from './drizzle-notifications-repository.js';

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closeDb();
});

describe('DrizzleNotificationsRepository', () => {
  it('ignora plano ativo já vencido e encontra o candidato dentro da janela', async () => {
    const [authUser] = await db
      .insert(schema.authUsers)
      .values({
        name: 'Treinador Repositório',
        email: 'notification-repository@example.com',
        emailVerified: true,
        role: 'trainer',
      })
      .returning();
    if (authUser === undefined) throw new Error('fixture de usuário não criada');
    const [trainer] = await db
      .insert(schema.trainers)
      .values({ authUserId: authUser.id, name: authUser.name, email: authUser.email })
      .returning();
    if (trainer === undefined) throw new Error('fixture de treinador não criada');
    const [student] = await db
      .insert(schema.students)
      .values({ trainerId: trainer.id, name: 'Aluno Repositório' })
      .returning();
    if (student === undefined) throw new Error('fixture de aluno não criada');
    await db.insert(schema.workoutPlans).values([
      {
        trainerId: trainer.id,
        studentId: student.id,
        name: 'Plano vencido',
        status: 'active',
        endDate: '2026-08-01',
      },
      {
        trainerId: trainer.id,
        studentId: student.id,
        name: 'Plano dentro da janela',
        status: 'active',
        endDate: '2026-08-12',
      },
    ]);

    const repository = new DrizzleNotificationsRepository();

    await expect(
      repository.findActiveWorkoutPlanEndDate(student.id, '2026-08-07', '2026-08-14'),
    ).resolves.toBe('2026-08-12');
  });
});
