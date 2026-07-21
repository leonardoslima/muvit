import { type Database, db } from '@muvit/db';
import { type MuvitAuth, createMuvitAuth } from '../../../lib/auth.js';
import type { ProfileProvisioner } from '../profile-provisioner.js';
import { DrizzleProfileProvisioner } from './drizzle-profile-provisioner.js';

export type DrizzleAuthOptions = {
  database?: Database;
  profileProvisioner?: ProfileProvisioner;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
};

export function createDrizzleAuth(options: DrizzleAuthOptions): MuvitAuth {
  const database = options.database ?? db;
  const profileProvisioner = options.profileProvisioner ?? new DrizzleProfileProvisioner(database);

  return createMuvitAuth({
    db: database,
    profileProvisioner,
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins,
  });
}
