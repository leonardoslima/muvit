import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './passwords.js';

describe('passwords', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('s3cret!!');
    expect(hash).not.toBe('s3cret!!');
    expect(await verifyPassword('s3cret!!', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});
