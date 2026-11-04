import { describe, expect, it, vi } from 'vitest';
import { formatDateInput, isoDateFromTimestamp, parseDateInput, todayIsoDate } from './date';

describe('date', () => {
  it.each([
    ['2026-10-19', '19/10/2026'],
    ['2024-02-29', '29/02/2024'],
    ['', ''],
    ['19/10/20', '19/10/20'],
  ])('apresenta %s no campo brasileiro sem alterar datas incompletas', (value, expected) => {
    expect(formatDateInput(value)).toBe(expected);
  });

  it.each([
    ['', ''],
    ['1', '1'],
    ['12', '12'],
    ['120', '12/0'],
    ['1206', '12/06'],
    ['120620', '12/06/20'],
    ['12062026', '2026-06-12'],
    ['12/06/2026', '2026-06-12'],
    ['03/09/2026', '2026-09-03'],
    ['2026-09-03', '2026-09-03'],
  ])(
    'converte a entrada %s mantendo o formato interno e permitindo edição parcial',
    (value, expected) => {
      expect(parseDateInput(value)).toBe(expected);
    },
  );

  it.each([
    [new Date(2026, 0, 2, 0, 5).getTime(), '2026-01-02'],
    [new Date(2040, 10, 9, 23, 55).getTime(), '2040-11-09'],
  ])('formata %s como data civil local', (timestampMs, expected) => {
    expect(isoDateFromTimestamp(timestampMs)).toBe(expected);
  });

  it('deriva a data de hoje de Date.now()', () => {
    const timestampMs = new Date(2040, 10, 9, 23, 55).getTime();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(timestampMs);

    try {
      expect(todayIsoDate()).toBe('2040-11-09');
    } finally {
      nowSpy.mockRestore();
    }
  });
});
