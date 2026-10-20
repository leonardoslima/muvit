import { fakerPT_BR } from '@faker-js/faker';
import type {
  AssessmentMeasurements,
  NewAssessment,
  NewStudent,
  NewWorkoutPlan,
} from '../schema/index.js';

export const DEMO_RANDOM_SEED = 20260716;

export type DemoIdentity = {
  authUserId: string;
  profileId: string;
  email: string;
  name: string;
};

export type DemoIdentities = {
  trainer: DemoIdentity;
  independentStudent: DemoIdentity;
};

type DemoProfileMedia = {
  avatarUrl: string | null;
  assessmentPhotos: string[];
};

export type DemoMedia = DemoProfileMedia & {
  independentStudent?: DemoProfileMedia;
};

const emptyMedia: DemoMedia = { avatarUrl: null, assessmentPhotos: [] };

export type DemoStudent = Omit<NewStudent, 'trainerId'> & {
  email: string;
};

export type DemoAssessment = Omit<NewAssessment, 'studentId'> & {
  studentIndex: number;
};

export type DemoExercise = {
  exerciseName: string;
  exerciseOrder: number;
  sets: number;
  reps: string;
  restSeconds: number;
  loadKg: string;
  tempo?: string;
  notes?: string;
};

export type DemoDay = {
  label: string;
  dayOrder: number;
  exercises: DemoExercise[];
};

export type DemoPlan = Omit<NewWorkoutPlan, 'studentId' | 'trainerId'> & {
  studentIndex: number;
  days: DemoDay[];
};

export type DemoSet = {
  exerciseOrder: number;
  setNumber: number;
  repsDone: number;
  loadKg: string;
  completed: boolean;
};

export type DemoLog = {
  studentIndex: number;
  workoutDayOrder: number;
  date: string;
  durationMin: number;
  rpe: number;
  notes: string;
  completed: boolean;
  createdAt: Date;
  sets: DemoSet[];
};

export type DemoScenario = {
  trainer: DemoIdentity;
  students: DemoStudent[];
  assessments: DemoAssessment[];
  plans: DemoPlan[];
  logs: DemoLog[];
};

const studentStatuses = [
  'active',
  'active',
  'active',
  'active',
  'active',
  'active',
  'paused',
  'paused',
  'inactive',
  'inactive',
] as const;

const studentGenders = [
  'female',
  'male',
  'female',
  'male',
  'other',
  'female',
  'male',
  'female',
  'male',
  'other',
] as const;

const createdOffsets = [2, 5, 14, 21, 35, 50, 70, 90, 120, 150] as const;

const assessmentOffsets = [
  [70, 35, 7],
  [72, 38, 9],
  [68, 34, 11],
  [75, 40, 13],
  [65, 33, 15],
  [73, 36, 17],
  [60, 21],
  [70, 28],
  [80],
  [65],
  [90, 60, 30, 7],
] as const;

const planStatuses = [
  'active',
  'active',
  'active',
  'active',
  'active',
  'active',
  'archived',
  'draft',
  'archived',
  'archived',
  'active',
] as const;

const logCounts = [7, 7, 6, 6, 5, 5, 2, 0, 0, 0, 14] as const;

const exerciseNames = [
  'Agachamento livre',
  'Supino reto com barra',
  'Remada baixa',
  'Puxada frontal',
  'Desenvolvimento militar',
  'Elevação lateral',
  'Rosca direta',
  'Tríceps corda',
  'Leg press 45°',
  'Mesa flexora',
  'Hip thrust',
  'Prancha',
  'Agachamento goblet — demo',
  'Remada unilateral — demo',
  'Ponte de glúteos — demo',
  'Prancha lateral — demo',
] as const;

const goals = [
  'Ganhar força e melhorar a composição corporal.',
  'Aumentar massa muscular com progressão segura.',
  'Melhorar o condicionamento para atividades do dia a dia.',
  'Reduzir gordura corporal preservando massa magra.',
  'Retomar a rotina de exercícios com consistência.',
] as const;

const restrictions = [
  'Sem restrições relatadas nesta demonstração.',
  'Evitar impacto alto no joelho direito.',
  'Monitorar desconforto lombar em exercícios de flexão.',
  'Respeitar amplitude confortável do ombro esquerdo.',
] as const;

