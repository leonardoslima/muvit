import { relations } from 'drizzle-orm';
import { trainers } from './trainers.js';
import { students } from './students.js';
import { assessments } from './assessments.js';
import { exercises } from './exercises.js';
import {
  workoutPlans, workoutDays, workoutExercises, workoutLogs, logSets,
} from './workouts.js';

export const trainersRelations = relations(trainers, ({ many }) => ({
  students: many(students),
  exercises: many(exercises),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  trainer: one(trainers, { fields: [students.trainerId], references: [trainers.id] }),
  assessments: many(assessments),
  workoutPlans: many(workoutPlans),
  workoutLogs: many(workoutLogs),
}));

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  student: one(students, { fields: [assessments.studentId], references: [students.id] }),
}));

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  trainer: one(trainers, { fields: [exercises.trainerId], references: [trainers.id] }),
  workoutExercises: many(workoutExercises),
}));

export const workoutPlansRelations = relations(workoutPlans, ({ one, many }) => ({
  student: one(students, { fields: [workoutPlans.studentId], references: [students.id] }),
  trainer: one(trainers, { fields: [workoutPlans.trainerId], references: [trainers.id] }),
  days: many(workoutDays),
}));

export const workoutDaysRelations = relations(workoutDays, ({ one, many }) => ({
  plan: one(workoutPlans, { fields: [workoutDays.planId], references: [workoutPlans.id] }),
  exercises: many(workoutExercises),
  logs: many(workoutLogs),
}));

export const workoutExercisesRelations = relations(workoutExercises, ({ one, many }) => ({
  day: one(workoutDays, { fields: [workoutExercises.workoutDayId], references: [workoutDays.id] }),
  exercise: one(exercises, { fields: [workoutExercises.exerciseId], references: [exercises.id] }),
  logSets: many(logSets),
}));

export const workoutLogsRelations = relations(workoutLogs, ({ one, many }) => ({
  student: one(students, { fields: [workoutLogs.studentId], references: [students.id] }),
  day: one(workoutDays, { fields: [workoutLogs.workoutDayId], references: [workoutDays.id] }),
  sets: many(logSets),
}));

export const logSetsRelations = relations(logSets, ({ one }) => ({
  log: one(workoutLogs, { fields: [logSets.workoutLogId], references: [workoutLogs.id] }),
  exercise: one(workoutExercises, { fields: [logSets.workoutExerciseId], references: [workoutExercises.id] }),
}));
