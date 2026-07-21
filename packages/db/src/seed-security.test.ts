import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('segurança do seed demo', () => {
  it('não anuncia credenciais sem conta Better Auth', () => {
    const seedSource = readFileSync(fileURLToPath(new URL('./seed.ts', import.meta.url)), 'utf8');

    expect(seedSource).not.toContain('scenario.credentials.password');
    expect(seedSource).not.toContain('demo trainer:');
    expect(seedSource).not.toContain('demo students:');
  });
});