const planNames = [
  'Força e hipertrofia',
  'Condicionamento geral',
  'Retorno progressivo',
  'Hipertrofia intermediária',
  'Mobilidade e força',
] as const;

const toDateString = (date: Date): string => date.toISOString().slice(0, 10);

const daysBefore = (referenceDate: Date, amount: number): Date => {
  const date = new Date(referenceDate);
  date.setUTCDate(date.getUTCDate() - amount);
  return date;
};

const decimal = (value: number, digits: number): string => value.toFixed(digits);

const buildMeasurements = (baseWaist: number, assessmentIndex: number): AssessmentMeasurements => ({
  chest: baseWaist + 16 + assessmentIndex,
  waist: baseWaist - assessmentIndex,
  hip: baseWaist + 24,
  armRight: 28 + assessmentIndex,
  armLeft: 28 + assessmentIndex,
  thighRight: 54 + assessmentIndex,
  thighLeft: 54 + assessmentIndex,
  calfRight: 36,
  calfLeft: 36,
});

const buildStudents = (
  identities: DemoIdentities,
  referenceDate: Date,
  media: DemoMedia,
): DemoStudent[] => {
  const managedStudents = studentStatuses.map((status, studentIndex): DemoStudent => {
    const createdOffset = createdOffsets[studentIndex];
    const gender = studentGenders[studentIndex];
    if (createdOffset === undefined || gender === undefined) {
      throw new Error(`missing demo student distribution at index ${studentIndex}`);
    }

    return {
      authUserId: null,
      isIndependent: false,
      name: fakerPT_BR.person.fullName(),
      email: `aluno${String(studentIndex + 1).padStart(2, '0')}@muvit.dev`,
      phone: fakerPT_BR.phone.number().slice(0, 20),
      birthDate: toDateString(fakerPT_BR.date.birthdate({ min: 18, max: 55, mode: 'age' })),
      gender,
      goals: fakerPT_BR.helpers.arrayElement(goals),
      restrictions: fakerPT_BR.helpers.arrayElement(restrictions),
      status,
      avatarUrl: media.avatarUrl,
      expoPushToken: null,
      createdAt: daysBefore(referenceDate, createdOffset),
    };
  });

  return [
    ...managedStudents,
    {
      id: identities.independentStudent.profileId,
      authUserId: identities.independentStudent.authUserId,
      isIndependent: true,
      name: identities.independentStudent.name,
      email: identities.independentStudent.email,
      phone: '(11) 99999-0011',
      birthDate: '1994-05-18',
      gender: 'male',
      goals: 'Manter uma rotina de treinos com autonomia.',
      restrictions: 'Sem restrições relatadas nesta demonstração.',
      status: 'active',
      avatarUrl: (media.independentStudent ?? media).avatarUrl,
      expoPushToken: null,
      createdAt: daysBefore(referenceDate, 45),
    },
  ];
};

const buildAssessments = (referenceDate: Date, media: DemoMedia): DemoAssessment[] =>
  assessmentOffsets.flatMap((offsets, studentIndex) => {
    const baseWeight = fakerPT_BR.number.float({ min: 58, max: 96, fractionDigits: 1 });
    const baseBodyFat = fakerPT_BR.number.float({ min: 18, max: 31, fractionDigits: 1 });
    const baseWaist = fakerPT_BR.number.int({ min: 70, max: 94 });

    return offsets.map((offset, assessmentIndex) => {
      const assessmentDate = daysBefore(referenceDate, offset);
      return {
        studentIndex,
        date: toDateString(assessmentDate),
        weightKg: decimal(baseWeight - assessmentIndex * 0.8, 2),
        heightCm: decimal(158 + studentIndex * 2.3, 1),
        bodyFatPct: decimal(baseBodyFat - assessmentIndex * 0.5, 1),
        measurements: buildMeasurements(baseWaist, assessmentIndex),
        photos: [
          ...(studentIndex === 10
            ? (media.independentStudent ?? media).assessmentPhotos
            : media.assessmentPhotos),
        ],
        notes: fakerPT_BR.helpers.arrayElement([
          'Boa evolução e aderência ao planejamento.',
          'Manter progressão gradual nas próximas semanas.',
          'Revisar recuperação e qualidade do sono.',
        ]),
        createdAt: assessmentDate,
      };
    });
  });

