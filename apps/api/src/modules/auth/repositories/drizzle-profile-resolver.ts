import { type Database, db } from '@muvit/db';
import { students, trainers } from '@muvit/db/schema';
import { eq } from 'drizzle-orm';
import type { ProfileResolver, ResolveProfileInput } from '../profile-resolver.js';

export class DrizzleProfileResolver implements ProfileResolver {
  constructor(private readonly database: Database) {}

  async resolveProfile(input: ResolveProfileInput): Promise<string | null> {
    if (input.role === 'trainer') {
      const [profile] = await this.database
        .select({ id: trainers.id })
        .from(trainers)
        .where(eq(trainers.authUserId, input.authUserId))
        .limit(1);

      return profile?.id ?? null;
    }

    const [profile] = await this.database
      .select({ id: students.id })
      .from(students)
      .where(eq(students.authUserId, input.authUserId))
      .limit(1);

    return profile?.id ?? null;
  }
}

export function createDrizzleProfileResolver(database: Database = db): ProfileResolver {
  return new DrizzleProfileResolver(database);
}
