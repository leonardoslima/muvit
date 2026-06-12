import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = join(process.cwd(), 'src');

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) return listTypeScriptFiles(path);
    if (
      (!path.endsWith('.ts') && !path.endsWith('.tsx')) ||
      path.endsWith('.test.ts') ||
      path.endsWith('.test.tsx')
    ) {
      return [];
    }

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

function findPrivateHelperNames(content: string): string[] {
  const functionHelperNames = [
    ...content.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/gm),
  ].map((match) => match[1]);
  const constFunctionHelperNames = [
    ...content.matchAll(
      /^(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s+)?function\b/gm,
    ),
  ].map((match) => match[1]);
  const constArrowHelperNames = [
    ...content.matchAll(
      /^(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z0-9_]+(?:\s*:\s*[^=]+?)?)(?:\s*:\s*[^=]+?)?\s*=>/gm,
    ),
  ].map((match) => match[1]);

  return [
    ...new Set([...functionHelperNames, ...constFunctionHelperNames, ...constArrowHelperNames]),
  ].filter((name) => /^[a-z]/.test(name));
}

describe('mobile SOLID architecture rules', () => {
  it('detects import syntax variants used in application modules', () => {
    const content = `
      import { View } from 'react-native';
      import '@react-native-async-storage/async-storage';
      const router = import('expo-router');
    `;

    expect(findImportSpecifiers(content)).toEqual([
      'react-native',
      '@react-native-async-storage/async-storage',
      'expo-router',
    ]);
  });

  it('detects private helper syntax variants used in screens', () => {
    const content = `
async function namedHelper() {}
const typedArrowHelper = (studentId: string): Payload => ({ studentId });
const multilineTypedArrowHelper = (
        studentId: string,
        workoutId: string,
      ): Promise<Payload> => createPayload(studentId, workoutId);
const functionExpressionHelper = function () {};
function ScreenComponent() {}
      function nestedCallback() {}
    `;

    expect(findPrivateHelperNames(content)).toEqual([
      'namedHelper',
      'functionExpressionHelper',
      'typedArrowHelper',
      'multilineTypedArrowHelper',
    ]);
  });

  it('keeps application modules independent from native UI and framework edges', () => {
    const forbiddenImports = [
      /^react-native$/,
      /^expo-router$/,
      /^expo-image-picker$/,
      /^@react-native-async-storage\/async-storage$/,
      /(^|\/)screens(?:\/.*)?$/,
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

  it('keeps refactored screens from defining private application helpers', () => {
    const screenFiles = [
      join(srcRoot, 'screens', 'today-workout.tsx'),
      join(srcRoot, 'screens', 'log-workout.tsx'),
      join(srcRoot, 'screens', 'new-assessment.tsx'),
    ];
    const screenComponentNames = ['TodayWorkoutScreen', 'LogWorkoutScreen', 'NewAssessmentScreen'];

    const violations = screenFiles.flatMap((path) => {
      const content = readFileSync(path, 'utf8');
      const helperNames = findPrivateHelperNames(content).filter(
        (name) => !screenComponentNames.includes(name),
      );
      return helperNames.length > 0
        ? [`${relative(process.cwd(), path)} defines ${helperNames.join(', ')}`]
        : [];
    });

    expect(violations).toEqual([]);
  });
});
