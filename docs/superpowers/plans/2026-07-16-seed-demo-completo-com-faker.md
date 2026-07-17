# Seed de demonstração completo com Faker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar o seed de demonstração para criar, com Faker e de forma reproduzível, um professor, dez alunos autenticáveis e histórico suficiente para preencher dashboard, avaliações, planos e registros de treino.

**Architecture:** Um gerador puro em `packages/db/src/seeds/demo.ts` constrói um grafo determinístico sem acessar o banco. `packages/db/src/seed.ts` limpa apenas o tenant demo, persiste esse grafo e continua expondo as credenciais e `seedDemoData()`. O teste unitário protege a estrutura gerada; o teste de integração da API protege login, métricas e idempotência.

**Tech Stack:** TypeScript estrito, `@faker-js/faker` 10.5.0 com `fakerPT_BR`, Drizzle ORM, PostgreSQL, Vitest, pnpm e Biome.

## Global Constraints

- Manter exatamente um professor demo: `trainer@muvit.dev` / `12345678`.
- Criar exatamente dez alunos: seis ativos, dois pausados e dois inativos.
- Todos os alunos usam e-mails `aluno01@muvit.dev` até `aluno10@muvit.dev` e senha `12345678`.
- Criar exatamente 24 avaliações, dez planos e 40 registros de treino nos últimos 90 dias.
- Distribuir planos em seis ativos, três arquivados e um rascunho.
- Usar `fakerPT_BR.seed(20260716)` antes de cada construção do cenário.
- Preservar textos pt-BR como UTF-8 literal e não introduzir escapes Unicode para acentuação.
- Preservar as alterações preexistentes em `package.json`, `pnpm-lock.yaml`, `turbo.json` e arquivos de outros trabalhos.
- Reutilizar exercícios globais existentes e inserir apenas nomes ausentes; nunca apagar exercícios referenciados por outros professores.
- Não executar `git add`, `git commit` ou qualquer operação de publicação durante esta implementação.
- Executar todos os comandos a partir da raiz `C:\Users\Leonardo\Desktop\Muvit\muvit`.

---

## File Map

- Create: `packages/db/src/seeds/demo.ts` — tipos e gerador puro do cenário Faker.
- Create: `packages/db/src/seeds/demo.test.ts` — contrato determinístico, volumes, estados, datas e integridade das referências lógicas.
- Modify: `packages/db/package.json` — dependência runtime `@faker-js/faker`.
- Modify: `pnpm-lock.yaml` — lockfile atualizado pelo pnpm sem descartar mudanças concorrentes.
- Modify: `packages/db/src/seed.ts` — limpeza do tenant demo, persistência do grafo e impressão das credenciais.
- Modify: `apps/api/src/seed-demo.test.ts` — login de todos, métricas, volumes e segunda execução sem duplicação.
- Modify: `README.md` — novo volume do seed e descoberta das credenciais geradas.
- Modify: `docs/superpowers/specs/2026-07-13-seed-demo-completo-com-faker-design.md` — acentuação literal em UTF-8, sem alterar as decisões aprovadas.

### Task 1: Gerador Faker puro e determinístico

**Files:**
- Create: `packages/db/src/seeds/demo.ts`
- Create: `packages/db/src/seeds/demo.test.ts`
- Modify: `packages/db/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `globalExercises` de `packages/db/src/seeds/exercises.ts` somente na persistência posterior; o gerador usa nomes de exercício estáveis.
- Produces: `DEMO_PASSWORD`, `demoCredentials`, `DemoScenario` e `buildDemoScenario(referenceDate?: Date): DemoScenario`.

- [ ] **Step 1: Registrar o estado dos arquivos concorrentes antes de alterar dependências**

Run:

```powershell
git diff -- package.json packages/db/package.json pnpm-lock.yaml turbo.json
```

Expected: exibir as mudanças já existentes para que o diff posterior diferencie o trabalho concorrente da adição da Faker.

- [ ] **Step 2: Adicionar a Faker somente ao workspace do banco**

Run:

```powershell
corepack pnpm --filter @muvit/db add @faker-js/faker@^10.5.0
```

Expected: `packages/db/package.json` ganha `@faker-js/faker` em `dependencies`; o lockfile preserva as entradas preexistentes e adiciona a resolução 10.5.x.

- [ ] **Step 3: Escrever o teste unitário inicialmente vermelho**

Create `packages/db/src/seeds/demo.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { buildDemoScenario, DEMO_PASSWORD } from './demo.js';

