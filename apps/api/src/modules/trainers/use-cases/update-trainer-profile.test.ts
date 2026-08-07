import type { TrainerProfile } from '@muvit/validators';
import { describe, expect, it, vi } from 'vitest';
import type { RequestIdentity } from '../../../shared/request-identity.js';
import type { TrainerIdentityUpdater } from '../../auth/trainer-identity-updater.js';
import { UpdateTrainerProfileUseCase } from './update-trainer-profile.js';

const identity: RequestIdentity = {
  authUserId: '01234567-89ab-cdef-0123-456789abcdef',
  profileId: '11234567-89ab-cdef-0123-456789abcdef',
  role: 'trainer',
};

const currentTrainer: TrainerProfile = {
  id: identity.profileId,
  email: 'antigo@example.com',
  name: 'João',
  avatarUrl: null,
  phone: null,
  bio: null,
  specialties: [],
  plan: 'free',
  onboardedAt: null,
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-01T12:00:00.000Z',
};

describe('UpdateTrainerProfileUseCase', () => {
  it('restaura a identidade quando a persistência do perfil falha', async () => {
    const repository = {
      withProfileUpdateLock: async (_profileId: string, operation: () => Promise<TrainerProfile>) =>
        operation(),
      findById: vi.fn().mockResolvedValue(currentTrainer),
      updateProfile: vi.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const identityUpdater: TrainerIdentityUpdater = {
      updateIdentity: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new UpdateTrainerProfileUseCase(repository, identityUpdater);

    await expect(
      useCase.execute(identity, {
        name: 'João Atualizado',
        email: 'novo@example.com',
      }),
    ).rejects.toMatchObject({ code: 'profile_update_failed' });
    expect(identityUpdater.updateIdentity).toHaveBeenNthCalledWith(1, {
      authUserId: identity.authUserId,
      current: { email: 'antigo@example.com', name: 'João', image: null },
      next: { email: 'novo@example.com', name: 'João Atualizado', image: null },
    });
    expect(identityUpdater.updateIdentity).toHaveBeenNthCalledWith(2, {
      authUserId: identity.authUserId,
      current: { email: 'novo@example.com', name: 'João Atualizado', image: null },
      next: { email: 'antigo@example.com', name: 'João', image: null },
    });
  });

  it('expõe falha de compensação quando a identidade não pode ser restaurada', async () => {
    const repository = {
      withProfileUpdateLock: async (_profileId: string, operation: () => Promise<TrainerProfile>) =>
        operation(),
      findById: vi.fn().mockResolvedValue(currentTrainer),
      updateProfile: vi.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const identityUpdater: TrainerIdentityUpdater = {
      updateIdentity: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('identity rollback unavailable')),
    };
    const useCase = new UpdateTrainerProfileUseCase(repository, identityUpdater);

    await expect(useCase.execute(identity, { email: 'novo@example.com' })).rejects.toMatchObject({
      code: 'profile_compensation_failed',
      cause: expect.any(AggregateError),
    });
  });

  it('serializa atualizações concorrentes antes de alterar a identidade', async () => {
    let profile = currentTrainer;
    let persistedIdentity = {
      email: currentTrainer.email,
      name: currentTrainer.name,
      image: currentTrainer.avatarUrl,
    };
    let previousLock = Promise.resolve();
    const repository = {
      async withProfileUpdateLock(_profileId: string, operation: () => Promise<TrainerProfile>) {
        const currentLock = previousLock;
        let releaseLock: (() => void) | undefined;
        previousLock = new Promise<void>((resolve) => {
          releaseLock = resolve;
        });
        await currentLock;
        try {
          return await operation();
        } finally {
          releaseLock?.();
        }
      },
      findById: vi.fn(async () => profile),
      updateProfile: vi.fn(
        async (
          _profileId: string,
          input: { email?: string; name?: string },
          expectedUpdatedAt: string,
        ) => {
          await Promise.resolve();
          if (profile.updatedAt !== expectedUpdatedAt) return null;
          profile = {
            ...profile,
            ...input,
            updatedAt: '2026-08-07T15:00:00.000Z',
          };
          return profile;
        },
      ),
    };
    const identityUpdater: TrainerIdentityUpdater = {
      async updateIdentity(input) {
        persistedIdentity = input.next;
      },
    };
    const useCase = new UpdateTrainerProfileUseCase(repository, identityUpdater);

    const results = await Promise.allSettled([
      useCase.execute(identity, { email: 'primeiro@example.com', name: 'Primeiro' }),
      useCase.execute(identity, { email: 'segundo@example.com', name: 'Segundo' }),
    ]);

    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'fulfilled']);
    expect(persistedIdentity).toEqual({
      email: profile.email,
      name: profile.name,
      image: profile.avatarUrl,
    });
  });
});
