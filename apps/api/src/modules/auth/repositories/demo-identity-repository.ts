export type DemoIdentitySnapshot = {
  authUserId: string;
  role: string;
  hasCredentialAccount: boolean;
  trainerProfileId: string | null;
  studentProfile: {
    profileId: string;
    isIndependent: boolean;
    trainerId: string | null;
  } | null;
};

export interface DemoIdentityRepository {
  findByEmail(email: string): Promise<DemoIdentitySnapshot | undefined>;
  findByAuthUserId(authUserId: string): Promise<DemoIdentitySnapshot | undefined>;
}
