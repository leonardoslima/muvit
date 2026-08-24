import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));

describe('runtime ESM nativo', () => {
  it('importa o pacote pela exportação pública sem resolução customizada', () => {
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', "import('@muvit/validators')"],
      { cwd: packageRoot, encoding: 'utf8' },
    );

    expect(result.status, result.stderr).toBe(0);
  });
});
