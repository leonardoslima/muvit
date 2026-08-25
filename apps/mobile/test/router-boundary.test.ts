import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = join(process.cwd(), 'app');
const routerTestFilePattern = /\.test\.[cm]?[jt]sx?$/;

function listRouterTestFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return listRouterTestFiles(entryPath);
      }

      return routerTestFilePattern.test(entry.name)
        ? [relative(process.cwd(), entryPath)]
        : [];
    })
    .sort();
}

describe('fronte de arquivos do Expo Router', () => {
  it('mantém testes fora da árvore app descoberta em produção', () => {
    expect(listRouterTestFiles(appRoot)).toEqual([]);
  });
});
