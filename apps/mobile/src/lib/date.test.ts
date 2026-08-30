import { describe, expect, it, vi } from 'vitest';
import { isoDateFromTimestamp, todayIsoDate } from './date';

describe('date', () => {
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
