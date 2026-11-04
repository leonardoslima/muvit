import { randomUUID } from 'node:crypto';
import { db, queryClient, schema } from '@muvit/db';
import { and, eq, inArray, isNull, like } from 'drizzle-orm';

export type Scenario = 'aluno' | 'professor' | 'isolamento';
export type FixtureCredentials = {
  studentA: { name: string; email: string; password: string };
  studentB: { name: string; email: string; password: string };
  trainerA: { name: string; email: string; password: string };
  trainerB: { name: string; email: string; password: string };
};
type Credential = FixtureCredentials[keyof FixtureCredentials];
type FixtureAccount = { authUserId: string; profileId: string; name: string };
type Account = FixtureAccount & { cookie: string; email: string };
type Student = { id: string; name: string };
type Plan = {
  id: string;
  name: string;
  dayId: string;
  workoutExerciseId: string;
  exerciseSets: number;
  exerciseReps: string;
  exerciseLoadKg: number;
};
type Assessment = {
  id: string;
  date: string;
  weightKg: string;
  heightCm: string | null;
  notes: string | null;
};

export async function cleanupScenarioFixture(input: {
  runId: string;
  scenario: Scenario;
}): Promise<void> {
  const accountEmailPattern = `mobile-e2e-${input.runId}-${input.scenario}-%@example.invalid`;
  const linkedStudentEmailPattern = `linked-${input.runId}-${input.scenario}-%@example.invalid`;
  const exerciseName = `Exercicio E2E ${input.runId}-${input.scenario}`;

  await db.transaction(async (tx) => {
    const linkedStudents = await tx
      .select({ id: schema.students.id })
      .from(schema.students)
      .where(like(schema.students.email, linkedStudentEmailPattern));
    if (linkedStudents.length > 0) {
      await tx.delete(schema.students).where(
        inArray(
          schema.students.id,
          linkedStudents.map((student) => student.id),
        ),
      );
    }

    const users = await tx
      .select({ id: schema.authUsers.id })
      .from(schema.authUsers)
      .where(like(schema.authUsers.email, accountEmailPattern));
    if (users.length > 0) {
      await tx.delete(schema.authUsers).where(
        inArray(
          schema.authUsers.id,
          users.map((user) => user.id),
        ),
      );
    }

    await tx.delete(schema.exercises).where(eq(schema.exercises.name, exerciseName));
  });
}

export type FixtureManifest = {
  runId: string;
  scenario: Scenario;
  referenceDate: string;
  exerciseName: string;
  exerciseId: string;
  independentStudents?: { a: FixtureAccount; b: FixtureAccount };
  trainers?: { a: FixtureAccount; b: FixtureAccount };
  linkedStudents?: { a: Student; b: Student };
  plans: {
    independentA?: Plan;
    independentB?: Plan;
    trainerStudentA?: Plan;
    trainerStudentB?: Plan;
  };
  assessments: {
    independentA?: Assessment;
    independentB?: Assessment;
    trainerStudentA?: Assessment;
    trainerStudentB?: Assessment;
  };
  foreign?: { studentId: string; planId: string; assessmentId: string; dayId: string };
  foreignIndependent?: {
    studentId: string;
    planId: string;
    assessmentId: string;
    dayId: string;
    logId: string;
  };
};

type ApiResult<T = unknown> = { status: number; data: T };

async function api<T = unknown>(
  baseUrl: string,
  path: string,
  options: { method?: string; cookie?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const response = await fetch(new URL(path, baseUrl), {
    method: options.method ?? 'GET',
    headers: {
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: response.status, data: data as T };
}

function expectStatus<T>(result: ApiResult<T>, status: number, label: string): T {
  if (result.status !== status)
    throw new Error(`${label}: status inesperado ${result.status}, esperado ${status}`);
  return result.data;
}

function cookieFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(';', 1)[0])
    .join('; ');
}

async function createAccount(
  baseUrl: string,
  credential: Credential,
  role: 'trainer' | 'student',
): Promise<Account> {
  const response = await fetch(new URL('/api/auth/sign-up/email', baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'muvit://' },
    body: JSON.stringify({ ...credential, role }),
  });
  if (!response.ok)
    throw new Error(`Signup de fixture ${role} falhou com status ${response.status}`);
  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null || !('user' in body))
    throw new Error('Identidade de fixture ausente');
  const user = body.user;
  if (typeof user !== 'object' || user === null || !('id' in user) || typeof user.id !== 'string') {
    throw new Error('Identidade de fixture inválida');
  }
  const authUserId = user.id;
  const profile =
    role === 'trainer'
      ? await db.query.trainers.findFirst({ where: eq(schema.trainers.authUserId, authUserId) })
      : await db.query.students.findFirst({ where: eq(schema.students.authUserId, authUserId) });
  if (!profile) throw new Error('Perfil de domínio da fixture ausente');
  const cookie = cookieFrom(response);
  if (!cookie) throw new Error('Sessão de fixture ausente');
  return {
    authUserId,
    profileId: profile.id,
    cookie,
    name: credential.name,
    email: credential.email,
  };
}

