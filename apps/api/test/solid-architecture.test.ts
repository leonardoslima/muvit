import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = join(process.cwd(), 'src');

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) return listTypeScriptFiles(path);
    if (!path.endsWith('.ts') || path.endsWith('.test.ts')) return [];

    return [path];
  });
}

describe('SOLID architecture rules', () => {
  it('keeps use cases independent from concrete use case classes', () => {
    const violations = listTypeScriptFiles(join(srcRoot, 'modules'))
      .filter((path) => path.includes(`${join('use-cases', '')}`))
      .flatMap((path) => {
        const content = readFileSync(path, 'utf8');
        const imports = content.matchAll(
          /import\s+(?:type\s+)?\{\s*([^}]+UseCase[^}]*)\s*\}\s+from\s+['"][^'"]*use-cases\/[^'"]+['"]/g,
        );

        return [...imports].map(
          (match) => `${relative(process.cwd(), path)} imports ${match[1].trim()}`,
        );
      });

    expect(violations).toEqual([]);
  });

  it('keeps selected use cases depending on consumer-specific repository ports', () => {
    const aggregateRepositories = [
      {
        module: 'students',
        repositoryName: 'StudentsRepository',
        repositoryPath: '../repositories/students-repository.js',
      },
      {
        module: 'workouts',
        repositoryName: 'WorkoutPlansRepository',
        repositoryPath: '../repositories/workout-plans-repository.js',
      },
    ];

    const violations = aggregateRepositories.flatMap(({ module, repositoryName, repositoryPath }) =>
      listTypeScriptFiles(join(srcRoot, 'modules', module, 'use-cases')).flatMap((path) => {
        const content = readFileSync(path, 'utf8');
        const importsAggregateRepository = new RegExp(
          `import\\s+type\\s+\\{[^}]*\\b${repositoryName}\\b[^}]*\\}\\s+from\\s+['"]${repositoryPath.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&',
          )}['"]`,
        ).test(content);

        if (!importsAggregateRepository) return [];

        return [relative(process.cwd(), path)];
      }),
    );

    expect(violations).toEqual([]);
  });
});
