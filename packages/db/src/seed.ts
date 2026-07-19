import { fileURLToPath } from 'node:url';
import { eq, inArray, isNull } from 'drizzle-orm';
import { db, queryClient, schema } from './index.js';
import { buildDemoScenario, demoCredentials } from './seeds/demo.js';
import { globalExercises } from './seeds/exercises.js';

export { demoCredentials } from './seeds/demo.js';

const demoTrainerAuthUserId = '00000000-0000-4000-8000-000000000001';

const legacyStudentEmails: string[] = [
  'alice.aluna@muvit.dev',
  'bruno.aluno@muvit.dev',
  'carla.aluna@muvit.dev',
];

type PersistedExercise = typeof schema.exercises.$inferSelect;
type PersistedStudent = typeof schema.students.$inferSelect;
type PersistedWorkoutDay = typeof schema.workoutDays.$inferSelect;
type PersistedWorkoutExercise = typeof schema.workoutExercises.$inferSelect;

const workoutDayKey = (studentIndex: number, dayOrder: number): string =>
  `${studentIndex}:${dayOrder}`;

const workoutExerciseKey = (
  studentIndex: number,
  dayOrder: number,
  exerciseOrder: number,
): string => `${studentIndex}:${dayOrder}:${exerciseOrder}`;

async function clearDemoData(): Promise<void> {
  const existingTrainers = await db
    .select({ id: schema.trainers.id })
    .from(schema.trainers)
    .where(eq(schema.trainers.email, demoCredentials.trainer.email));

  for (const trainer of existingTrainers) {
    await db.delete(schema.students).where(eq(schema.students.trainerId, trainer.id));
  }

  await db.delete(schema.students).where(inArray(schema.students.email, legacyStudentEmails));
  await db.delete(schema.trainers).where(eq(schema.trainers.email, demoCredentials.trainer.email));
  await db.delete(schema.authUsers).where(eq(schema.authUsers.email, demoCredentials.trainer.email));
}

async function seedGlobalExercises(): Promise<PersistedExercise[]> {
  const existing = await db
    .select()
    .from(schema.exercises)
    .where(isNull(schema.exercises.trainerId));
  const existingNames = new Set(existing.map((exercise) => exercise.name));
  const missing = globalExercises.filter((exercise) => !existingNames.has(exercise.name));
  const inserted =
    missing.length === 0
      ? []
      : await db
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

export async function seedDemoData(referenceDate: Date = new Date()): Promise<void> {
  const scenario = buildDemoScenario(referenceDate);

  await clearDemoData();
  const exercises = await seedGlobalExercises();

  const [authUser] = await db
    .insert(schema.authUsers)
    .values({
      id: demoTrainerAuthUserId,
      email: scenario.credentials.trainer.email,
      name: scenario.credentials.trainer.name,
      role: 'trainer',
    })
    .returning();
  if (!authUser) throw new Error('failed to seed demo auth user');

  const [trainer] = await db
    .insert(schema.trainers)
    .values({
      authUserId: authUser.id,
      email: scenario.credentials.trainer.email,
      name: scenario.credentials.trainer.name,
      plan: 'pro',
    })
    .returning();
  if (!trainer) throw new Error('failed to seed demo trainer');

  const insertedStudents = await db
    .insert(schema.students)
    .values(
      scenario.students.map((student) => ({
        ...student,
        trainerId: trainer.id,
      })),
    )
    .returning();
  if (insertedStudents.length !== scenario.students.length) {
    throw new Error('failed to seed all demo students');
  }
  const studentsByEmail = mapStudentsByEmail(insertedStudents);

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

  await db.insert(schema.assessments).values(
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
    const [plan] = await db
      .insert(schema.workoutPlans)
      .values({
        ...planValues,
        studentId: student.id,
        trainerId: trainer.id,
      })
      .returning();
    if (!plan) throw new Error(`failed to seed demo plan for student ${studentIndex}`);

    const insertedDays = await db
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
      const day = insertedDays.find((insertedDay) => insertedDay.dayOrder === scenarioDay.dayOrder);
      if (!day) {
        throw new Error(
          `failed to seed demo day ${scenarioDay.dayOrder} for student ${studentIndex}`,
        );
      }
      workoutDaysByKey.set(workoutDayKey(studentIndex, day.dayOrder), day);

      const insertedWorkoutExercises = await db
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

    const [log] = await db
      .insert(schema.workoutLogs)
      .values({
        ...logValues,
        studentId: student.id,
        workoutDayId: workoutDay.id,
      })
      .returning();
    if (!log) throw new Error(`failed to seed workout log for student ${studentIndex}`);

    await db.insert(schema.logSets).values(
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

}

async function main(): Promise<void> {
  await seedDemoData();
  await queryClient.end();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