const referenceDate = new Date('2026-07-16T12:00:00.000Z');

describe('buildDemoScenario', () => {
  it('gera um cenário médio, determinístico e íntegro', () => {
    const first = buildDemoScenario(referenceDate);
    const second = buildDemoScenario(referenceDate);

    expect(second).toEqual(first);
    expect(first.credentials.password).toBe(DEMO_PASSWORD);
    expect(first.credentials.trainer.email).toBe('trainer@muvit.dev');
    expect(first.students).toHaveLength(10);
    expect(first.credentials.students).toHaveLength(10);
    expect(first.students.map((student) => student.email)).toEqual(
      Array.from({ length: 10 }, (_, index) => `aluno${String(index + 1).padStart(2, '0')}@muvit.dev`),
    );
    expect(first.students.filter((student) => student.status === 'active')).toHaveLength(6);
    expect(first.students.filter((student) => student.status === 'paused')).toHaveLength(2);
    expect(first.students.filter((student) => student.status === 'inactive')).toHaveLength(2);
    expect(first.assessments).toHaveLength(24);
    expect(first.plans).toHaveLength(10);
    expect(first.plans.filter((plan) => plan.status === 'active')).toHaveLength(6);
    expect(first.plans.filter((plan) => plan.status === 'archived')).toHaveLength(3);
    expect(first.plans.filter((plan) => plan.status === 'draft')).toHaveLength(1);
    expect(first.logs).toHaveLength(40);
    expect(first.plans.every((plan) => plan.days.length >= 2 && plan.days.length <= 4)).toBe(true);
    expect(
      first.plans.every((plan) =>
        plan.days.every((day) => day.exercises.length >= 4 && day.exercises.length <= 6),
      ),
    ).toBe(true);
    expect(new Set(first.students.map((student) => student.email)).size).toBe(10);
    expect(
      first.logs.every((log) => {
        const plan = first.plans[log.studentIndex];
        const day = plan?.days.find((item) => item.dayOrder === log.workoutDayOrder);
        return day !== undefined && log.sets.every((set) => day.exercises.some((exercise) => exercise.exerciseOrder === set.exerciseOrder));
      }),
    ).toBe(true);
  });
});
```

- [ ] **Step 4: Executar o teste e confirmar a falha pelo módulo ausente**

Run:

```powershell
corepack pnpm --dir packages/db test -- src/seeds/demo.test.ts
```

Expected: FAIL porque `./demo.js` ainda não existe.

- [ ] **Step 5: Implementar os tipos e constantes do cenário**

Create `packages/db/src/seeds/demo.ts` beginning with these public contracts:

```ts
import { fakerPT_BR } from '@faker-js/faker';
import type {
  AssessmentMeasurements,
  NewAssessment,
  NewStudent,
  NewWorkoutPlan,
} from '../schema/index.js';

export const DEMO_PASSWORD = '12345678';
export const DEMO_RANDOM_SEED = 20260716;

