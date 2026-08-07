import { describe, expect, it } from 'vitest';
import { buildCreateStudentBody, buildUpdateStudentBody } from './student-form';

function formDataFrom(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe('student form builders', () => {
  it('requires a name when creating a student', () => {
    const result = buildCreateStudentBody(formDataFrom({ name: 'A' }));

    expect(result).toEqual({ ok: false, state: { fieldErrors: { name: 'Informe o nome.' } } });
  });

  it('builds a create payload with optional fields trimmed', () => {
    const result = buildCreateStudentBody(
      formDataFrom({
        name: '  Ana Souza  ',
        email: ' ana@example.com ',
        phone: ' ',
        gender: 'female',
        status: 'paused',
      }),
    );

    expect(result).toEqual({
      ok: true,
      body: {
        name: 'Ana Souza',
        email: 'ana@example.com',
        phone: undefined,
        birthDate: undefined,
        gender: 'female',
        goals: undefined,
        trainingDays: undefined,
        restrictions: undefined,
        internalNotes: undefined,
        status: 'paused',
      },
    });
  });

  it('requires id when updating a student', () => {
    const result = buildUpdateStudentBody(formDataFrom({ name: 'Ana Souza' }));

    expect(result).toEqual({ ok: false, state: { error: 'ID do aluno ausente.' } });
  });

  it('builds an update payload without defaulting status', () => {
    const result = buildUpdateStudentBody(
      formDataFrom({ id: 'student-id', name: ' Ana ', status: '', gender: '' }),
    );

    expect(result).toEqual({
      ok: true,
      id: 'student-id',
      body: {
        name: 'Ana',
        email: undefined,
        phone: undefined,
        birthDate: undefined,
        gender: undefined,
        goals: undefined,
        trainingDays: undefined,
        restrictions: undefined,
        internalNotes: undefined,
        status: undefined,
      },
    });
  });

  it('mapeia controles vazios para null somente na edição', () => {
    expect(
      buildUpdateStudentBody(
        formDataFrom({ id: 'student-id', trainingDays: '', internalNotes: '' }),
      ),
    ).toMatchObject({
      ok: true,
      body: { trainingDays: null, internalNotes: null },
    });

    expect(buildCreateStudentBody(formDataFrom({ name: 'Maria Costa' }))).toMatchObject({
      ok: true,
      body: { trainingDays: undefined, internalNotes: undefined },
    });
  });
});
