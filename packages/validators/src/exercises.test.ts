import { describe, expect, it } from 'vitest';
import { listExercisesQuerySchema } from './exercises.js';

describe('listExercisesQuerySchema', () => {
  it('aceita equipamento normalizado como filtro opcional', () => {
    expect(
      listExercisesQuerySchema.parse({ equipment: ' Halteres ', scope: 'all' }).equipment,
    ).toBe('Halteres');
  });
});