async function signInAccount(
  baseUrl: string,
  credential: Credential,
  role: 'trainer' | 'student',
  metadata: FixtureAccount,
): Promise<Account> {
  const response = await fetch(new URL('/api/auth/sign-in/email', baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'muvit://' },
    body: JSON.stringify({ email: credential.email, password: credential.password }),
  });
  if (!response.ok)
    throw new Error(`Signin de fixture ${role} falhou com status ${response.status}`);
  const cookie = cookieFrom(response);
  if (!cookie) throw new Error('Sessão de fixture ausente');
  return { ...metadata, cookie, email: credential.email };
}

function publicAccount(account: Account): FixtureAccount {
  return { authUserId: account.authUserId, profileId: account.profileId, name: account.name };
}

async function createLinkedStudent(
  baseUrl: string,
  trainer: Account,
  name: string,
  suffix: string,
): Promise<Student> {
  const result = await api<{ id: string; name: string }>(baseUrl, '/students', {
    method: 'POST',
    cookie: trainer.cookie,
    body: { name, email: `linked-${suffix}@example.invalid` },
  });
  const data = expectStatus(result, 201, 'Criação do aluno vinculado');
  return { id: data.id, name: data.name };
}

async function createPlan(
  baseUrl: string,
  owner: Account,
  studentId: string,
  exerciseId: string,
  date: string,
  name: string,
): Promise<Plan> {
  const result = await api<{
    id: string;
    name: string;
    days: Array<{
      id: string;
      exercises: Array<{ id: string; sets: number; reps: string; loadKg: string | number }>;
    }>;
  }>(baseUrl, '/workout-plans', {
    method: 'POST',
    cookie: owner.cookie,
    body: {
      studentId,
      name,
      startDate: date,
      status: 'active',
      days: [
        {
          label: 'Treino de hoje',
          dayOrder: 0,
          exercises: [
            { exerciseId, exerciseOrder: 0, sets: 2, reps: '10', loadKg: 20, restSeconds: 0 },
          ],
        },
      ],
    },
  });
  const data = expectStatus(result, 201, 'Criação do plano');
  const day = data.days[0];
  const exercise = day?.exercises[0];
  if (!day || !exercise) throw new Error('Plano fixture sem dia ou exercício');
  return {
    id: data.id,
    name: data.name,
    dayId: day.id,
    workoutExerciseId: exercise.id,
    exerciseSets: exercise.sets,
    exerciseReps: exercise.reps,
    exerciseLoadKg: Number(exercise.loadKg),
  };
}

async function createAssessment(
  baseUrl: string,
  owner: Account,
  student: Student | Account,
  date: string,
  weightKg: number,
  notes: string,
): Promise<Assessment> {
  const isIndependent = 'authUserId' in student;
  const path = isIndependent ? '/students/me/assessments' : `/students/${student.id}/assessments`;
  const result = await api<Assessment>(baseUrl, path, {
    method: 'POST',
    cookie: owner.cookie,
    body: { date, weightKg, ...(isIndependent ? {} : { heightCm: 170 }), notes },
  });
  return expectStatus(result, 201, 'Criação da avaliação');
}

async function insertGlobalExercise(name: string): Promise<string> {
  const existing = await db.query.exercises.findFirst({
    where: and(eq(schema.exercises.name, name), isNull(schema.exercises.trainerId)),
  });
  if (existing) throw new Error('Exercício global já existe para este run');
  const [exercise] = await db
    .insert(schema.exercises)
    .values({
      name,
      muscleGroup: 'full_body',
      equipment: null,
      videoUrl: null,
      instructions: null,
    })
    .returning({ id: schema.exercises.id });
  if (!exercise) throw new Error('Falha ao inserir exercício global da fixture');
  return exercise.id;
}

