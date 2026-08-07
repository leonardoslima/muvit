import type { TrainerProfile, UpdateTrainerProfileInput } from '@muvit/validators';
import type { RequestIdentity } from '../../../shared/request-identity.js';
import {
  type TrainerIdentity,
  TrainerIdentityConflictError,
  type TrainerIdentityUpdater,
} from '../../auth/trainer-identity-updater.js';
import type { UpdateTrainerProfileRepository } from '../repositories/trainers-repository.js';

export class TrainerProfileUpdateError extends Error {
  readonly code = 'profile_update_failed';

  constructor(cause: unknown) {
    super('Não foi possível atualizar o perfil.', { cause });
    this.name = 'TrainerProfileUpdateError';
  }
}

export class TrainerProfileCompensationError extends Error {
  readonly code = 'profile_compensation_failed';

  constructor(operationError: unknown, compensationError: unknown) {
    super('Não foi possível restaurar o perfil anterior.', {
      cause: new AggregateError([operationError, compensationError]),
    });
    this.name = 'TrainerProfileCompensationError';
  }
}

export class TrainerProfileUpdateConflictError extends Error {
  readonly code = 'profile_update_conflict';

  constructor() {
    super('O perfil foi atualizado por outra requisição.');
    this.name = 'TrainerProfileUpdateConflictError';
  }
}

function hasIdentityChanged(current: TrainerIdentity, next: TrainerIdentity): boolean {
  return current.email !== next.email || current.name !== next.name || current.image !== next.image;
}

function profileIdentity(profile: TrainerProfile): TrainerIdentity {
  return {
    email: profile.email,
    name: profile.name,
    image: profile.avatarUrl,
  };
}

export class UpdateTrainerProfileUseCase {
  constructor(
    private readonly trainersRepository: UpdateTrainerProfileRepository,
    private readonly identityUpdater: TrainerIdentityUpdater,
  ) {}

  async execute(
    identity: RequestIdentity,
    input: UpdateTrainerProfileInput,
  ): Promise<TrainerProfile> {
    return this.trainersRepository.withProfileUpdateLock(identity.profileId, () =>
      this.executeLocked(identity, input),
    );
  }

  private async executeLocked(
    identity: RequestIdentity,
    input: UpdateTrainerProfileInput,
  ): Promise<TrainerProfile> {
    const currentProfile = await this.trainersRepository.findById(identity.profileId);
    if (currentProfile === null) throw new TrainerProfileUpdateError('profile not found');

    const normalizedInput =
      input.email === undefined ? input : { ...input, email: input.email.trim().toLowerCase() };
    const currentIdentity = profileIdentity(currentProfile);
    const nextIdentity: TrainerIdentity = {
      email: normalizedInput.email ?? currentIdentity.email,
      name: normalizedInput.name ?? currentIdentity.name,
      image:
        normalizedInput.avatarUrl === undefined ? currentIdentity.image : normalizedInput.avatarUrl,
    };
    const identityChanged = hasIdentityChanged(currentIdentity, nextIdentity);

    try {
      if (identityChanged) {
        await this.identityUpdater.updateIdentity({
          authUserId: identity.authUserId,
          current: currentIdentity,
          next: nextIdentity,
        });
      }
    } catch (operationError) {
      await this.compensateOrThrow(
        identity.authUserId,
        nextIdentity,
        currentIdentity,
        operationError,
      );
      if (operationError instanceof TrainerIdentityConflictError) {
        throw new TrainerProfileUpdateConflictError();
      }
      throw new TrainerProfileUpdateError(operationError);
    }

    let updatedProfile: TrainerProfile | null;
    try {
      updatedProfile = await this.trainersRepository.updateProfile(
        identity.profileId,
        normalizedInput,
        currentProfile.updatedAt,
      );
    } catch (operationError) {
      if (identityChanged) {
        await this.compensateOrThrow(
          identity.authUserId,
          nextIdentity,
          currentIdentity,
          operationError,
        );
      }
      throw new TrainerProfileUpdateError(operationError);
    }

    if (updatedProfile !== null) return updatedProfile;

    const winningProfile = await this.trainersRepository.findById(identity.profileId);
    if (winningProfile === null) {
      await this.compensateOrThrow(
        identity.authUserId,
        nextIdentity,
        currentIdentity,
        'profile disappeared during update',
      );
      throw new TrainerProfileUpdateError('profile disappeared during update');
    }

    const winningIdentity = profileIdentity(winningProfile);
    await this.compensateOrThrow(
      identity.authUserId,
      nextIdentity,
      winningIdentity,
      new TrainerProfileUpdateConflictError(),
    );
    throw new TrainerProfileUpdateConflictError();
  }

  private async compensateOrThrow(
    authUserId: string,
    current: TrainerIdentity,
    next: TrainerIdentity,
    operationError: unknown,
  ): Promise<void> {
    try {
      await this.identityUpdater.updateIdentity({ authUserId, current, next });
    } catch (compensationError) {
      throw new TrainerProfileCompensationError(operationError, compensationError);
    }
  }
}
