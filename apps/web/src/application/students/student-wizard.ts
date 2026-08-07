import type { StudentGender } from './student-form';

export type StudentWizardDraft = {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: StudentGender | '';
  goals: string;
  restrictions: string;
};

export type StudentWizardErrors = Partial<Record<keyof StudentWizardDraft, string>>;

type BasicStep = Pick<StudentWizardDraft, 'name' | 'email' | 'phone'>;
type GoalsStep = Pick<StudentWizardDraft, 'goals' | 'restrictions'>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateBasicStep(step: BasicStep): StudentWizardErrors {
  if (step.name.trim().length < 2) return { name: 'Informe o nome.' };
  if (step.email.trim() && !emailPattern.test(step.email.trim())) {
    return { email: 'Informe um e-mail válido.' };
  }
  return {};
}

export function validateGoalsStep(step: GoalsStep): StudentWizardErrors {
  if (!step.goals.trim()) return { goals: 'Informe o objetivo principal.' };
  return {};
}

export function buildCreateStudentPayload(draft: StudentWizardDraft) {
  const optional = (value: string): string | undefined => value.trim() || undefined;

  return {
    name: draft.name.trim(),
    email: optional(draft.email),
    phone: optional(draft.phone),
    birthDate: optional(draft.birthDate),
    gender: draft.gender || undefined,
    goals: optional(draft.goals),
    restrictions: optional(draft.restrictions),
    status: 'active' as const,
  };
}