export async function prepareScenario(input: {
  apiUrl: string;
  credentials: FixtureCredentials;
  date: string;
  runId: string;
  scenario: Scenario;
  exerciseName?: string;
}): Promise<FixtureManifest> {
  const exerciseName = input.exerciseName ?? `Exercicio E2E ${input.runId}-${input.scenario}`;
  const exerciseId = await insertGlobalExercise(exerciseName);
  const manifest: FixtureManifest = {
    runId: input.runId,
    scenario: input.scenario,
    referenceDate: input.date,
    exerciseName,
    exerciseId,
    plans: {},
    assessments: {},
  };

  if (input.scenario === 'aluno' || input.scenario === 'isolamento') {
    const a = await createAccount(input.apiUrl, input.credentials.studentA, 'student');
    const b = await createAccount(input.apiUrl, input.credentials.studentB, 'student');
    manifest.independentStudents = { a: publicAccount(a), b: publicAccount(b) };
    manifest.plans.independentA = await createPlan(
      input.apiUrl,
      a,
      a.profileId,
      exerciseId,
      input.date,
      `Treino E2E ${input.runId} ${input.scenario} A`,
    );
    manifest.plans.independentB = await createPlan(
      input.apiUrl,
      b,
      b.profileId,
      exerciseId,
      input.date,
      `Treino E2E ${input.runId} ${input.scenario} B`,
    );
    manifest.assessments.independentA = await createAssessment(
      input.apiUrl,
      a,
      a,
      input.date,
      70,
      'Baseline E2E A',
    );
    manifest.assessments.independentB = await createAssessment(
      input.apiUrl,
      b,
      b,
      input.date,
      90,
      'Baseline E2E B',
    );
  }

  if (input.scenario === 'professor' || input.scenario === 'isolamento') {
    const trainerA = await createAccount(input.apiUrl, input.credentials.trainerA, 'trainer');
    const trainerB = await createAccount(input.apiUrl, input.credentials.trainerB, 'trainer');
    manifest.trainers = { a: publicAccount(trainerA), b: publicAccount(trainerB) };
    expectStatus(
      await api(input.apiUrl, '/trainers/onboarding', {
        method: 'POST',
        cookie: trainerA.cookie,
        body: {},
      }),
      200,
      'Onboarding professor A',
    );
    expectStatus(
      await api(input.apiUrl, '/trainers/onboarding', {
        method: 'POST',
        cookie: trainerB.cookie,
        body: {},
      }),
      200,
      'Onboarding professor B',
    );
    const studentA = await createLinkedStudent(
      input.apiUrl,
      trainerA,
      `Aluno E2E A ${input.runId} ${input.scenario}`,
      `${input.runId}-${input.scenario}-ta`,
    );
    const studentB = await createLinkedStudent(
      input.apiUrl,
      trainerB,
      `Aluno E2E B ${input.runId} ${input.scenario}`,
      `${input.runId}-${input.scenario}-tb`,
    );
    manifest.linkedStudents = { a: studentA, b: studentB };
    manifest.plans.trainerStudentA = await createPlan(
      input.apiUrl,
      trainerA,
      studentA.id,
      exerciseId,
      input.date,
      `Treino Professor E2E ${input.runId} ${input.scenario} A`,
    );
    manifest.plans.trainerStudentB = await createPlan(
      input.apiUrl,
      trainerB,
      studentB.id,
      exerciseId,
      input.date,
      `Treino Professor E2E ${input.runId} ${input.scenario} B`,
    );
    if (input.scenario === 'isolamento') {
      manifest.assessments.trainerStudentA = await createAssessment(
        input.apiUrl,
        trainerA,
        studentA,
        input.date,
        65,
        'Baseline E2E Professor A',
      );
    }
    manifest.assessments.trainerStudentB = await createAssessment(
      input.apiUrl,
      trainerB,
      studentB,
      input.date,
      72,
      'Baseline E2E Professor B',
    );
  }

  if (input.scenario === 'isolamento') {
    const studentAMetadata = manifest.independentStudents?.a;
    const planA = manifest.plans.independentA;
    const independentAssessment = manifest.assessments.independentA;
    const linkedStudentA = manifest.linkedStudents?.a;
    const trainerPlanA = manifest.plans.trainerStudentA;
    const trainerAssessmentA = manifest.assessments.trainerStudentA;
    if (
      !studentAMetadata ||
      !planA ||
      !independentAssessment ||
      !linkedStudentA ||
      !trainerPlanA ||
      !trainerAssessmentA
    ) {
      throw new Error('Fixture de isolamento incompleta');
    }
    const studentA = await signInAccount(
      input.apiUrl,
      input.credentials.studentA,
      'student',
      studentAMetadata,
    );
    const started = expectStatus(
      await api<{ id: string }>(input.apiUrl, '/workout-logs', {
        method: 'POST',
        cookie: studentA.cookie,
        body: { workoutDayId: planA.dayId, date: input.date },
      }),
      201,
      'Criação de log para isolamento',
    );
    const exerciseResult = await api<{ days: Array<{ exercises: Array<{ id: string }> }> }>(
      input.apiUrl,
      `/workout-plans/${planA.id}`,
      { cookie: studentA.cookie },
    );
    const planData = expectStatus(exerciseResult, 200, 'Leitura do plano do aluno A');
    const workoutExerciseId = planData.days[0]?.exercises[0]?.id;
    if (!workoutExerciseId) throw new Error('Exercício do plano de isolamento ausente');
    expectStatus(
      await api(input.apiUrl, `/workout-logs/${started.id}/finish`, {
        method: 'PATCH',
        cookie: studentA.cookie,
        body: {
          durationMin: 1,
          completed: true,
          sets: [
            { workoutExerciseId, setNumber: 1, repsDone: 10, loadKg: 20, completed: true },
            { workoutExerciseId, setNumber: 2, repsDone: 10, loadKg: 20, completed: true },
          ],
        },
      }),
      200,
      'Conclusão do log de isolamento',
    );
    manifest.foreign = {
      studentId: linkedStudentA.id,
      planId: trainerPlanA.id,
      assessmentId: trainerAssessmentA.id,
      dayId: planA.dayId,
    };
    manifest.foreignIndependent = {
      studentId: studentA.profileId,
      planId: planA.id,
      assessmentId: independentAssessment.id,
      dayId: planA.dayId,
      logId: started.id,
    };
  }
  return manifest;
}

