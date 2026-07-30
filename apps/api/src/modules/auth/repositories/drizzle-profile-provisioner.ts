import type { Database } from '@muvit/db';
import { authUsers, students, trainers } from '@muvit/db/schema';
import { eq } from 'drizzle-orm';
import type { ProfileProvisioner, ProvisionProfileInput } from '../profile-provisioner.js';

export class DrizzleProfileProvisioner implements ProfileProvisioner {
  constructor(private readonly database: Database) {}

  async provision(input: ProvisionProfileInput): Promise<void> {
    if (input.role !== 'trainer' && input.role !== 'student') {
      throw new Error('Papel de autenticação inválido');
    }

    await this.database.transaction(async (transaction) => {
      if (input.role === 'trainer') {
        await transaction.insert(trainers).values({
          authUserId: input.authUserId,
          name: input.name,
          email: input.email,
        });
        return;
      }

      await transaction.insert(students).values({
        authUserId: input.authUserId,
        name: input.name,
        email: input.email,
        isIndependent: true,
        trainerId: null,
      });
    });
  }

  async removeIdentity(authUserId: string): Promise<void> {
    await this.database.delete(authUsers).where(eq(authUsers.id, authUserId));
  }
}