type DemoStudent = Omit<NewStudent, 'trainerId' | 'passwordHash'> & { email: string };
type DemoAssessment = Omit<NewAssessment, 'studentId'> & { studentIndex: number };
type DemoExercise = {
  exerciseName: string;
  exerciseOrder: number;
  sets: number;
  reps: string;
  restSeconds: number;
  loadKg: string;
  tempo?: string;
  notes?: string;
};
type DemoDay = {
  label: string;
  dayOrder: number;
  exercises: DemoExercise[];
};
type DemoPlan = Omit<NewWorkoutPlan, 'studentId' | 'trainerId'> & {
  studentIndex: number;
  days: DemoDay[];
};
type DemoSet = {
  exerciseOrder: number;
  setNumber: number;
  repsDone: number;
  loadKg: string;
  completed: boolean;
};
type DemoLog = {
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
  credentials: {
    password: typeof DEMO_PASSWORD;
    trainer: { email: string; name: string };
    students: Array<{ email: string; name: string }>;
  };
  students: DemoStudent[];
  assessments: DemoAssessment[];
  plans: DemoPlan[];
  logs: DemoLog[];
};
```

Add private fixed distributions:

```ts
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
const createdOffsets = [2, 5, 14, 21, 35, 50, 70, 90, 120, 150] as const;
const assessmentCounts = [3, 3, 3, 3, 3, 3, 2, 2, 1, 1] as const;
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
] as const;
const logCounts = [7, 7, 6, 6, 5, 5, 2, 2, 0, 0] as const;
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
] as const;
```

- [ ] **Step 6: Implementar a construção determinística completa**

In `packages/db/src/seeds/demo.ts`, implement helpers with these exact signatures and rules:

```ts
const toDateString = (date: Date): string => date.toISOString().slice(0, 10);

const daysBefore = (referenceDate: Date, amount: number): Date => {
  const date = new Date(referenceDate);
  date.setUTCDate(date.getUTCDate() - amount);
  return date;
};

const decimal = (value: number, digits: number): string => value.toFixed(digits);
```

Implement `buildDemoScenario(referenceDate: Date = new Date()): DemoScenario` so it:

1. calls `fakerPT_BR.seed(DEMO_RANDOM_SEED)` before any Faker call;
2. creates ten names with `fakerPT_BR.person.fullName()` and fixed e-mails `aluno01@muvit.dev` through `aluno10@muvit.dev`;
3. calls `fakerPT_BR.setDefaultRefDate(referenceDate)`, creates birth dates with `fakerPT_BR.date.birthdate({ min: 18, max: 55, mode: 'age' })`, phones with `fakerPT_BR.phone.number()` and controlled `status`/`createdAt` from the arrays above;
4. creates assessment offsets `[70, 35, 7]` for six active students, `[60, 21]` and `[70, 28]` for paused students, and `[80]`/`[65]` for inactive students, producing eight assessments in the last 30 days;
5. derives weight, body fat and `AssessmentMeasurements` from a Faker base plus a monotonic variation per assessment, formatting decimals with `decimal()`;
6. creates one plan per student with `2 + (studentIndex % 3)` days and `4 + ((studentIndex + dayIndex) % 3)` exercises per day, rotating through `exerciseNames` without duplicates inside a day;
7. creates the exact log distribution in `logCounts`, alternating workout days, using offsets from 3 to 88 days, and creates two series for each of the first two exercises of that day;
8. returns credentials derived from the generated names and fixed e-mails.

At the end of the file, export credentials without making names depend on the wall clock:

```ts
export const demoCredentials = buildDemoScenario(new Date('2026-01-01T12:00:00.000Z')).credentials;
```

- [ ] **Step 7: Executar o teste unitário e o typecheck do banco**

Run:

```powershell
corepack pnpm --dir packages/db test -- src/seeds/demo.test.ts
corepack pnpm --filter @muvit/db typecheck
```

Expected: teste PASS; typecheck com exit code 0.

### Task 2: Persistência, autenticação e idempotência

**Files:**
- Modify: `packages/db/src/seed.ts`
- Modify: `apps/api/src/seed-demo.test.ts`

**Interfaces:**
- Consumes: `buildDemoScenario()`, `demoCredentials`, `DemoScenario` e o catálogo `globalExercises`.
- Produces: `seedDemoData(referenceDate?: Date): Promise<void>` mantendo compatibilidade com chamadas sem argumento.

- [ ] **Step 1: Ampliar o teste de integração antes da persistência**

Modify `apps/api/src/seed-demo.test.ts` to import `demoCredentials`, `db`, `schema` and `count`, then replace the current case with assertions that:

```ts
const referenceDate = new Date();
await seedDemoData(referenceDate);

