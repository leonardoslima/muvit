import { describe, expect, it } from 'vitest';
import {
  type StudentWizardDraft,
  buildCreateStudentPayload,
  validateBasicStep,
  validateGoalsStep,
} from './student-wizard';

describe('student wizard', () => {
  it('impede avançar sem um nome válido', () => {
    expect(validateBasicStep({ name: '', email: '', phone: '' })).toEqual({
      name: 'Informe o nome.',
    });
  });

  it('identifica um e-mail inválido no primeiro passo', () => {
    expect(validateBasicStep({ name: 'Maria Costa', email: 'maria@', phone: '' })).toEqual({
      email: 'Informe um e-mail válido.',
    });
  });

  it('impede a confirmação sem objetivo principal', () => {
    expect(
      validateGoalsStep({ goals: ' ', trainingDays: '', restrictions: '', internalNotes: '' }),
    ).toEqual({
      goals: 'Informe o objetivo principal.',
    });
  });

  it('monta um único payload normalizado com o rascunho completo', () => {
    const draft: StudentWizardDraft = {
      name: '  Maria Costa ',
      email: ' maria@example.com ',
      phone: ' +55 11 99999-9999 ',
      birthDate: '',
      gender: '',
      goals: ' Hipertrofia; nível intermediário ',
      trainingDays: '4',
      restrictions: ' Dor leve no ombro direito. ',
      internalNotes: ' Prefere treinar pela manhã. ',
    };

    expect(buildCreateStudentPayload(draft)).toEqual({
      name: 'Maria Costa',
      email: 'maria@example.com',
      phone: '+55 11 99999-9999',
      goals: 'Hipertrofia; nível intermediário; 4 dias por semana',
      restrictions: 'Dor leve no ombro direito.\n\nNotas internas: Prefere treinar pela manhã.',
      status: 'active',
    });
  });

  it('exige a frequência semanal antes de criar o aluno', () => {
    expect(
      validateGoalsStep({
        goals: 'Hipertrofia',
        trainingDays: '',
        restrictions: '',
        internalNotes: '',
      }),
    ).toEqual({ trainingDays: 'Informe os dias de treino por semana.' });
  });
});
