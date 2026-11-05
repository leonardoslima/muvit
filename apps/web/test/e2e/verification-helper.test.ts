import { describe, expect, it, vi } from 'vitest';
import { confirmFixtureEmail } from './verification-helper';

describe('confirmação da fixture de negócio', () => {
  it('confirma o token capturado antes de consultar recursos privados', async () => {
    const calls: string[] = [];
    const fetchMessage = vi.fn(async () => {
      calls.push('mail');
      return 'http://localhost:3013/verify-email#token=abc';
    });
    const verify = vi.fn(async (token: string) => {
      calls.push(`verify:${token}`);
      return true;
    });
    await confirmFixtureEmail(
      fetchMessage,
      verify,
      'http://localhost:3013',
      'http://localhost:3353',
    );
    expect(calls).toEqual(['mail', 'verify:abc']);
  });
  it('recusa link de outra origem e falha de confirmação', async () => {
    const verify = vi.fn(async () => false);
    await expect(
      confirmFixtureEmail(
        async () => 'https://other.invalid/#token=abc',
        verify,
        'http://localhost:3013',
        'http://localhost:3353',
      ),
    ).rejects.toThrow();
    expect(verify).not.toHaveBeenCalled();
    await expect(
      confirmFixtureEmail(
        async () => 'http://localhost:3013/verify-email#token=abc',
        verify,
        'http://localhost:3013',
        'http://localhost:3353',
      ),
    ).rejects.toThrow();
  });
});
it('aceita apenas o link nativo da API isolada', async () => {
  const verify = vi.fn(async (token: string) => token === 'abc');
  await confirmFixtureEmail(
    async () => 'http://localhost:3353/api/auth/verify-email?token=abc',
    verify,
    'http://localhost:3013',
    'http://localhost:3353',
  );
  expect(verify).toHaveBeenCalledWith('abc');
});
