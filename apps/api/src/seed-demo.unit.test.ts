import { describe, expect, it, vi } from 'vitest';
import type { MuvitAuth } from './lib/auth.js';
import type { DemoIdentitySnapshot } from './modules/auth/repositories/demo-identity-repository.js';
import {
  type SeedDemoDependencies,
  demoCredentials,
  printSeedSummary,
  seedDemo,
} from './seed-demo.js';

const trainerSnapshot: DemoIdentitySnapshot = {
  authUserId: 'auth-trainer',
  role: 'trainer',
  hasCredentialAccount: true,
  trainerProfileId: 'profile-trainer',
  studentProfile: null,
};

const studentSnapshot: DemoIdentitySnapshot = {
  authUserId: 'auth-student',
  role: 'student',
  hasCredentialAccount: true,
  trainerProfileId: null,
  studentProfile: {
    profileId: 'profile-student',
    isIndependent: true,
    trainerId: null,
  },
};

const managedStudentIdentities = Array.from({ length: 10 }, (_, index) => ({
  authUserId: `auth-managed-${index + 1}`,
  profileId: `profile-managed-${index + 1}`,
  email: `aluno${String(index + 1).padStart(2, '0')}@muvit.dev`,
  name: `Aluno Gerenciado ${String(index + 1).padStart(2, '0')}`,
}));

function createAuth(): MuvitAuth {
  return {
    handler: async () => new Response(),
    api: {
      signUpEmail: vi.fn(async () => {
        throw new Error('cadastro não deveria ser chamado');
      }),
      getSession: vi.fn(async () => null),
    },
  };
}

describe('orquestração do seed demo', () => {
  it('usa a porta injetada para resolver identidades e executar o seed de domínio', async () => {
    const identityRepository = {
      findByEmail: vi.fn(async (email: string) => {
        if (email === demoCredentials.trainer.email) return trainerSnapshot;
        if (email === demoCredentials.independentStudent.email) return studentSnapshot;

        const managedStudent = managedStudentIdentities.find((item) => item.email === email);
        if (managedStudent === undefined) throw new Error(`email inesperado: ${email}`);

        return {
          ...studentSnapshot,
          authUserId: managedStudent.authUserId,
          studentProfile: {
            profileId: managedStudent.profileId,
            isIndependent: true,
            trainerId: null,
          },
        };
      }),
      findByAuthUserId: vi.fn(async () => undefined),
    };
    const seedData = vi.fn(async () => undefined);
    const referenceDate = new Date('2026-07-19T12:00:00.000Z');
    const dependencies: SeedDemoDependencies = { identityRepository, seedData };

    await seedDemo(createAuth(), referenceDate, dependencies);

    expect(identityRepository.findByEmail).toHaveBeenCalledTimes(12);
    expect(identityRepository.findByAuthUserId).not.toHaveBeenCalled();
    expect(seedData).toHaveBeenCalledWith(
      {
        trainer: {
          authUserId: 'auth-trainer',
          profileId: 'profile-trainer',
          email: demoCredentials.trainer.email,
          name: demoCredentials.trainer.name,
        },
        independentStudent: {
          authUserId: 'auth-student',
          profileId: 'profile-student',
          email: demoCredentials.independentStudent.email,
          name: demoCredentials.independentStudent.name,
        },
        managedStudents: managedStudentIdentities,
      },
      referenceDate,
    );
  });

  it('imprime somente os emails demo e a referência ao README', () => {
    const messages: string[] = [];

    printSeedSummary((message: string) => messages.push(message));

    expect(messages).toEqual([
      `Professor demo: ${demoCredentials.trainer.email}`,
      ...managedStudentIdentities.map((identity) => `Aluno do professor demo: ${identity.email}`),
      `Aluno independente demo: ${demoCredentials.independentStudent.email}`,
      'Senha e instruções: consulte o README.md.',
    ]);
    expect(messages.join('\n')).not.toContain(demoCredentials.password);
  });
});