const buildPlans = (referenceDate: Date): DemoPlan[] =>
  planStatuses.map((status, studentIndex) => {
    const availableExercises = studentIndex === 10 ? exerciseNames.slice(0, 12) : exerciseNames;
    const dayCount = 2 + (studentIndex % 3);
    const days = Array.from({ length: dayCount }, (_, dayIndex): DemoDay => {
      const exerciseCount = 4 + ((studentIndex + dayIndex) % 3);
      const exercises = Array.from({ length: exerciseCount }, (_, exerciseIndex): DemoExercise => {
        const exerciseName =
          availableExercises[
            (studentIndex * 3 + dayIndex * 2 + exerciseIndex) % availableExercises.length
          ];
        if (!exerciseName) throw new Error('failed to resolve demo exercise name');

        return {
          exerciseName,
          exerciseOrder: exerciseIndex + 1,
          sets: 3 + ((studentIndex + exerciseIndex) % 2),
          reps: fakerPT_BR.helpers.arrayElement(['8-10', '10-12', '12', '15']),
          restSeconds: fakerPT_BR.helpers.arrayElement([60, 75, 90]),
          loadKg: String(fakerPT_BR.number.int({ min: 8, max: 72 })),
          tempo: exerciseIndex % 2 === 0 ? '3010' : '2011',
          notes: 'Prescrição fictícia para QA: priorizar técnica e amplitude confortável.',
        };
      });

      return {
        label: `Treino ${String.fromCharCode(65 + dayIndex)}`,
        dayOrder: dayIndex + 1,
        exercises,
      };
    });

    return {
      studentIndex,
      name: `${fakerPT_BR.helpers.arrayElement(planNames)} — ${studentIndex + 1}`,
      startDate: toDateString(daysBefore(referenceDate, 84 - studentIndex * 3)),
      endDate: toDateString(daysBefore(referenceDate, status === 'archived' ? 10 : -42)),
      status,
      notes: 'Plano fictício gerado para testes manuais do Muvit.',
      createdAt: daysBefore(referenceDate, 90 - studentIndex * 3),
      days,
    };
  });

const buildLogs = (referenceDate: Date, plans: DemoPlan[]): DemoLog[] =>
  logCounts.flatMap((logCount, studentIndex) => {
    const plan = plans[studentIndex];
    if (!plan) throw new Error(`missing demo plan for student ${studentIndex}`);

    return Array.from({ length: logCount }, (_, logIndex): DemoLog => {
      const day = plan.days[logIndex % plan.days.length];
      if (!day) throw new Error(`missing demo day for student ${studentIndex}`);
      const completed = (studentIndex + logIndex) % 5 !== 0;
      const logDate = daysBefore(
        referenceDate,
        (plan.status === 'archived' ? 12 : 2) + logIndex * 3,
      );
      const sets = day.exercises.flatMap((exercise) =>
        Array.from(
          { length: exercise.sets },
          (_, setIndex): DemoSet => ({
            exerciseOrder: exercise.exerciseOrder,
            setNumber: setIndex + 1,
            repsDone: Math.max(6, 11 - setIndex - ((studentIndex + logIndex) % 3)),
            loadKg: exercise.loadKg,
            completed: completed || exercise.exerciseOrder < 3,
          }),
        ),
      );

      return {
        studentIndex,
        workoutDayOrder: day.dayOrder,
        date: toDateString(logDate),
        durationMin: fakerPT_BR.number.int({ min: 38, max: 72 }),
        rpe: fakerPT_BR.number.int({ min: 6, max: 9 }),
        notes: completed
          ? 'Treino concluído com boa execução.'
          : 'Treino interrompido antes da última série.',
        completed,
        createdAt: logDate,
        sets,
      };
    });
  });

export const buildDemoScenario = (
  identities: DemoIdentities,
  referenceDate: Date = new Date(),
  media: DemoMedia = emptyMedia,
): DemoScenario => {
  fakerPT_BR.seed(DEMO_RANDOM_SEED);
  fakerPT_BR.setDefaultRefDate(referenceDate);

  const students = buildStudents(identities, referenceDate, media);
  const assessments = buildAssessments(referenceDate, media);
  const plans = buildPlans(referenceDate);
  const logs = buildLogs(referenceDate, plans);

  return {
    trainer: identities.trainer,
    students,
    assessments,
    plans,
    logs,
  };
};
