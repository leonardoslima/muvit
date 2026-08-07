import { describe, expect, it } from 'vitest';
import { createExerciseSchema, listExercisesQuerySchema } from './exercises.js';

describe('listExercisesQuerySchema', () => {
  it('aceita equipamento normalizado como filtro opcional', () => {
    expect(
      listExercisesQuerySchema.parse({ equipment: ' Halteres ', scope: 'all' }).equipment,
    ).toBe('Halteres');
  });
});

describe('createExerciseSchema', () => {
  it('normaliza o equipamento antes de criar o exercício', () => {
    expect(
      createExerciseSchema.parse({
        name: 'Supino reto',
        muscleGroup: 'chest',
        equipment: '  Barra  ',
      }).equipment,
    ).toBe('Barra');
  });
});