expect(summary.json()).toMatchObject({
  students: { total: 10, active: 6, paused: 2, inactive: 2, newThisWeek: 2 },
  workouts: { activePlans: 6 },
  assessments: { last30d: 8 },
});

expect(students.json().items).toHaveLength(10);
expect(new Set(students.json().items.map((student: { email: string }) => student.email))).toEqual(
  new Set(demoCredentials.students.map((student) => student.email)),
);

for (const student of demoCredentials.students) {
  const login = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email: student.email, password: demoCredentials.password, role: 'student' },
  });
  expect(login.statusCode).toBe(200);
}
```

Query exact persisted totals with Drizzle:

```ts
const readTotals = async () => ({
  trainers: (await db.select({ value: count() }).from(schema.trainers))[0]?.value ?? 0,
  students: (await db.select({ value: count() }).from(schema.students))[0]?.value ?? 0,
  assessments: (await db.select({ value: count() }).from(schema.assessments))[0]?.value ?? 0,
  plans: (await db.select({ value: count() }).from(schema.workoutPlans))[0]?.value ?? 0,
  logs: (await db.select({ value: count() }).from(schema.workoutLogs))[0]?.value ?? 0,
});

expect(await readTotals()).toEqual({ trainers: 1, students: 10, assessments: 24, plans: 10, logs: 40 });
await seedDemoData(referenceDate);
expect(await readTotals()).toEqual({ trainers: 1, students: 10, assessments: 24, plans: 10, logs: 40 });
```

- [ ] **Step 2: Executar o teste focado e confirmar a falha de volumes**

Run:

```powershell
corepack pnpm --dir apps/api test -- src/seed-demo.test.ts
```

Expected: FAIL porque o seed atual ainda cria três alunos, uma avaliação, um plano e um log.

- [ ] **Step 3: Refatorar a limpeza para remover o tenant demo e o legado**

In `packages/db/src/seed.ts`:

- import `buildDemoScenario` and re-export `demoCredentials` from `./seeds/demo.js`;
- change the signature to `seedDemoData(referenceDate: Date = new Date()): Promise<void>`;
- find the current trainer demo by e-mail;
- if found, delete students with `trainerId` equal to its id before deleting the trainer;
- delete students matching the three legacy e-mails;
- delete the trainer by e-mail;
- only then reuse global exercises and insert catalog names that are still absent.

Use this fixed legacy list:

```ts
const legacyStudentEmails = [
  'alice.aluna@muvit.dev',
  'bruno.aluno@muvit.dev',
  'carla.aluna@muvit.dev',
] as const;
```

- [ ] **Step 4: Persistir alunos e avaliações por chaves lógicas**

Build the scenario once, insert the trainer, insert all students with `trainerId` and `demoPasswordHash`, then map returned rows by e-mail:

```ts
const scenario = buildDemoScenario(referenceDate);
const insertedStudents = await db
  .insert(schema.students)
  .values(
    scenario.students.map((student) => ({
      ...student,
      trainerId: trainer.id,
      passwordHash: demoPasswordHash,
    })),
  )
  .returning();
