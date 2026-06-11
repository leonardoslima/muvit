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

function findImportSpecifiers(content: string): string[] {
  const importPatterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  return importPatterns.flatMap((pattern) =>
    [...content.matchAll(pattern)].map((match) => match[1]),
  );
}

function matchesForbiddenImport(content: string, forbiddenSpecifier: RegExp): boolean {
  return findImportSpecifiers(content).some((specifier) => forbiddenSpecifier.test(specifier));
}

describe('web SOLID architecture rules', () => {
  it('keeps application modules independent from UI and framework edges', () => {
    const forbiddenImports = [
      /^next\/navigation$/,
      /^next\/cache$/,
      /^react$/,
      /^react-dom(?:\/.*)?$/,
      /^@\/components(?:\/.*)?$/,
      /(^|\/)components(?:\/.*)?$/,
    ];

    const violations = listTypeScriptFiles(join(srcRoot, 'application')).flatMap((path) => {
      const content = readFileSync(path, 'utf8');
      return forbiddenImports.some((pattern) => matchesForbiddenImport(content, pattern))
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
      const functionHelperNames = [
        ...content.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z0-9_]+)/g),
      ].map((match) => match[1]);
      const constHelperNames = [
        ...content.matchAll(
          /(?:^|\n)\s*const\s+([A-Za-z0-9_]+)\s*=\s*(?:(?:async\s+)?(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>|(?:async\s+)?function\b)/g,
        ),
      ].map((match) => match[1]);
      const helperNames = [...functionHelperNames, ...constHelperNames];
      return helperNames.length > 0
        ? [`${relative(process.cwd(), path)} defines ${helperNames.join(', ')}`]
        : [];
    });

    expect(violations).toEqual([]);
  });
});
