import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from './index.js';
import { type DemoIdentities, buildDemoScenario } from './seeds/demo.js';
import { globalExercises } from './seeds/exercises.js';

export type { DemoIdentities };

type PersistedExercise = typeof schema.exercises.$inferSelect;
type PersistedStudent = typeof schema.students.$inferSelect;
type PersistedWorkoutDay = typeof schema.workoutDays.$inferSelect;
type PersistedWorkoutExercise = typeof schema.workoutExercises.$inferSelect;
type SeedTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const workoutDayKey = (studentIndex: number, dayOrder: number): string =>
  `${studentIndex}:${dayOrder}`;

const workoutExerciseKey = (
  studentIndex: number,
  dayOrder: number,
  exerciseOrder: number,
): string => `${studentIndex}:${dayOrder}:${exerciseOrder}`;

async function clearDemoData(
  transaction: SeedTransaction,
  identities: DemoIdentities,
): Promise<void> {
  await transaction
    .delete(schema.students)
    .where(
      and(
        eq(schema.students.trainerId, identities.trainer.profileId),
        eq(schema.students.isIndependent, false),
      ),
    );
  await transaction
    .delete(schema.assessments)
    .where(eq(schema.assessments.studentId, identities.independentStudent.profileId));
  await transaction
    .delete(schema.workoutPlans)
    .where(eq(schema.workoutPlans.studentId, identities.independentStudent.profileId));
}

async function seedGlobalExercises(transaction: SeedTransaction): Promise<PersistedExercise[]> {
  const existing = await transaction
    .select()
    .from(schema.exercises)
    .where(isNull(schema.exercises.trainerId));
  const existingNames = new Set(existing.map((exercise) => exercise.name));
  const missing = globalExercises.filter((exercise) => !existingNames.has(exercise.name));
  const inserted =
    missing.length === 0
      ? []
      : await transaction
          .insert(schema.exercises)
          .values(missing.map((exercise) => ({ ...exercise, trainerId: null })))
          .returning();

  console.log(`global exercises: ${existing.length} reused, ${inserted.length} inserted`);

  return [...existing, ...inserted];
}

const findExerciseId = (exercises: PersistedExercise[], name: string): string => {
  const exercise = exercises.find((item) => item.name === name);
  if (!exercise) throw new Error(`missing seeded exercise: ${name}`);
  return exercise.id;
};

const mapStudentsByEmail = (students: PersistedStudent[]): Map<string, PersistedStudent> => {
  const studentsByEmail = new Map<string, PersistedStudent>();
  for (const student of students) {
    if (student.email) studentsByEmail.set(student.email, student);
  }
  return studentsByEmail;
};