type Check = { name: string; status: 'passed' };

async function fullPlan(baseUrl: string, cookie: string, planId: string) {
  const result = await api<{
    id: string;
    notes: string | null;
    days: Array<{
      id: string;
      exercises: Array<{ id: string; sets: number; reps: string; loadKg: string | number }>;
    }>;
  }>(baseUrl, `/workout-plans/${planId}`, { cookie });
  return expectStatus(result, 200, 'Leitura de plano da fixture');
}

async function assessmentList(baseUrl: string, cookie: string, studentId?: string) {
  const path = studentId ? `/students/${studentId}/assessments` : '/students/me/assessments';
  const result = await api<{ items: Assessment[]; total: number }>(baseUrl, path, { cookie });
  return expectStatus(result, 200, 'Leitura de avaliações da fixture');
}

export function assertStudentWorkoutOutcome(input: {
  date: string;
  workoutDayId: string;
  completedThisWeek: number;
  logs: Array<{
    date: string;
    workoutDayId: string;
    completed: boolean;
    sets: Array<{
      setNumber: number;
      repsDone: number | null;
      loadKg: string | number | null;
      completed: boolean;
    }>;
  }>;
}): void {
  if (input.completedThisWeek !== 1)
    throw new Error('Evolução semanal deve conter exatamente um treino concluído');
  const matching = input.logs.filter(
    (log) => log.workoutDayId === input.workoutDayId && log.date === input.date,
  );
  if (matching.length !== 1) throw new Error('Esperado exatamente um log do dia fixture');
  const log = matching[0];
  if (!log?.completed || log.sets.length !== 2)
    throw new Error('Log do dia deve estar concluído com duas séries');
  const pairs = log.sets
    .slice()
    .sort((left, right) => left.setNumber - right.setNumber)
    .map((set) => [set.setNumber, set.repsDone, Number(set.loadKg), set.completed] as const);
  if (
    JSON.stringify(pairs) !==
    JSON.stringify([
      [1, 10, 22, true],
      [2, 8, 18, true],
    ])
  ) {
    throw new Error('Séries persistidas devem ser exatamente (10, 22 kg) e (8, 18 kg)');
  }
}

export function assertProfessorOutcome(input: {
  assessmentCount: number;
  baselineAssessmentCount: number;
  expectedDate: string;
  newAssessment:
    | {
        date: string;
        weightKg: string | number | null;
        heightCm: string | number | null;
        notes: string | null;
      }
    | undefined;
  planA: { sets: number; reps: string; loadKg: string | number | null };
  baselineBAssessmentsUnchanged: boolean;
  planBUnchanged: boolean;
}): void {
  if (input.assessmentCount !== input.baselineAssessmentCount + 1)
    throw new Error('Professor deve criar exatamente uma avaliação nova');
  const assessment = input.newAssessment;
  if (
    !assessment ||
    assessment.date !== input.expectedDate ||
    Number(assessment.weightKg) !== 78.5 ||
    Number(assessment.heightCm) !== 170 ||
    assessment.notes !== 'Avaliacao E2E'
  ) {
    throw new Error('Avaliação do professor diverge dos valores exatos esperados');
  }
  if (input.planA.sets !== 2 || input.planA.reps !== '10' || Number(input.planA.loadKg) !== 24) {
    throw new Error('Prescrição deve manter duas séries de dez reps e carga 24 kg');
  }
  if (!input.baselineBAssessmentsUnchanged || !input.planBUnchanged) {
    throw new Error('Dados do professor B foram alterados');
  }
}

