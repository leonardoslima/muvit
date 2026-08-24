import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const disableTypeStripping =
  Number.parseInt(process.versions.node, 10) >= 22 ? ['--no-experimental-strip-types'] : [];

describe('runtime ESM nativo', () => {
  it('importa o pacote sem resolução customizada nem type stripping', () => {
    const result = spawnSync(
      process.execPath,
      [...disableTypeStripping, '--input-type=module', '--eval', "import('@muvit/validators')"],
      { cwd: packageRoot, encoding: 'utf8' },
    );

    expect(result.status, result.stderr).toBe(0);
  });
});
