import { describe, expect, it } from 'vitest';
import { MUSCLE_GROUP_LABEL, muscleGroupLabel } from './muscle-groups';

describe('muscle-groups', () => {
  it('possui label pt-BR para todos os grupos', () => {
    expect(MUSCLE_GROUP_LABEL).toEqual({
      chest: 'Peito',
      back: 'Costas',
      shoulders: 'Ombros',
      biceps: 'Bíceps',
      triceps: 'Tríceps',
      legs: 'Pernas',
      glutes: 'Glúteos',
      core: 'Core',
      cardio: 'Cardio',
      full_body: 'Corpo inteiro',
    });
  });

  it('mantém valor desconhecido legível sem cast inseguro', () => {
    expect(muscleGroupLabel('grupo-legado')).toBe('grupo-legado');
    expect(muscleGroupLabel('chest')).toBe('Peito');
  });
});