export async function verifyScenario(input: {
  apiUrl: string;
  credentials: FixtureCredentials;
  manifest: FixtureManifest;
  stage: 'setup' | 'result';
}): Promise<{ checks: Check[]; studentOutcome?: unknown; professorOutcome?: unknown }> {
  const checks: Check[] = [];
  const add = (name: string) => checks.push({ name, status: 'passed' });
  const { manifest } = input;
  if (input.stage === 'setup') {
    if (manifest.independentStudents) {
      const metadata = manifest.independentStudents.a;
      if (metadata.authUserId === metadata.profileId)
        throw new Error('authUserId não pode substituir student profileId');
      const account = await signInAccount(
        input.apiUrl,
        input.credentials.studentA,
        'student',
        metadata,
      );
      const plan = manifest.plans.independentA;
      const assessment = manifest.assessments.independentA;
      if (
        !plan ||
        !assessment ||
        plan.exerciseSets !== 2 ||
        plan.exerciseReps !== '10' ||
        plan.exerciseLoadKg !== 20
      ) {
        throw new Error('Setup do aluno não tem prescrição baseline esperada');
      }
      const full = await fullPlan(input.apiUrl, account.cookie, plan.id);
      if (full.days.length !== 1 || full.days[0]?.exercises.length !== 1)
        throw new Error('Plano independente deve conter um dia e um exercício');
      const assessments = await assessmentList(input.apiUrl, account.cookie);
      if (assessments.total !== 1 || Number(assessments.items[0]?.weightKg) !== 70)
        throw new Error('Avaliação baseline independente não confere');
      add('aluno independente, plano e avaliação baseline');
    }
    if (manifest.trainers) {
      const trainerA = await signInAccount(
        input.apiUrl,
        input.credentials.trainerA,
        'trainer',
        manifest.trainers.a,
      );
      const trainerB = await signInAccount(
        input.apiUrl,
        input.credentials.trainerB,
        'trainer',
        manifest.trainers.b,
      );
      const studentA = manifest.linkedStudents?.a;
      const studentB = manifest.linkedStudents?.b;
      const planA = manifest.plans.trainerStudentA;
      const planB = manifest.plans.trainerStudentB;
      const assessmentA = manifest.assessments.trainerStudentA;
      const assessmentB = manifest.assessments.trainerStudentB;
      if (!studentA || !studentB || !planA || !planB || !assessmentB)
        throw new Error('Setup do professor incompleto');
      const [fullA, fullB, assessmentsA, assessmentsB] = await Promise.all([
        fullPlan(input.apiUrl, trainerA.cookie, planA.id),
        fullPlan(input.apiUrl, trainerB.cookie, planB.id),
        assessmentList(input.apiUrl, trainerA.cookie, studentA.id),
        assessmentList(input.apiUrl, trainerB.cookie, studentB.id),
      ]);
      if (
        fullA.days.length !== 1 ||
        fullA.days[0]?.exercises.length !== 1 ||
        fullB.days.length !== 1 ||
        fullB.days[0]?.exercises.length !== 1 ||
        assessmentsA.total !== (assessmentA ? 1 : 0) ||
        assessmentsB.total !== 1 ||
        assessmentsB.items[0]?.id !== assessmentB.id ||
        assessmentsB.items[0]?.date !== assessmentB.date ||
        Number(assessmentsB.items[0]?.weightKg) !== Number(assessmentB.weightKg) ||
        Number(assessmentsB.items[0]?.heightCm) !== Number(assessmentB.heightCm) ||
        assessmentsB.items[0]?.notes !== assessmentB.notes ||
        (assessmentA !== undefined &&
          (assessmentsA.items[0]?.id !== assessmentA.id ||
            Number(assessmentsA.items[0]?.weightKg) !== Number(assessmentA.weightKg)))
      ) {
        throw new Error('Planos e avaliações iniciais dos alunos vinculados não conferem');
      }
      add('professores e alunos vinculados isolados');
    }
    return { checks };
  }

  if (input.stage !== 'result') throw new Error('Etapa de verificação inválida');
  if (manifest.scenario === 'aluno') {
    const studentMetadata = manifest.independentStudents?.a;
    const plan = manifest.plans.independentA;
    if (!studentMetadata || !plan) throw new Error('Fixture de aluno incompleta');
    const owner = await signInAccount(
      input.apiUrl,
      input.credentials.studentA,
      'student',
      studentMetadata,
    );
    const date = manifest.referenceDate;
    const list = expectStatus(
      await api<{
        items: Array<{ id: string; date: string; workoutDayId: string; completed: boolean }>;
      }>(input.apiUrl, `/students/me/workout-logs?from=${date}&to=${date}`, {
        cookie: owner.cookie,
      }),
      200,
      'Leitura de logs do aluno',
    );
    const fullLogs = await Promise.all(
      list.items.map(
        async (log) =>
          expectStatus(
            await api(input.apiUrl, `/workout-logs/${log.id}`, { cookie: owner.cookie }),
            200,
            'Leitura do log do aluno',
          ) as {
            id: string;
            date: string;
            workoutDayId: string;
            completed: boolean;
            sets: Array<{
              setNumber: number;
              repsDone: number | null;
              loadKg: string | number | null;
              completed: boolean;
            }>;
          },
      ),
    );
    const evolution = expectStatus(
      await api<{ completedThisWeek: number }>(
        input.apiUrl,
        `/students/me/workout-evolution?date=${date}`,
        { cookie: owner.cookie },
      ),
      200,
      'Leitura da evolução semanal',
    );
    const studentOutcome = {
      date,
      workoutDayId: plan.dayId,
      completedThisWeek: evolution.completedThisWeek,
      logs: fullLogs,
    };
    assertStudentWorkoutOutcome(studentOutcome);
    add('conclusão persistida com séries exatas e evolução semanal');
    return { checks, studentOutcome };
  }

  if (manifest.scenario === 'professor') {
    const trainerMetadataA = manifest.trainers?.a;
    const trainerMetadataB = manifest.trainers?.b;
    const studentA = manifest.linkedStudents?.a;
    const studentB = manifest.linkedStudents?.b;
    const planA = manifest.plans.trainerStudentA;
    const planB = manifest.plans.trainerStudentB;
    const baselineA = manifest.assessments.trainerStudentA;
    const baselineB = manifest.assessments.trainerStudentB;
    if (
      !trainerMetadataA ||
      !trainerMetadataB ||
      !studentA ||
      !studentB ||
      !planA ||
      !planB ||
      !baselineB
    )
      throw new Error('Fixture de professor incompleta');
    const trainerA = await signInAccount(
      input.apiUrl,
      input.credentials.trainerA,
      'trainer',
      trainerMetadataA,
    );
    const trainerB = await signInAccount(
      input.apiUrl,
      input.credentials.trainerB,
      'trainer',
      trainerMetadataB,
    );
    const [afterA, afterB, fullA, fullB] = await Promise.all([
      assessmentList(input.apiUrl, trainerA.cookie, studentA.id),
      assessmentList(input.apiUrl, trainerB.cookie, studentB.id),
      fullPlan(input.apiUrl, trainerA.cookie, planA.id),
      fullPlan(input.apiUrl, trainerB.cookie, planB.id),
    ]);
    const newAssessments = afterA.items.filter((item) => item.notes === 'Avaliacao E2E');
    const exerciseA = fullA.days[0]?.exercises[0];
    const exerciseB = fullB.days[0]?.exercises[0];
    if (!exerciseA || !exerciseB) throw new Error('Plano do professor sem exercício');
    const professorOutcome = {
      assessmentCount: afterA.total,
      baselineAssessmentCount: baselineA ? 1 : 0,
      expectedDate: manifest.referenceDate,
      newAssessment: newAssessments.length === 1 ? newAssessments[0] : undefined,
      planA: { sets: exerciseA.sets, reps: exerciseA.reps, loadKg: exerciseA.loadKg },
      baselineBAssessmentsUnchanged:
        afterB.total === 1 &&
        afterB.items[0]?.id === baselineB.id &&
        afterB.items[0]?.date === baselineB.date &&
        Number(afterB.items[0]?.weightKg) === Number(baselineB.weightKg) &&
        Number(afterB.items[0]?.heightCm) === Number(baselineB.heightCm) &&
        afterB.items[0]?.notes === baselineB.notes,
      planBUnchanged:
        exerciseB.sets === planB.exerciseSets &&
        exerciseB.reps === planB.exerciseReps &&
        Number(exerciseB.loadKg) === planB.exerciseLoadKg,
    };
    assertProfessorOutcome(professorOutcome);
    add('avaliação criada e prescrição do professor A persistidas; B intacto');
    return { checks, professorOutcome };
  }
  throw new Error('Cenário sem oráculo de resultado');
}

