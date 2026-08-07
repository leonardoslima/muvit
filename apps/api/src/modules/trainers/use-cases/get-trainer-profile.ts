import type { TrainerProfile } from '@muvit/validators';
import type { RequestIdentity } from '../../../shared/request-identity.js';
import type { FindTrainerProfileRepository } from '../repositories/trainers-repository.js';

export class GetTrainerProfileUseCase {
  constructor(private readonly trainersRepository: FindTrainerProfileRepository) {}

  async execute(identity: RequestIdentity): Promise<TrainerProfile> {
    const profile = await this.trainersRepository.findById(identity.profileId);
    if (profile === null) throw new Error('Perfil de treinador não encontrado');

    return profile;
  }
}
