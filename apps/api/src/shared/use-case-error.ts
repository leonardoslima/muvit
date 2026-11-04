export type UseCaseErrorCode =
  | 'not_found'
  | 'forbidden'
  | 'conflict'
  | 'invalid_credentials'
  | 'duplicate_email'
  | 'plan_limit_conflict'
  | 'student_plan_limit_exceeded'
  | 'invalid_refresh_token';

export class UseCaseError extends Error {
  constructor(
    readonly code: UseCaseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'UseCaseError';
  }
}