export async function seedDemoData(
  identities: DemoIdentities,
  referenceDate: Date = new Date(),
): Promise<void> {
  const scenario = buildDemoScenario(identities, referenceDate);
  const scenarioIndependentStudent = scenario.students.find((student) => student.isIndependent);
  if (!scenarioIndependentStudent) {
    throw new Error('missing independent demo student');
  }

  return db.transaction(async (transaction) => {
    const [trainer] = await transaction
      .update(schema.trainers)
      .set({
        email: scenario.trainer.email,
        name: scenario.trainer.name,
        plan: 'pro',
      })
      .where(
        and(
          eq(schema.trainers.id, scenario.trainer.profileId),
          eq(schema.trainers.authUserId, scenario.trainer.authUserId),
        ),
      )
      .returning();
    if (!trainer) throw new Error('missing provisioned demo trainer profile');

    const [independentStudent] = await transaction
      .update(schema.students)
      .set({
        authUserId: identities.independentStudent.authUserId,
        trainerId: null,
        isIndependent: true,
        name: scenarioIndependentStudent.name,
        email: scenarioIndependentStudent.email,
        phone: scenarioIndependentStudent.phone,
        birthDate: scenarioIndependentStudent.birthDate,
        gender: scenarioIndependentStudent.gender,
        goals: scenarioIndependentStudent.goals,
        restrictions: scenarioIndependentStudent.restrictions,
        status: scenarioIndependentStudent.status,
        avatarUrl: scenarioIndependentStudent.avatarUrl,
        expoPushToken: scenarioIndependentStudent.expoPushToken,
      })
      .where(
        and(
          eq(schema.students.id, identities.independentStudent.profileId),
          eq(schema.students.authUserId, identities.independentStudent.authUserId),
        ),
      )
      .returning();
    if (!independentStudent)
      throw new Error('missing provisioned independent demo student profile');

    await clearDemoData(transaction, identities);
    const exercises = await seedGlobalExercises(transaction);
    const managedScenarioStudents = scenario.students.filter((student) => !student.isIndependent);

    const insertedStudents = await transaction
      .insert(schema.students)
      .values(
        managedScenarioStudents.map((student) => ({
          ...student,
          trainerId: trainer.id,
        })),
      )
      .returning();
    if (insertedStudents.length !== managedScenarioStudents.length) {
      throw new Error('failed to seed all managed demo students');
    }
    const studentsByEmail = mapStudentsByEmail([...insertedStudents, independentStudent]);

    const resolveStudent = (studentIndex: number): PersistedStudent => {
      const scenarioStudent = scenario.students[studentIndex];
      if (!scenarioStudent) {
        throw new Error(`missing demo student at index ${studentIndex}`);
      }
      const student = studentsByEmail.get(scenarioStudent.email);
      if (!student) {
        throw new Error(`missing persisted demo student: ${scenarioStudent.email}`);
      }
      return student;
    };

    await transaction.insert(schema.assessments).values(
      scenario.assessments.map(({ studentIndex, ...assessment }) => ({
        ...assessment,
        studentId: resolveStudent(studentIndex).id,
      })),
    );

    const workoutDaysByKey = new Map<string, PersistedWorkoutDay>();
    const workoutExercisesByKey = new Map<string, PersistedWorkoutExercise>();

    for (const scenarioPlan of scenario.plans) {
      const { studentIndex, days, ...planValues } = scenarioPlan;
      const student = resolveStudent(studentIndex);
      const [plan] = await transaction
        .insert(schema.workoutPlans)
        .values({
          ...planValues,
          studentId: student.id,
          trainerId: student.isIndependent ? null : trainer.id,
        })
        .returning();
      if (!plan) throw new Error(`failed to seed demo plan for student ${studentIndex}`);

      const insertedDays = await transaction
        .insert(schema.workoutDays)
        .values(
          days.map((day) => ({
            planId: plan.id,
            label: day.label,
            dayOrder: day.dayOrder,
          })),
        )
        .returning();

      for (const scenarioDay of days) {
        const day = insertedDays.find(
          (insertedDay) => insertedDay.dayOrder === scenarioDay.dayOrder,
        );
        if (!day) {
          throw new Error(
            `failed to seed demo day ${scenarioDay.dayOrder} for student ${studentIndex}`,
          );
        }
        workoutDaysByKey.set(workoutDayKey(studentIndex, day.dayOrder), day);

        const insertedWorkoutExercises = await transaction
          .insert(schema.workoutExercises)
          .values(
            scenarioDay.exercises.map(({ exerciseName, ...exercise }) => ({
              ...exercise,
              workoutDayId: day.id,
              exerciseId: findExerciseId(exercises, exerciseName),
            })),
          )
          .returning();

        for (const scenarioExercise of scenarioDay.exercises) {
          const exercise = insertedWorkoutExercises.find(
            (insertedExercise) => insertedExercise.exerciseOrder === scenarioExercise.exerciseOrder,
          );
          if (!exercise) {
            throw new Error(
              `failed to seed exercise ${scenarioExercise.exerciseOrder} for student ${studentIndex} day ${scenarioDay.dayOrder}`,
            );
          }
          workoutExercisesByKey.set(
            workoutExerciseKey(studentIndex, scenarioDay.dayOrder, exercise.exerciseOrder),
            exercise,
          );
        }
      }
    }

    for (const scenarioLog of scenario.logs) {
      const { studentIndex, workoutDayOrder, sets, ...logValues } = scenarioLog;
      const student = resolveStudent(studentIndex);
      const workoutDay = workoutDaysByKey.get(workoutDayKey(studentIndex, workoutDayOrder));
      if (!workoutDay) {
        throw new Error(`missing workout day ${workoutDayOrder} for student ${studentIndex}`);
      }

      const [log] = await transaction
        .insert(schema.workoutLogs)
        .values({
          ...logValues,
          studentId: student.id,
          workoutDayId: workoutDay.id,
        })
        .returning();
      if (!log) throw new Error(`failed to seed workout log for student ${studentIndex}`);

      await transaction.insert(schema.logSets).values(
        sets.map(({ exerciseOrder, ...set }) => {
          const workoutExercise = workoutExercisesByKey.get(
            workoutExerciseKey(studentIndex, workoutDayOrder, exerciseOrder),
          );
          if (!workoutExercise) {
            throw new Error(
              `missing workout exercise ${exerciseOrder} for student ${studentIndex} day ${workoutDayOrder}`,
            );
          }
          return {
            ...set,
            workoutLogId: log.id,
            workoutExerciseId: workoutExercise.id,
          };
        }),
      );
    }
  });
}
