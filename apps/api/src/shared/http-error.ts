import type { FastifyReply } from 'fastify';
import { UseCaseError } from './use-case-error.js';

const statusByCode = {
  not_found: 404,
  forbidden: 403,
  conflict: 409,
  invalid_credentials: 401,
  duplicate_email: 409,
  plan_limit_conflict: 409,
  student_plan_limit_exceeded: 409,
  invalid_refresh_token: 401,
} satisfies Record<UseCaseError['code'], number>;

export function sendUseCaseError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof UseCaseError)) throw error;

  return reply.code(statusByCode[error.code]).send({ error: error.message });
}
