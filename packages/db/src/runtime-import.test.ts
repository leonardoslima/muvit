import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));

describe('runtime ESM nativo', () => {
  it('importa o pacote pela exportação pública sem resolução customizada', () => {
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', "import('@muvit/db')"],
      {
        cwd: packageRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          DATABASE_URL: 'postgres://muvit:muvit@localhost:5432/muvit',
        },
      },
    );

    expect(result.status, result.stderr).toBe(0);
  });
});
