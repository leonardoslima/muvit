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

describe('DATABASE_URL no runtime compilado', () => {
  const validUrl = ' postgres://muvit:muvit@localhost:5432/muvit?sslmode=disable ';

  function loadEnvironment(databaseUrl: string | undefined) {
    return spawnSync(
      process.execPath,
      [
        ...disableTypeStripping,
        '--input-type=module',
        '--eval',
        "import { dbEnv } from './dist/env.js'; console.log(dbEnv.DATABASE_URL);",
      ],
      { cwd: packageRoot, encoding: 'utf8', env: { ...process.env, DATABASE_URL: databaseUrl } },
    );
  }

  it('preserva a URL válida exatamente como informada', () => {
    const result = loadEnvironment(validUrl);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe(`${validUrl}\n`);
  });

  it.each([
    [undefined, 'Required'],
    ['', 'Invalid url'],
    ['valor-inválido', 'Invalid url'],
  ])('rejeita DATABASE_URL %j com mensagem útil', (databaseUrl, message) => {
    const result = loadEnvironment(databaseUrl);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"DATABASE_URL"');
    expect(result.stderr).toContain(`"message": "${message}"`);
  });
});
