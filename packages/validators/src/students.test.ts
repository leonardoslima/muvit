import { describe, expect, it } from 'vitest';
import { createStudentSchema, updateStudentSchema } from './students';

describe('student schemas', () => {
  it('preserva frequência e normaliza notas internas como campos próprios', () => {
    expect(
      createStudentSchema.parse({
        name: 'Maria Costa',
        trainingDays: 4,
        internalNotes: '  Prefere treinar pela manhã.  ',
      }),
    ).toMatchObject({
      trainingDays: 4,
      internalNotes: 'Prefere treinar pela manhã.',
    });

    expect(
      updateStudentSchema.parse({ trainingDays: 5, internalNotes: '  Acompanhar sono.  ' }),
    ).toEqual({ trainingDays: 5, internalNotes: 'Acompanhar sono.' });
  });

  it('rejeita frequência fora da semana e notas internas acima do limite', () => {
    expect(createStudentSchema.safeParse({ name: 'Maria Costa', trainingDays: 0 }).success).toBe(
      false,
    );
    expect(createStudentSchema.safeParse({ name: 'Maria Costa', trainingDays: 8 }).success).toBe(
      false,
    );
    expect(
      createStudentSchema.safeParse({ name: 'Maria Costa', internalNotes: 'a'.repeat(2001) })
        .success,
    ).toBe(false);
  });

  it('aceita null somente na atualização para limpar frequência e notas internas', () => {
    expect(updateStudentSchema.parse({ trainingDays: null, internalNotes: null })).toEqual({
      trainingDays: null,
      internalNotes: null,
    });
    expect(
      createStudentSchema.safeParse({
        name: 'Maria Costa',
        trainingDays: null,
        internalNotes: null,
      }).success,
    ).toBe(false);
  });
});
