import { pgEnum } from 'drizzle-orm/pg-core';

export const trainerPlanEnum = pgEnum('trainer_plan', ['free', 'starter', 'pro', 'team']);

export const studentStatusEnum = pgEnum('student_status', ['active', 'inactive', 'paused']);

export const studentGenderEnum = pgEnum('student_gender', ['male', 'female', 'other']);

export const muscleGroupEnum = pgEnum('muscle_group', [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'glutes',
  'core',
  'cardio',
  'full_body',
]);

export const workoutPlanStatusEnum = pgEnum('workout_plan_status', ['active', 'archived', 'draft']);