const studentsByEmail = new Map(insertedStudents.map((student) => [student.email, student]));
```

Resolve each `assessment.studentIndex` through `scenario.students[index].email`, fail explicitly if either logical or persisted student is absent, and insert all 24 assessments in one call.

- [ ] **Step 5: Persistir planos, dias e exercícios mantendo mapas de referência**

For each scenario plan:

- resolve its student by index/e-mail;
- insert the plan and validate the returned row;
- insert its days and map them by `dayOrder`;
- resolve every `exerciseName` through the existing `findExerciseId()` helper;
- insert workout exercises and retain a map keyed by `${studentIndex}:${dayOrder}:${exerciseOrder}`.

Do not use array-return order as identity; every lookup must use e-mail, `dayOrder` or `exerciseOrder`.

- [ ] **Step 6: Persistir os 40 logs e suas séries**

For each scenario log, resolve the student, day and workout exercise maps, insert the log, then insert all its sets with the returned log id. Throw messages containing `studentIndex`, `workoutDayOrder` and `exerciseOrder` when any reference is missing.

Replace the single student console line with:

```ts
console.log(`demo trainer: ${scenario.credentials.trainer.email} / ${scenario.credentials.password}`);
console.log('demo students:');
for (const student of scenario.credentials.students) {
  console.log(`- ${student.email} / ${scenario.credentials.password}`);
}
```

- [ ] **Step 7: Executar o teste de integração e os typechecks**

Run:

```powershell
corepack pnpm --dir apps/api test -- src/seed-demo.test.ts
corepack pnpm --filter @muvit/db typecheck
corepack pnpm --dir apps/api typecheck
```

Expected: teste do seed PASS; ambos os typechecks com exit code 0.

### Task 3: Documentação e verificação final

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-13-seed-demo-completo-com-faker-design.md`
- Verify: all files changed in Tasks 1–3

**Interfaces:**
- Consumes: comportamento final de `pnpm db:seed` e credenciais impressas.
- Produces: instruções de uso atuais e evidência final sem staging ou commit.

- [ ] **Step 1: Atualizar o README com o novo contrato**

Replace the current demonstration-data paragraph and fixed Alice credential with:

```markdown
Depois de aplicar as migrations, execute `pnpm db:seed`. O comando recria um professor, dez alunos, exercícios globais, avaliações, planos de treino e histórico dos últimos 90 dias para teste manual. Todos os dados são fictícios e gerados de forma reproduzível com Faker.

- Professor: `trainer@muvit.dev` / `12345678`
- Alunos: o comando imprime os dez e-mails gerados; todos usam a senha `12345678`.
```

- [ ] **Step 2: Normalizar a especificação aprovada para UTF-8 literal**

In `docs/superpowers/specs/2026-07-13-seed-demo-completo-com-faker-design.md`, restore pt-BR accents such as `demonstração`, `cenário`, `avaliação`, `execução`, `histórico`, `últimos`, `séries`, `métrica`, `exclusão`, `integração` and `verificação`. Do not alter quantities or architectural decisions.

- [ ] **Step 3: Executar Biome e verificar escapes indevidos**

Run:

```powershell
corepack pnpm exec biome check packages/db/src/seed.ts packages/db/src/seeds/demo.ts packages/db/src/seeds/demo.test.ts apps/api/src/seed-demo.test.ts
rg -n '\\u[0-9A-Fa-f]{4}' packages/db/src/seed.ts packages/db/src/seeds/demo.ts packages/db/src/seeds/demo.test.ts apps/api/src/seed-demo.test.ts README.md docs/superpowers/specs/2026-07-13-seed-demo-completo-com-faker-design.md docs/superpowers/plans/2026-07-16-seed-demo-completo-com-faker.md
```

Expected: Biome com exit code 0; `rg` sem saída.

- [ ] **Step 4: Executar a verificação final focada**

Run:

```powershell
corepack pnpm --dir packages/db test -- src/seeds/demo.test.ts
corepack pnpm --dir apps/api test -- src/seed-demo.test.ts
corepack pnpm --filter @muvit/db typecheck
corepack pnpm --dir apps/api typecheck
```

Expected: todos os testes PASS e ambos os typechecks com exit code 0.

- [ ] **Step 5: Revisar somente o diff do escopo e confirmar ausência de commit**

Run:

```powershell
git diff --check
git status --short
git diff -- packages/db/package.json packages/db/src/seed.ts packages/db/src/seeds/demo.ts packages/db/src/seeds/demo.test.ts apps/api/src/seed-demo.test.ts README.md docs/superpowers/specs/2026-07-13-seed-demo-completo-com-faker-design.md docs/superpowers/plans/2026-07-16-seed-demo-completo-com-faker.md
```

Expected: nenhuma mudança staged; mudanças concorrentes continuam presentes e separáveis; o diff do escopo contém apenas Faker, seed, testes e documentação aprovados.
