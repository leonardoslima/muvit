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

  it('liga perfis à identidade sem autenticar aluno gerenciado', () => {
    expect(trainers.authUserId.notNull).toBe(true);
    expect(students.authUserId.notNull).toBe(false);
  });
});
