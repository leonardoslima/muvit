import type { muscleGroupSchema } from '@muvit/validators';
import type { z } from 'zod';

export type MuscleGroup = z.infer<typeof muscleGroupSchema>;

export const MUSCLE_GROUP_LABEL = {
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
} as const satisfies Record<MuscleGroup, string>;

export function muscleGroupLabel(value: string): string {
  return isMuscleGroup(value) ? MUSCLE_GROUP_LABEL[value] : value;
}

function isMuscleGroup(value: string): value is MuscleGroup {
  return Object.prototype.hasOwnProperty.call(MUSCLE_GROUP_LABEL, value);
}
