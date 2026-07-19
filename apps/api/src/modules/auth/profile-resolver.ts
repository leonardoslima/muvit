import type { RequestIdentity } from '../../shared/request-identity.js';

export type ResolveProfileInput = Pick<RequestIdentity, 'authUserId' | 'role'>;

export interface ProfileResolver {
  resolveProfile(input: ResolveProfileInput): Promise<string | null>;
}
