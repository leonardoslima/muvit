import { describe, expect, it } from 'vitest';
import { readOptionalNumber, readOptionalTrimmed, readTrimmed } from './form-data';

describe('form-data readers', () => {
  it('trims required and optional string values', () => {
    const formData = new FormData();
    formData.set('name', '  Ana  ');
    formData.set('empty', '   ');

    expect(readTrimmed(formData, 'name')).toBe('Ana');
    expect(readOptionalTrimmed(formData, 'name')).toBe('Ana');
    expect(readOptionalTrimmed(formData, 'empty')).toBeUndefined();
    expect(readOptionalTrimmed(formData, 'missing')).toBeUndefined();
  });

  it('normalizes optional numeric values with comma or dot', () => {
    const formData = new FormData();
    formData.set('weightKg', '72,5');
    formData.set('heightCm', '180.2');
    formData.set('invalid', 'abc');

    expect(readOptionalNumber(formData, 'weightKg')).toBe(72.5);
    expect(readOptionalNumber(formData, 'heightCm')).toBe(180.2);
    expect(readOptionalNumber(formData, 'invalid')).toBeUndefined();
    expect(readOptionalNumber(formData, 'missing')).toBeUndefined();
  });
});