async function checkIsolationCase(
  cases: Array<{ name: string; status: number }>,
  name: string,
  actual: number,
  expected: number,
): Promise<void> {
  if (actual !== expected)
    throw new Error(`Isolamento ${name}: status ${actual}, esperado ${expected}`);
  cases.push({ name, status: actual });
}

export async function runIsolationChecks(input: {
  apiUrl: string;
  credentials: FixtureCredentials;
  manifest: FixtureManifest;
}): Promise<{ cases: Array<{ name: string; status: number }>; ownerStateIntact: boolean }> {
  const { apiUrl, manifest } = input;
  const studentAMetadata = manifest.independentStudents?.a;
  const studentBMetadata = manifest.independentStudents?.b;
  const trainerAMetadata = manifest.trainers?.a;
  const trainerBMetadata = manifest.trainers?.b;
  const linkedA = manifest.linkedStudents?.a;
  const planA = manifest.plans.independentA;
  const planTrainerA = manifest.plans.trainerStudentA;
  const assessmentA = manifest.assessments.independentA;
  const assessmentTrainerA = manifest.assessments.trainerStudentA;
  const foreign = manifest.foreign;
  const foreignIndependent = manifest.foreignIndependent;
  if (
    !studentAMetadata ||
    !studentBMetadata ||
    !trainerAMetadata ||
    !trainerBMetadata ||
    !linkedA ||
    !planA ||
    !planTrainerA ||
    !assessmentA ||
    !assessmentTrainerA ||
    !foreign ||
    !foreignIndependent
  ) {
    throw new Error('Fixture de isolamento incompleta');
  }
  const independentA = await signInAccount(
    apiUrl,
    input.credentials.studentA,
    'student',
    studentAMetadata,
  );
  const independentB = await signInAccount(
    apiUrl,
    input.credentials.studentB,
    'student',
    studentBMetadata,
  );
  const trainerA = await signInAccount(
    apiUrl,
    input.credentials.trainerA,
    'trainer',
    trainerAMetadata,
  );
  const trainerB = await signInAccount(
    apiUrl,
    input.credentials.trainerB,
    'trainer',
    trainerBMetadata,
  );
  const cases: Array<{ name: string; status: number }> = [];
  const assertCase = (name: string, result: ApiResult, expected: number) =>
    checkIsolationCase(cases, name, result.status, expected);

  await assertCase('sem-sessao-students', await api(apiUrl, '/students'), 401);
  await assertCase(
    'aluno-lista-students',
    await api(apiUrl, '/students', { cookie: independentA.cookie }),
    403,
  );
  await assertCase(
    'professor-rota-self-student',
    await api(apiUrl, '/students/me/workout-plans', { cookie: trainerA.cookie }),
    403,
  );
  await assertCase(
    'aluno-b-plano-a',
    await api(apiUrl, `/workout-plans/${planA.id}`, { cookie: independentB.cookie }),
    404,
  );
  await assertCase(
    'aluno-b-log-a',
    await api(apiUrl, `/workout-logs/${foreignIndependent.logId}`, { cookie: independentB.cookie }),
    404,
  );
  await assertCase(
    'aluno-b-avaliacao-a',
    await api(apiUrl, `/assessments/${foreignIndependent.assessmentId}`, {
      cookie: independentB.cookie,
    }),
    404,
  );
  await assertCase(
    'professor-b-aluno-a',
    await api(apiUrl, `/students/${foreign.studentId}`, { cookie: trainerB.cookie }),
    404,
  );
  await assertCase(
    'professor-b-plano-a',
    await api(apiUrl, `/workout-plans/${planTrainerA.id}`, { cookie: trainerB.cookie }),
    404,
  );
  await assertCase(
    'professor-b-avaliacao-a',
    await api(apiUrl, `/assessments/${assessmentTrainerA.id}`, { cookie: trainerB.cookie }),
    404,
  );
  const planBeforeDeniedWrite = await fullPlan(apiUrl, trainerA.cookie, planTrainerA.id);
  await assertCase(
    'professor-b-patch-plano-a',
    await api(apiUrl, `/workout-plans/${planTrainerA.id}`, {
      method: 'PATCH',
      cookie: trainerB.cookie,
      body: { notes: 'alteracao-negada' },
    }),
    404,
  );
  await assertCase(
    'professor-b-patch-avaliacao-a',
    await api(apiUrl, `/assessments/${assessmentTrainerA.id}`, {
      method: 'PATCH',
      cookie: trainerB.cookie,
      body: { weightKg: 99 },
    }),
    404,
  );

  const [ownerPlan, ownerAssessment, ownerLogs, ownerLinkedAssessment, ownerTrainerPlan] =
    await Promise.all([
      fullPlan(apiUrl, independentA.cookie, planA.id),
      api<Assessment>(apiUrl, `/assessments/${assessmentA.id}`, { cookie: independentA.cookie }),
      api<{ items: Array<{ id: string }> }>(
        apiUrl,
        `/students/me/workout-logs?from=${manifest.referenceDate}&to=${manifest.referenceDate}`,
        { cookie: independentA.cookie },
      ),
      api<Assessment>(apiUrl, `/assessments/${assessmentTrainerA.id}`, { cookie: trainerA.cookie }),
      fullPlan(apiUrl, trainerA.cookie, planTrainerA.id),
    ]);
  const studentExercise = ownerPlan.days[0]?.exercises[0];
  const trainerExercise = ownerTrainerPlan.days[0]?.exercises[0];
  const ownerStateIntact =
    ownerTrainerPlan.notes === planBeforeDeniedWrite.notes &&
    Number(studentExercise?.loadKg) === planA.exerciseLoadKg &&
    ownerAssessment.status === 200 &&
    Number((ownerAssessment.data as Assessment).weightKg) === Number(assessmentA.weightKg) &&
    (ownerAssessment.data as Assessment).date === assessmentA.date &&
    (ownerAssessment.data as Assessment).notes === assessmentA.notes &&
    ownerLogs.status === 200 &&
    (ownerLogs.data as { items: Array<{ id: string }> }).items.some(
      (log) => log.id === foreignIndependent.logId,
    ) &&
    ownerLinkedAssessment.status === 200 &&
    Number((ownerLinkedAssessment.data as Assessment).weightKg) ===
      Number(assessmentTrainerA.weightKg) &&
    (ownerLinkedAssessment.data as Assessment).date === assessmentTrainerA.date &&
    (ownerLinkedAssessment.data as Assessment).notes === assessmentTrainerA.notes &&
    trainerExercise?.sets === planTrainerA.exerciseSets &&
    trainerExercise.reps === planTrainerA.exerciseReps &&
    Number(trainerExercise.loadKg) === planTrainerA.exerciseLoadKg;
  if (!ownerStateIntact)
    throw new Error('Tentativas negadas alteraram recursos consultados pelo dono');
  return { cases, ownerStateIntact };
}

