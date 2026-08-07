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
    expect(validateGoalsStep({ goals: ' ', restrictions: '' })).toEqual({
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
      restrictions: ' Dor leve no ombro direito. ',
    };

    expect(buildCreateStudentPayload(draft)).toEqual({
      name: 'Maria Costa',
      email: 'maria@example.com',
      phone: '+55 11 99999-9999',
      goals: 'Hipertrofia; nível intermediário',
      restrictions: 'Dor leve no ombro direito.',
      status: 'active',
    });
  });
});
