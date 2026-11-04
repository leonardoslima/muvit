export type TrainerIdentity = {
  email: string;
  name: string;
  image: string | null;
};

export class TrainerIdentityConflictError extends Error {
  constructor() {
    super('trainer identity conflict');
    this.name = 'TrainerIdentityConflictError';
  }
}

export interface TrainerIdentityUpdater {
  updateIdentity(input: {
    authUserId: string;
    current: TrainerIdentity;
    next: TrainerIdentity;
  }): Promise<void>;
}
