import { AsyncLocalStorage } from 'node:async_hooks';
import { type Database, db } from '@muvit/db';
import { sql } from 'drizzle-orm';
import type { TrainerPlanMutationLock } from '../trainer-plan-mutation-lock.js';

type TrainerPlanTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

const trainerPlanTransactionContext = new AsyncLocalStorage<TrainerPlanTransaction>();

export function getTrainerPlanDatabase(): Database | TrainerPlanTransaction {
  return trainerPlanTransactionContext.getStore() ?? db;
}

export class DrizzleTrainerPlanMutationLock implements TrainerPlanMutationLock {
  async withTrainerPlanMutationLock<T>(trainerId: string, operation: () => Promise<T>): Promise<T> {
    return db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${trainerId}, 0))`,
      );
      return trainerPlanTransactionContext.run(transaction, operation);
    });
  }
}
