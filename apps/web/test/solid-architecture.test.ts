import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = join(process.cwd(), 'src');

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) return listTypeScriptFiles(path);
    if ((!path.endsWith('.ts') && !path.endsWith('.tsx')) || path.endsWith('.test.ts')) return [];

    return [path];
  });
}

describe('web SOLID architecture rules', () => {
  it('keeps application modules independent from UI and framework edges', () => {
    const forbiddenImports = [
      /from ['"]next\/navigation['"]/,
      /from ['"]next\/cache['"]/,
      /from ['"]react['"]/,
      /from ['"]react-dom/,
      /from ['"]@\/components/,
      /from ['"].*\/components/,
    ];

    const violations = listTypeScriptFiles(join(srcRoot, 'application')).flatMap((path) => {
      const content = readFileSync(path, 'utf8');
      return forbiddenImports.some((pattern) => pattern.test(content))
        ? [relative(process.cwd(), path)]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it('keeps refactored server actions free of private helper functions', () => {
    const actionFiles = [
      join(srcRoot, 'app', '(app)', 'students', 'new', 'actions.ts'),
      join(srcRoot, 'app', '(app)', 'students', '[id]', 'actions.ts'),
      join(srcRoot, 'app', '(app)', 'students', '[id]', 'assessments', 'actions.ts'),
      join(srcRoot, 'app', '(app)', 'onboarding', 'actions.ts'),
    ];

    const violations = actionFiles.flatMap((path) => {
      const content = readFileSync(path, 'utf8');
      const helperNames = [...content.matchAll(/\nfunction\s+([A-Za-z0-9_]+)/g)].map(
        (match) => match[1],
      );
      return helperNames.length > 0
        ? [`${relative(process.cwd(), path)} defines ${helperNames.join(', ')}`]
        : [];
    });

    expect(violations).toEqual([]);
  });
});
