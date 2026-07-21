export type AuthOperation = 'login' | 'signup';

const INVALID_CREDENTIALS_MESSAGE = 'Credenciais inválidas. Verifique os dados e tente novamente.';
const SIGNUP_REJECTED_MESSAGE = 'Não foi possível criar a conta com os dados informados.';
const RATE_LIMIT_MESSAGE = 'Muitas tentativas. Aguarde um momento e tente novamente.';
const UNEXPECTED_ERROR_MESSAGE = 'Não foi possível concluir a solicitação. Tente novamente.';

type AuthErrorDetails = {
  code?: string;
  status?: number;
};

function readAuthError(error: unknown): AuthErrorDetails {
  if (typeof error !== 'object' || error === null) {
    return {};
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
  const status = 'status' in error && typeof error.status === 'number' ? error.status : undefined;

  return { code, status };
}

export function getAuthErrorMessage(error: unknown, operation: AuthOperation): string {
  const { code, status } = readAuthError(error);
  const normalizedCode = code?.toUpperCase() ?? '';

  if (
    status === 429 ||
    normalizedCode.includes('TOO_MANY_REQUESTS') ||
    normalizedCode.includes('RATE_LIMIT')
  ) {
    return RATE_LIMIT_MESSAGE;
  }

  if (
    operation === 'login' &&
    (status === 400 ||
      status === 401 ||
      normalizedCode.includes('INVALID_EMAIL_OR_PASSWORD') ||
      normalizedCode.includes('INVALID_CREDENTIALS'))
  ) {
    return INVALID_CREDENTIALS_MESSAGE;
  }

  if (
    operation === 'signup' &&
    (status === 409 ||
      status === 422 ||
      normalizedCode.includes('USER_ALREADY_EXISTS') ||
      normalizedCode.includes('EMAIL_ALREADY'))
  ) {
    return SIGNUP_REJECTED_MESSAGE;
  }

  return UNEXPECTED_ERROR_MESSAGE;
}
