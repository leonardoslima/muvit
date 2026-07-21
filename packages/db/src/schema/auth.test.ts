import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { authAccounts, authSessions, authUsers, authVerifications } from './auth.js';
import { students } from './students.js';
import { trainers } from './trainers.js';

describe('schema Better Auth', () => {
  it('expõe as tabelas físicas esperadas', () => {
    expect(getTableConfig(authUsers).name).toBe('auth_users');
    expect(getTableConfig(authAccounts).name).toBe('auth_accounts');
    expect(getTableConfig(authSessions).name).toBe('auth_sessions');
    expect(getTableConfig(authVerifications).name).toBe('auth_verifications');
  });

  it('mantém e-mail e token globalmente únicos', () => {
    const userIndexes = getTableConfig(authUsers).indexes;
    const sessionIndexes = getTableConfig(authSessions).indexes;

    expect(
      userIndexes.some(
        (index) => index.config.name === 'auth_users_email_unique' && index.config.unique,
      ),
    ).toBe(true);
    expect(
      sessionIndexes.some(
        (index) => index.config.name === 'auth_sessions_token_unique' && index.config.unique,
      ),
    ).toBe(true);
  });

  it('liga perfis à identidade sem autenticar aluno gerenciado', () => {
    expect(trainers.authUserId.notNull).toBe(true);
    expect(students.authUserId.notNull).toBe(false);
  });

  it('gera UUIDs no banco para todas as identidades do Better Auth', () => {
    expect(
      [authUsers, authAccounts, authSessions, authVerifications].every(
        (table) => table.id.hasDefault,
      ),
    ).toBe(true);
  });
});
