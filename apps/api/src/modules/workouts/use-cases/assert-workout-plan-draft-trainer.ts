import type { RequestIdentity } from '../../../shared/request-identity.js';
import { UseCaseError } from '../../../shared/use-case-error.js';

export function assertWorkoutPlanDraftTrainer(identity: RequestIdentity) {
  if (identity.role !== 'trainer') throw new UseCaseError('forbidden', 'forbidden');
}
