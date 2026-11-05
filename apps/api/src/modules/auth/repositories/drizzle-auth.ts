import { type Database, db } from '@muvit/db';
import {
  type MuvitAuth,
  type SendResetPassword,
  type SendVerificationEmail,
  createMuvitAuth,
} from '../../../lib/auth.js';
import type { ProfileProvisioner } from '../profile-provisioner.js';
import { DrizzleProfileProvisioner } from './drizzle-profile-provisioner.js';

export type DrizzleAuthOptions = {
  database?: Database;
  profileProvisioner?: ProfileProvisioner;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  sendResetPassword?: SendResetPassword;
  sendVerificationEmail?: SendVerificationEmail;
  onVerificationDeliveryError?: () => void;
  onPasswordResetDeliveryError?: () => void;
  onAuthError?: () => void;
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
    sendResetPassword: options.sendResetPassword,
    sendVerificationEmail: options.sendVerificationEmail,
    onVerificationDeliveryError: options.onVerificationDeliveryError,
    onPasswordResetDeliveryError: options.onPasswordResetDeliveryError,
    onAuthError: options.onAuthError,
  });
}
