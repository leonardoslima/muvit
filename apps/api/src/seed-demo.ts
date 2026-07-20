import { fileURLToPath } from 'node:url';
import { type DemoIdentities, seedDemoData } from '@muvit/db/seed';
import { env } from './env.js';
import type { MuvitAuth } from './lib/auth.js';
import type {
  DemoIdentityRepository,
  DemoIdentitySnapshot,
} from './modules/auth/repositories/demo-identity-repository.js';
import { createDrizzleAuth } from './modules/auth/repositories/drizzle-auth.js';
import {
  closeDrizzleDemoSeedConnection,
  createDrizzleDemoIdentityRepository,
} from './modules/auth/repositories/drizzle-demo-identity-repository.js';

export const demoCredentials = {
  password: '12345678',
  trainer: {
    email: 'trainer@muvit.dev',
    name: 'Professor Demo',
    role: 'trainer',
  },
  independentStudent: {
    email: 'aluno.independente@muvit.dev',
    name: 'Aluno Independente Demo',
    role: 'student',
  },
} as const;

type DemoCredential = {
  email: string;
  name: string;
  role: 'trainer' | 'student';
};

export type SeedDemoDependencies = {
  identityRepository: DemoIdentityRepository;
  seedData(identities: DemoIdentities, referenceDate: Date): Promise<void>;
};

function createDefaultDependencies(): SeedDemoDependencies {
  return {
    identityRepository: createDrizzleDemoIdentityRepository(),
    seedData: seedDemoData,
  };
}

async function ensureDemoIdentity(
  auth: MuvitAuth,
  identityRepository: DemoIdentityRepository,
  credential: DemoCredential,
): Promise<DemoIdentities['trainer']> {
  let identity = await identityRepository.findByEmail(credential.email);

  if (identity === undefined) {
    const created = await auth.api.signUpEmail({
      body: {
        name: credential.name,
        email: credential.email,
        password: demoCredentials.password,
        role: credential.role,
      },
    });
    identity = await identityRepository.findByAuthUserId(created.user.id);
  }

  if (identity === undefined) {
    throw new Error(`Identidade demo não encontrada após cadastro: ${credential.email}`);
  }
  if (identity.role !== credential.role) {
    throw new Error(`Identidade demo com papel incompatível: ${credential.email}`);
  }
  if (!identity.hasCredentialAccount) {
    throw new Error(`Identidade demo sem conta de credencial: ${credential.email}`);
  }

  const profileId = resolveProfileId(identity, credential);
  return {
    authUserId: identity.authUserId,
    profileId,
    email: credential.email,
    name: credential.name,
  };
}

function resolveProfileId(identity: DemoIdentitySnapshot, credential: DemoCredential): string {
  if (credential.role === 'trainer') {
    if (identity.trainerProfileId === null) {
      throw new Error(`Identidade demo sem perfil de treinador: ${credential.email}`);
    }
    return identity.trainerProfileId;
  }

  const profile = identity.studentProfile;
  if (profile === null || !profile.isIndependent || profile.trainerId !== null) {
    throw new Error(`Identidade demo sem perfil independente válido: ${credential.email}`);
  }
  return profile.profileId;
}

export async function seedDemo(
  auth: MuvitAuth,
  referenceDate: Date = new Date(),
  dependencies: SeedDemoDependencies = createDefaultDependencies(),
): Promise<void> {
  const trainer = await ensureDemoIdentity(
    auth,
    dependencies.identityRepository,
    demoCredentials.trainer,
  );
  const independentStudent = await ensureDemoIdentity(
    auth,
    dependencies.identityRepository,
    demoCredentials.independentStudent,
  );

  await dependencies.seedData({ trainer, independentStudent }, referenceDate);
}

function createSeedAuth(): MuvitAuth {
  return createDrizzleAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.WEB_URL, ...env.EXPO_TRUSTED_ORIGINS],
  });
}

export function printSeedSummary(write: (message: string) => void = console.log): void {
  write(`Professor demo: ${demoCredentials.trainer.email}`);
  write(`Aluno independente demo: ${demoCredentials.independentStudent.email}`);
  write('Senha e instruções: consulte o README.md.');
}

async function main(): Promise<void> {
  try {
    await seedDemo(createSeedAuth());
    printSeedSummary();
  } finally {
    await closeDrizzleDemoSeedConnection();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
