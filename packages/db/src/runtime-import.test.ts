import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const disableTypeStripping =
  Number.parseInt(process.versions.node, 10) >= 22 ? ['--no-experimental-strip-types'] : [];

const publicEntrypoints = ['@muvit/db', '@muvit/db/schema', '@muvit/db/seed'];

describe('runtime ESM nativo', () => {
  it.each(publicEntrypoints)(
    'importa %s sem resolução customizada nem type stripping',
    (entrypoint) => {
      const result = spawnSync(
        process.execPath,
        [...disableTypeStripping, '--input-type=module', '--eval', `import('${entrypoint}')`],
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
    },
  );
});
