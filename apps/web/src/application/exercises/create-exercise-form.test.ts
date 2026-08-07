import { describe, expect, it } from 'vitest';
import { buildCreateExerciseSubmission } from './create-exercise-form';

function formDataFrom(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

describe('create exercise form', () => {
  it('normaliza campos opcionais e monta o payload validado', () => {
    const result = buildCreateExerciseSubmission(
      formDataFrom({
        name: '  Agachamento búlgaro  ',
        muscleGroup: 'legs',
        equipment: '  Halteres  ',
        instructions: '  Mantenha o tronco firme.  ',
        videoUrl: '  https://videos.example/agachamento  ',
      }),
    );

    expect(result).toEqual({
      ok: true,
      body: {
        name: 'Agachamento búlgaro',
        muscleGroup: 'legs',
        equipment: 'Halteres',
        instructions: 'Mantenha o tronco firme.',
        videoUrl: 'https://videos.example/agachamento',
      },
    });
  });

  it('retorna o primeiro erro de cada campo sem montar payload inválido', () => {
    const result = buildCreateExerciseSubmission(
      formDataFrom({
        name: 'A'.repeat(201),
        muscleGroup: 'inexistente',
        equipment: 'E'.repeat(101),
        instructions: 'I'.repeat(2001),
        videoUrl: 'url-inválida',
      }),
    );

    expect(result).toEqual({
      ok: false,
      state: {
        fieldErrors: {
          name: expect.any(String),
          muscleGroup: expect.any(String),
          equipment: expect.any(String),
          videoUrl: expect.any(String),
          instructions: expect.any(String),
        },
      },
    });
  });
});
