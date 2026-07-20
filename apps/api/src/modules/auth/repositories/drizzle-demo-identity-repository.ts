import { type Database, db, queryClient } from '@muvit/db';
import { authAccounts, authUsers, students, trainers } from '@muvit/db/schema';
import { and, eq } from 'drizzle-orm';
import type { DemoIdentityRepository, DemoIdentitySnapshot } from './demo-identity-repository.js';

type AuthIdentity = {
  id: string;
  role: string;
};

async function buildSnapshot(
  database: Database,
  identity: AuthIdentity,
): Promise<DemoIdentitySnapshot> {
  const [credentialAccount, trainerProfile, studentProfile] = await Promise.all([
    database.query.authAccounts.findFirst({
      where: and(eq(authAccounts.userId, identity.id), eq(authAccounts.providerId, 'credential')),
    }),
    database.query.trainers.findFirst({
      where: eq(trainers.authUserId, identity.id),
    }),
    database.query.students.findFirst({
      where: eq(students.authUserId, identity.id),
    }),
  ]);

  return {
    authUserId: identity.id,
    role: identity.role,
    hasCredentialAccount: credentialAccount !== undefined,
    trainerProfileId: trainerProfile?.id ?? null,
    studentProfile:
      studentProfile === undefined
        ? null
        : {
            profileId: studentProfile.id,
            isIndependent: studentProfile.isIndependent,
            trainerId: studentProfile.trainerId,
          },
  };
}

export class DrizzleDemoIdentityRepository implements DemoIdentityRepository {
  constructor(private readonly database: Database) {}

  async findByEmail(email: string): Promise<DemoIdentitySnapshot | undefined> {
    const identity = await this.database.query.authUsers.findFirst({
      where: eq(authUsers.email, email),
    });
    if (identity === undefined) return undefined;

    return buildSnapshot(this.database, identity);
  }

  async findByAuthUserId(authUserId: string): Promise<DemoIdentitySnapshot | undefined> {
    const identity = await this.database.query.authUsers.findFirst({
      where: eq(authUsers.id, authUserId),
    });
    if (identity === undefined) return undefined;

    return buildSnapshot(this.database, identity);
  }
}

export function createDrizzleDemoIdentityRepository(): DemoIdentityRepository {
  return new DrizzleDemoIdentityRepository(db);
}

export async function closeDrizzleDemoSeedConnection(): Promise<void> {
  await queryClient.end();
}
