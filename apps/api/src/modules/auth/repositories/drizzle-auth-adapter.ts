import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { Database } from '@muvit/db';
import * as schema from '@muvit/db/schema';
import { APIError } from 'better-auth/api';
import { eq, sql } from 'drizzle-orm';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type Adapter = ReturnType<ReturnType<typeof drizzleAdapter>>;
type AdapterOptions = Parameters<ReturnType<typeof drizzleAdapter>>[0];
type UpdateArguments = Parameters<Adapter['update']>[0];

const adapterSchema = {
  user: schema.authUsers,
  session: schema.authSessions,
  account: schema.authAccounts,
  verification: schema.authVerifications,
};

export function createDrizzleAuthAdapter(
  database: Database,
  verificationUserId: () => string | null | undefined,
) {
  return (options: AdapterOptions): Adapter => {
    function adapterFor(connection: Database | Transaction, inTransaction: boolean): Adapter {
      const native = drizzleAdapter(connection, {
        provider: 'pg',
        schema: adapterSchema,
        transaction: false,
      })(options);

      async function updateInside<T>(tx: Transaction, args: UpdateArguments): Promise<T | null> {
        const adapter = drizzleAdapter(tx, {
          provider: 'pg',
          schema: adapterSchema,
          transaction: false,
        })(options);
        const user = await adapter.findOne<{ id: string }>({ model: 'user', where: args.where });
        if (!user) return null;
        const trainer = await tx.query.trainers.findFirst({
          where: eq(schema.trainers.authUserId, user.id),
        });
        const student = await tx.query.students.findFirst({
          where: eq(schema.students.authUserId, user.id),
        });
        const profileId = trainer?.id ?? student?.id;
        if (verificationUserId() && (!profileId || (trainer && student))) {
          throw new Error('Perfil da identidade indisponível');
        }
        if (profileId)
          await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${profileId}, 0))`);
        if (trainer) {
          const lockedTrainer = await tx.query.trainers.findFirst({
            where: eq(schema.trainers.authUserId, user.id),
          });
          if (!lockedTrainer || lockedTrainer.id !== trainer.id) {
            throw new Error('Perfil da identidade indisponível');
          }
        }
        if (student) {
          const lockedStudent = await tx.query.students.findFirst({
            where: eq(schema.students.authUserId, user.id),
          });
          if (!lockedStudent || lockedStudent.id !== student.id) {
            throw new Error('Perfil da identidade indisponível');
          }
        }
        const updated = await adapter.update<T>(args);
        if (!updated) return null;
        const email = args.update.email;
        if (typeof email !== 'string') throw new Error('Email de identidade inválido');
        if (trainer)
          await tx
            .update(schema.trainers)
            .set({
              email,
              updatedAt: sql`greatest(now(), ${schema.trainers.updatedAt} + interval '1 millisecond')`,
            })
            .where(eq(schema.trainers.id, trainer.id));
        if (student)
          await tx.update(schema.students).set({ email }).where(eq(schema.students.id, student.id));
        return updated;
      }

      return {
        ...native,
        update: async <T>(args: UpdateArguments): Promise<T | null> => {
          const boundId = args.model === 'user' ? verificationUserId() : undefined;
          const guardedArgs = boundId
            ? { ...args, where: [...args.where, { field: 'id', value: boundId }] }
            : args;
          if (args.model !== 'user' || typeof args.update.email !== 'string') {
            const result = await native.update<T>(guardedArgs);
            if (boundId && !result) {
              throw new APIError('UNAUTHORIZED', {
                code: 'INVALID_TOKEN',
                message: 'Link inválido.',
              });
            }
            return result;
          }
          let result: T | null;
          try {
            result = inTransaction
              ? await updateInside<T>(connection as Transaction, guardedArgs)
              : await database.transaction((tx) => updateInside<T>(tx, guardedArgs));
          } catch {
            throw new APIError('INTERNAL_SERVER_ERROR', {
              code: 'EMAIL_UPDATE_FAILED',
              message: 'Não foi possível confirmar a alteração de email.',
            });
          }
          if (boundId && !result) {
            throw new APIError('UNAUTHORIZED', {
              code: 'INVALID_TOKEN',
              message: 'Link inválido.',
            });
          }
          return result;
        },
        transaction: async (callback) => {
          if (inTransaction) return callback(adapterFor(connection, true));
          return database.transaction((tx) => callback(adapterFor(tx, true)));
        },
      };
    }
    return adapterFor(database, false);
  };
}
