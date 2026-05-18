import { describe, expect, it } from 'vitest';
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABEL } from './muscle-groups';

describe('muscle groups', () => {
  it('mantem uma label em pt-BR para cada grupo muscular disponivel', () => {
    expect(Object.keys(MUSCLE_GROUP_LABEL).sort()).toEqual([...MUSCLE_GROUPS].sort());
    expect(MUSCLE_GROUPS.every((group) => MUSCLE_GROUP_LABEL[group].trim().length > 0)).toBe(true);
  });

  it('nao possui grupos duplicados', () => {
    expect(new Set(MUSCLE_GROUPS).size).toBe(MUSCLE_GROUPS.length);
  });
});