function credentialsFromEnvironment(): FixtureCredentials {
  const serialized = process.env.E2E_CREDENTIALS;
  if (!serialized) throw new Error('E2E_CREDENTIALS ausente');
  const value: unknown = JSON.parse(serialized);
  if (typeof value !== 'object' || value === null) throw new Error('E2E_CREDENTIALS inválido');
  return value as FixtureCredentials;
}

async function main(): Promise<void> {
  const action = process.env.E2E_ACTION;
  const apiUrl = process.env.E2E_API_URL;
  const scenario = process.env.E2E_SCENARIO;
  const runId = process.env.E2E_RUN_ID;
  if (!apiUrl || !scenario || !runId || !['aluno', 'professor', 'isolamento'].includes(scenario)) {
    throw new Error('Configuração de fixture inválida');
  }
  const credentials = credentialsFromEnvironment();
  let result: unknown;
  if (action === 'prepare') {
    result = await prepareScenario({
      apiUrl,
      credentials,
      date: process.env.E2E_DATE ?? '',
      runId,
      scenario: scenario as Scenario,
      exerciseName: process.env.E2E_EXERCISE_NAME,
    });
  } else {
    const serializedManifest = process.env.E2E_MANIFEST;
    if (!serializedManifest) throw new Error('Manifesto de fixture ausente');
    const manifest = JSON.parse(serializedManifest) as FixtureManifest;
    if (action === 'verify') {
      result = await verifyScenario({
        apiUrl,
        credentials,
        manifest,
        stage: process.env.E2E_VERIFY_STAGE === 'result' ? 'result' : 'setup',
      });
    } else if (action === 'isolation') {
      result = await runIsolationChecks({ apiUrl, credentials, manifest });
    } else {
      throw new Error('Ação de fixture inválida');
    }
  }
  process.stdout.write(
    `${JSON.stringify({ action, scenario, ...(action === 'prepare' ? { manifest: result } : { result }) })}\n`,
  );
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/test/e2e-mobile/fixtures.ts')) {
  try {
    await main();
  } catch (error) {
    const safeMessage =
      error instanceof Error
        ? error.message.replace(
            /(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:session|cookie)[=: ]+[^\s]+)/gi,
            '[REDACTED]',
          )
        : 'Falha desconhecida na fixture';
    process.stderr.write(`${safeMessage}\n`);
    process.exitCode = 1;
  } finally {
    await queryClient.end();
  }
}
