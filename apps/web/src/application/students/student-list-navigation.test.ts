import { describe, expect, it } from 'vitest';
import { buildStudentListHref, parseStudentListPage } from './student-list-navigation';

describe('parseStudentListPage', () => {
  it.each([
    ['2', 2],
    ['15', 15],
    ['180143985094820', 180143985094820],
  ])('aceita página segura %s', (value, expected) => {
    expect(parseStudentListPage(value)).toBe(expected);
  });

  it.each([undefined, '', '0', '-1', '1.5', 'abc', 'Infinity', 'NaN', '9007199254740993'])(
    'normaliza valor inválido %s para a página 1',
    (value) => {
      expect(parseStudentListPage(value)).toBe(1);
    },
  );

  it('rejeita página cujo offset deixaria de ser inteiro seguro', () => {
    expect(parseStudentListPage('180143985094821')).toBe(1);
  });
});

describe('buildStudentListHref', () => {
  it('omite parâmetros vazios e a página 1', () => {
    expect(buildStudentListHref({})).toBe('/students');
    expect(buildStudentListHref({ page: 1 })).toBe('/students');
    expect(buildStudentListHref({ page: 0 })).toBe('/students');
    expect(buildStudentListHref({ q: '', status: undefined })).toBe('/students');
  });

  it('faz roundtrip de busca com caracteres especiais, status e página', () => {
    const href = buildStudentListHref({ q: 'Ana & Cia', status: 'paused', page: 2 });
    const url = new URL(href, 'http://localhost');

    expect(url.pathname).toBe('/students');
    expect(url.searchParams.get('q')).toBe('Ana & Cia');
    expect(url.searchParams.get('status')).toBe('paused');
    expect(url.searchParams.get('page')).toBe('2');
  });

  it('normaliza página inválida e não a serializa', () => {
    expect(buildStudentListHref({ page: Number.NaN })).toBe('/students');
    expect(buildStudentListHref({ page: -3 })).toBe('/students');
  });
});
