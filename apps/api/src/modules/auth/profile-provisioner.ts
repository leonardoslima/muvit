export type AuthRole = 'trainer' | 'student';

export type ProvisionProfileInput = {
  authUserId: string;
  name: string;
  email: string;
  role: AuthRole;
};

export interface ProfileProvisioner {
  provision(input: ProvisionProfileInput): Promise<void>;
  removeIdentity(authUserId: string): Promise<void>;
}
