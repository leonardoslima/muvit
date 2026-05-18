import { fileURLToPath } from 'node:url';
import { eq, inArray, isNull } from 'drizzle-orm';
import { db, queryClient, schema } from './index.js';
import { globalExercises } from './seeds/exercises.js';

const demoPasswordHash = '$2a$10$dFP5Ssm4SVP5zZwOl8aqFeORsVWb9Mn1hmwAYboTcZZisCymYiQM2';

export const demoCredentials = {
  password: '12345678',
  trainer: {
    email: 'trainer@muvit.dev',
    name: 'Trainer Demo',
  },
  students: [
    { email: 'alice.aluna@muvit.dev', name: 'Alice Aluna' },
    { email: 'bruno.aluno@muvit.dev', name: 'Bruno Aluno' },
    { email: 'carla.aluna@muvit.dev', name: 'Carla Aluna' },
  ],
} as const;

const today = () => new Date().toISOString().slice(0, 10);

async function seedGlobalExercises() {
  await db.delete(schema.exercises).where(isNull(schema.exercises.trainerId));

  const inserted = await db
    .insert(schema.exercises)
    .values(globalExercises.map((e) => ({ ...e, trainerId: null })))
    .returning();

  console.log(`seeded ${globalExercises.length} global exercises`);

  return inserted;
}

const findExerciseId = (exercises: Array<typeof schema.exercises.$inferSelect>, name: string) => {
  const exercise = exercises.find((item) => item.name === name);
  if (!exercise) throw new Error(`missing seeded exercise: ${name}`);
  return exercise.id;
};

export async function seedDemoData() {
  const studentEmails = demoCredentials.students.map((student) => student.email);

  await db.delete(schema.students).where(inArray(schema.students.email, studentEmails));
  await db.delete(schema.trainers).where(eq(schema.trainers.email, demoCredentials.trainer.email));

  const exercises = await seedGlobalExercises();

  const [trainer] = await db
    .insert(schema.trainers)
    .values({
      email: demoCredentials.trainer.email,
      name: demoCredentials.trainer.name,
      passwordHash: demoPasswordHash,
      plan: 'pro',
    })
    .returning();
  if (!trainer) throw new Error('failed to seed demo trainer');

  const [alice, bruno, carla] = await db
    .insert(schema.students)
    .values([
      {
        trainerId: trainer.id,
        isIndependent: false,
        name: demoCredentials.students[0].name,
        email: demoCredentials.students[0].email,
        passwordHash: demoPasswordHash,
        phone: '+55 11 90000-0001',
        birthDate: '1994-04-12',
        gender: 'female',
        goals: 'Ganhar forca e melhorar composicao corporal.',
        restrictions: 'Evitar impacto alto no joelho direito.',
        status: 'active',
      },
      {
        trainerId: trainer.id,
        isIndependent: false,
        name: demoCredentials.students[1].name,
        email: demoCredentials.students[1].email,
        passwordHash: demoPasswordHash,
        phone: '+55 11 90000-0002',
        birthDate: '1989-09-02',
        gender: 'male',
        goals: 'Hipertrofia com foco em membros superiores.',
        restrictions: null,
        status: 'paused',
      },
      {
        trainerId: trainer.id,
        isIndependent: false,
        name: demoCredentials.students[2].name,
        email: demoCredentials.students[2].email,
        passwordHash: demoPasswordHash,
        phone: '+55 11 90000-0003',
        birthDate: '1997-01-28',
        gender: 'female',
        goals: 'Retomar rotina apos pausa.',
        restrictions: 'Historico de lombalgia.',
        status: 'inactive',
      },
    ])
    .returning();
  if (!alice || !bruno || !carla) throw new Error('failed to seed demo students');

  await db.insert(schema.assessments).values({
    studentId: alice.id,
    date: today(),
    weightKg: '68.40',
    heightCm: '167.0',
    bodyFatPct: '24.5',
    measurements: {
      chest: 91,
      waist: 74,
      hip: 101,
      armRight: 30,
      armLeft: 29,
      thighRight: 58,
      thighLeft: 57,
    },
    photos: [],
    notes: 'Boa aderencia ao plano inicial. Priorizar progressao gradual.',
  });

  const [plan] = await db
    .insert(schema.workoutPlans)
    .values({
      studentId: alice.id,
      trainerId: trainer.id,
      name: 'Forca e hipertrofia - iniciante',
      startDate: today(),
      status: 'active',
      notes: 'Treino demo para validar dashboard, detalhes do aluno e registro de execucao.',
    })
    .returning();
  if (!plan) throw new Error('failed to seed demo workout plan');

  const [dayA, dayB] = await db
    .insert(schema.workoutDays)
    .values([
      { planId: plan.id, label: 'Treino A', dayOrder: 1 },
      { planId: plan.id, label: 'Treino B', dayOrder: 2 },
    ])
    .returning();
  if (!dayA || !dayB) throw new Error('failed to seed demo workout days');

  const [squat, bench, row] = await db
    .insert(schema.workoutExercises)
    .values([
      {
        workoutDayId: dayA.id,
        exerciseId: findExerciseId(exercises, 'Agachamento livre'),
        exerciseOrder: 1,
        sets: 4,
        reps: '8-10',
        restSeconds: 90,
        loadKg: '40.0',
        tempo: '3010',
        notes: 'Manter amplitude confortavel.',
      },
      {
        workoutDayId: dayA.id,
        exerciseId: findExerciseId(exercises, 'Supino reto com barra'),
        exerciseOrder: 2,
        sets: 3,
        reps: '10',
        restSeconds: 75,
        loadKg: '25.0',
      },
      {
        workoutDayId: dayB.id,
        exerciseId: findExerciseId(exercises, 'Remada baixa'),
        exerciseOrder: 1,
        sets: 3,
        reps: '12',
        restSeconds: 60,
        loadKg: '30.0',
      },
    ])
    .returning();
  if (!squat || !bench || !row) throw new Error('failed to seed demo workout exercises');

  const [log] = await db
    .insert(schema.workoutLogs)
    .values({
      studentId: alice.id,
      workoutDayId: dayA.id,
      date: today(),
      durationMin: 52,
      rpe: 7,
      notes: 'Concluiu com boa tecnica.',
      completed: true,
    })
    .returning();
  if (!log) throw new Error('failed to seed demo workout log');

  await db.insert(schema.logSets).values([
    {
      workoutLogId: log.id,
      workoutExerciseId: squat.id,
      setNumber: 1,
      repsDone: 10,
      loadKg: '40.0',
      completed: true,
    },
    {
      workoutLogId: log.id,
      workoutExerciseId: squat.id,
      setNumber: 2,
      repsDone: 9,
      loadKg: '40.0',
      completed: true,
    },
    {
      workoutLogId: log.id,
      workoutExerciseId: bench.id,
      setNumber: 1,
      repsDone: 10,
      loadKg: '25.0',
      completed: true,
    },
  ]);

  console.log('demo login: trainer@muvit.dev / 12345678');
  console.log('demo student: alice.aluna@muvit.dev / 12345678');
}

async function main() {
  await seedDemoData();
  await queryClient.end();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
