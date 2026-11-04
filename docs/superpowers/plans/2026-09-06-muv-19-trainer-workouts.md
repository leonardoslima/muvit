# <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> — Gestão de treinos e exercícios do professor no mobile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o treinador consulte, crie e altere a prescrição essencial de treino de um aluno vinculado no mobile, selecionando exercícios visíveis no catálogo sem introduzir CRUD de exercícios ou novas regras de domínio.

**Architecture:** O fluxo nasce no detalhe do aluno e adiciona lista, detalhe e editor sob `/trainer/students/:studentId/workouts`. Chamadas HTTP, parsing, validação e montagem de payload ficam em módulos puros de `src/application`; screens coordenam TanStack Query, navegação e feedback; componentes do domínio cuidam apenas da apresentação. A API, banco e validators permanecem inalterados, e o catálogo usa `scope=all` para deixar ownership exclusivamente no backend.

**Tech Stack:** Expo 54, React Native 0.81, Expo Router 6, TanStack Query 5, Zod 3, `@muvit/validators`, Vitest 4, React Native Testing Library, Biome, TypeScript 5.9.

**Spec:** `docs/superpowers/specs/2026-09-06-muv-19-trainer-workouts-design.md`

## Global Constraints

* A implementação parte da branch base `develop`, contendo <issue id="b8ac518f-83c7-43f6-bd46-7d5fc40ac92f" href="https://linear.app/muvit/issue/MUV-17/implementar-home-e-gestao-de-alunos-do-professor-no-mobile">MUV-17</issue>/PR #15 e <issue id="580d4ce4-e25a-424c-9f22-bcbddd26e6c7" href="https://linear.app/muvit/issue/MUV-18/implementar-avaliacoes-de-alunos-para-professor-no-mobile">MUV-18</issue>/PR #16 já mergeadas.
* Não alterar `apps/api`, `packages/db`, `packages/validators`, autenticação, autorização ou contratos REST.
* Usar `createWorkoutPlanSchema`, `updateWorkoutPlanSchema`, `workoutPlanFullSchema`, `workoutPlanSummarySchema`, `exerciseSchema` e `muscleGroupSchema` de `@muvit/validators` como fonte de verdade.
* O fluxo do treinador usa `/students/:studentId/workout-plans`; o fluxo do aluno continua usando `/students/me/workout-plans`.
* O cliente nunca envia `trainerId` para determinar ownership.
* O catálogo usa `scope=all`, retornando global + exercícios próprios segundo a `RequestIdentity`; não replicar essa filtragem no cliente.
* CRUD de exercícios, exclusão de treino, arquivamento/desarquivamento, duplicação e histórico de execuções ficam fora do escopo.
* Planos `archived` são somente leitura no mobile; somente `active` e `draft` entram no editor.
* O editor suporta 1–7 dias e exige ao menos 1 exercício por dia no salvamento.
* O editor expõe nome, notas, status `active|draft`, label de dia, séries, reps, carga, descanso e observação do exercício.
* `startDate` e `endDate` não são editáveis e devem ser omitidos no `PATCH`.
* `tempo` existente deve ser preservado internamente ao editar e reenviado; novos exercícios não criam `tempo`.
* Limpar notas do plano em edição deve enviar `notes: ''`; omitir o campo preservaria o valor anterior no contrato atual.
* Nenhuma regra local de “um único plano ativo” será criada.
* Nenhum AsyncStorage, journal, fila offline ou persistência de rascunho será criado para o editor do treinador.
* Usar os tokens existentes de `apps/mobile/src/lib/styles.ts`; não alterar `PRODUCT.md`, `DESIGN.md` ou a foundation visual.
* Textos visíveis devem permanecer em pt-BR com UTF-8 literal.
* `src/application` não pode importar React Native, Expo Router ou componentes.
* Cobertura bloqueante existente permanece >= 85%; não reduzir thresholds.
* Para validação em emulador/dispositivo, usar Maestro conforme `apps/mobile/AGENTS.md`, sem transformar a <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> na suíte E2E ampla da <issue id="a4aefb83-c2da-4dd7-a6ab-3b45bbeb067d" href="https://linear.app/muvit/issue/MUV-14/criar-e2e-dos-fluxos-principais-de-aluno-e-professor-no-mobile">MUV-14</issue>.

---

## Mapa de arquivos final

### Aplicação — treinos do treinador

* `apps/mobile/src/application/workouts/trainer-workout-data.ts` — contratos HTTP de lista, detalhe, criação e edição.
* `apps/mobile/src/application/workouts/trainer-workout-data.test.ts` — rotas, bodies, encoding e signals.
* `apps/mobile/src/application/workouts/workout-editor.ts` — estado puro, transformação, parsing, validação e payload.
* `apps/mobile/src/application/workouts/workout-editor.test.ts` — regras do editor, preservação de dados e schemas.

### Aplicação — catálogo

* `apps/mobile/src/application/exercises/exercise-catalog.ts` — query server-side e paginação de exercícios.
* `apps/mobile/src/application/exercises/exercise-catalog.test.ts` — `scope=all`, busca, grupo, offset e signal.
* `apps/mobile/src/lib/muscle-groups.ts` — labels pt-BR dos grupos musculares.
* `apps/mobile/src/lib/muscle-groups.test.ts` — cobertura integral do mapa.

### Componentes de domínio

* `apps/mobile/src/components/workouts/workout-status-badge.tsx` — status semântico.
* `apps/mobile/src/components/workouts/workout-plan-list-item.tsx` — item acessível da lista.
* `apps/mobile/src/components/workouts/workout-plan-list-item.test.tsx` — conteúdo e acessibilidade.
* `apps/mobile/src/components/workouts/workout-day-card.tsx` — leitura de dia/exercícios no detalhe.
* `apps/mobile/src/components/workouts/exercise-catalog-modal.tsx` — catálogo somente leitura.
* `apps/mobile/src/components/workouts/exercise-catalog-modal.test.tsx` — busca, filtro, paginação, retry e seleção.
* `apps/mobile/src/components/workouts/workout-editor-day.tsx` — edição do dia ativo.
* `apps/mobile/src/components/workouts/workout-editor-day.test.tsx` — inputs, reordenação e remoção.

### Screens

* `apps/mobile/src/screens/trainer-workouts.tsx`
* `apps/mobile/src/screens/trainer-workouts.test.tsx`
* `apps/mobile/src/screens/trainer-workout-detail.tsx`
* `apps/mobile/src/screens/trainer-workout-detail.test.tsx`
* `apps/mobile/src/screens/trainer-workout-editor.tsx`
* `apps/mobile/src/screens/trainer-workout-editor.test.tsx`
* `apps/mobile/src/screens/trainer-student-detail.tsx`
* `apps/mobile/src/screens/trainer-student-detail.test.tsx`

### Rotas

* `apps/mobile/app/(trainer)/trainer/students/[studentId]/workouts/index.tsx`
* `apps/mobile/app/(trainer)/trainer/students/[studentId]/workouts/new.tsx`
* `apps/mobile/app/(trainer)/trainer/students/[studentId]/workouts/[planId]/index.tsx`
* `apps/mobile/app/(trainer)/trainer/students/[studentId]/workouts/[planId]/edit.tsx`

### Infra de teste e documentação local

* `apps/mobile/test/react-native.mock.ts` — expor `Alert` para testar confirmação de remoção de dia.
* `apps/mobile/vitest.ui-coverage.config.ts` — adicionar as três novas screens críticas.
* `apps/mobile/AGENTS.md` — atualizar a regra de roles após conclusão <issue id="d20f40a7-2db8-4dd2-a9e3-8df7f6f6d642" href="https://linear.app/muvit/issue/MUV-16/habilitar-acesso-e-navegacao-do-professor-no-app-mobile">MUV-16</issue>–<issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue>.

---

### Task 1: Encapsular os contratos HTTP de workout plans do treinador

**Files:**

* Create: `apps/mobile/src/application/workouts/trainer-workout-data.ts`
* Create: `apps/mobile/src/application/workouts/trainer-workout-data.test.ts`

**Interfaces:**

- Consumes: `ApiRequester` de `apps/mobile/src/lib/api.ts`; schemas de workouts de `@muvit/validators`.
- Produces: `TrainerWorkoutPlanSummary`, `TrainerWorkoutPlan`, `CreateTrainerWorkoutPlanInput`, `UpdateTrainerWorkoutPlanInput`, `listTrainerWorkoutPlans`, `getTrainerWorkoutPlan`, `createTrainerWorkoutPlan`, `updateTrainerWorkoutPlan`.
- [ ] **Step 1: Escrever os testes falhando para lista e detalhe**

Criar `trainer-workout-data.test.ts` com:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  createTrainerWorkoutPlan,
  getTrainerWorkoutPlan,
  listTrainerWorkoutPlans,
  updateTrainerWorkoutPlan,
} from './trainer-workout-data';

describe('trainer-workout-data', () => {
  it('lista planos pelo aluno e encaminha signal', async () => {
    const api = { request: vi.fn().mockResolvedValue({ items: [] }) };
    const signal = new AbortController().signal;

    await listTrainerWorkoutPlans(api, 'student/1', signal);

    expect(api.request).toHaveBeenCalledWith(
      '/students/student%2F1/workout-plans',
      { signal },
    );
  });

  it('carrega o detalhe com planId codificado', async () => {
    const api = { request: vi.fn().mockResolvedValue({ id: 'plan-1' }) };
    const signal = new AbortController().signal;

    await getTrainerWorkoutPlan(api, 'plan/1', signal);

    expect(api.request).toHaveBeenCalledWith('/workout-plans/plan%2F1', { signal });
  });
});
```

- [ ] **Step 2: Escrever os testes falhando para criação e edição**

Adicionar:

```ts
it('cria plano com body exato sem trainerId', async () => {
  const api = { request: vi.fn().mockResolvedValue({ id: 'plan-1' }) };
  const input = {
    studentId: '00000000-0000-0000-0000-000000000001',
    name: 'Hipertrofia',
    status: 'draft' as const,
    days: [
      {
        label: 'Treino A',
        dayOrder: 0,
        exercises: [
          {
            exerciseId: '00000000-0000-0000-0000-000000000101',
            exerciseOrder: 0,
            sets: 3,
            reps: '10',
          },
        ],
      },
    ],
  };

  await createTrainerWorkoutPlan(api, input);

  expect(api.request).toHaveBeenCalledWith('/workout-plans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  expect(JSON.stringify(api.request.mock.calls)).not.toContain('trainerId');
});

it('edita plano sem enviar studentId ou trainerId', async () => {
  const api = { request: vi.fn().mockResolvedValue({ id: 'plan-1' }) };
  const input = {
    name: 'Hipertrofia revisada',
    status: 'active' as const,
    notes: '',
    days: [
      {
        label: 'Treino A',
        dayOrder: 0,
        exercises: [
          {
            exerciseId: '00000000-0000-0000-0000-000000000101',
            exerciseOrder: 0,
            sets: 4,
            reps: '8-10',
            tempo: '3010',
          },
        ],
      },
    ],
  };

  await updateTrainerWorkoutPlan(api, 'plan/1', input);

  expect(api.request).toHaveBeenCalledWith('/workout-plans/plan%2F1', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  expect(JSON.stringify(api.request.mock.calls)).not.toContain('studentId');
  expect(JSON.stringify(api.request.mock.calls)).not.toContain('trainerId');
});
```

- [ ] **Step 3: Rodar o teste para confirmar a falha**

```powershell
pnpm.cmd --dir apps/mobile test src/application/workouts/trainer-workout-data.test.ts
```

Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 4: Implementar tipos e leituras**

Criar:

```ts
import type {
  createWorkoutPlanSchema,
  updateWorkoutPlanSchema,
  workoutPlanFullSchema,
  workoutPlanSummarySchema,
} from '@muvit/validators';
import type { z } from 'zod';
import type { ApiRequester } from '../../lib/api';

export type TrainerWorkoutPlanSummary = z.infer<typeof workoutPlanSummarySchema>;
export type TrainerWorkoutPlan = z.infer<typeof workoutPlanFullSchema>;
export type CreateTrainerWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;
export type UpdateTrainerWorkoutPlanInput = z.infer<typeof updateWorkoutPlanSchema>;

export function listTrainerWorkoutPlans(
  api: ApiRequester,
  studentId: string,
  signal?: AbortSignal,
): Promise<{ items: TrainerWorkoutPlanSummary[] }> {
  return api.request<{ items: TrainerWorkoutPlanSummary[] }>(
    `/students/${encodeURIComponent(studentId)}/workout-plans`,
    { signal },
  );
}

export function getTrainerWorkoutPlan(
  api: ApiRequester,
  planId: string,
  signal?: AbortSignal,
): Promise<TrainerWorkoutPlan> {
  return api.request<TrainerWorkoutPlan>(
    `/workout-plans/${encodeURIComponent(planId)}`,
    { signal },
  );
}
```

- [ ] **Step 5: Implementar mutations**

Adicionar:

```ts
export function createTrainerWorkoutPlan(
  api: ApiRequester,
  input: CreateTrainerWorkoutPlanInput,
): Promise<TrainerWorkoutPlan> {
  return api.request<TrainerWorkoutPlan>('/workout-plans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTrainerWorkoutPlan(
  api: ApiRequester,
  planId: string,
  input: UpdateTrainerWorkoutPlanInput,
): Promise<TrainerWorkoutPlan> {
  return api.request<TrainerWorkoutPlan>(
    `/workout-plans/${encodeURIComponent(planId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}
```

- [ ] **Step 6: Rodar os testes**

```powershell
pnpm.cmd --dir apps/mobile test src/application/workouts/trainer-workout-data.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commitar a unidade**

```
```powershell
git add apps/mobile/src/application/workouts/trainer-workout-data.ts apps/mobile/src/application/workouts/trainer-workout-data.test.ts
git commit -m "feat(mobile): adiciona contratos de treinos do trainer"
```

---

### Task 2: Criar o modelo puro do editor de treino

**Files:**

* Create: `apps/mobile/src/application/workouts/workout-editor.ts`
* Create: `apps/mobile/src/application/workouts/workout-editor.test.ts`

**Interfaces:**

- Consumes: `TrainerWorkoutPlan`, inputs tipados da Task 1, `createWorkoutPlanSchema`, `updateWorkoutPlanSchema`.
- Produces: `WorkoutEditorExercise`, `WorkoutEditorDay`, `WorkoutEditorState`, `WorkoutEditorStatus`, `BuildWorkoutInputResult`, `createEmptyWorkoutEditorState`, `hydrateWorkoutEditorState`, `addWorkoutEditorDay`, `removeWorkoutEditorDay`, `updateWorkoutEditorPlanField`, `updateWorkoutEditorDayLabel`, `addWorkoutEditorExercise`, `removeWorkoutEditorExercise`, `moveWorkoutEditorExercise`, `updateWorkoutEditorExerciseField`, `buildCreateTrainerWorkoutInput`, `buildUpdateTrainerWorkoutInput`.
- [ ] **Step 1: Escrever testes do estado inicial e dos dias**

Criar fixtures com UUIDs válidos e testar:

```ts
it('inicia como rascunho com Treino A', () => {
  const nextId = idFactory();
  const state = createEmptyWorkoutEditorState(nextId);

  expect(state).toEqual({
    name: '',
    notes: '',
    status: 'draft',
    days: [
      {
        localId: 'local-1',
        label: 'Treino A',
        exercises: [],
      },
    ],
  });
});

it('adiciona Treino B até Treino G e bloqueia o oitavo dia', () => {
  const nextId = idFactory();
  let state = createEmptyWorkoutEditorState(nextId);

  for (let index = 0; index < 8; index += 1) {
    state = addWorkoutEditorDay(state, nextId);
  }

  expect(state.days.map((day) => day.label)).toEqual([
    'Treino A',
    'Treino B',
    'Treino C',
    'Treino D',
    'Treino E',
    'Treino F',
    'Treino G',
  ]);
});

it('não remove o último dia', () => {
  const nextId = idFactory();
  const state = createEmptyWorkoutEditorState(nextId);

  expect(removeWorkoutEditorDay(state, 'local-1')).toBe(state);
});
```

Helper de teste:

```ts
function idFactory(): () => string {
  let index = 0;
  return () => `local-${++index}`;
}
```

- [ ] **Step 2: Escrever testes de exercícios e IDs locais**

Cobrir defaults e duplicidade:

```ts
it('adiciona exercício com defaults e localId independente do exerciseId', () => {
  const nextId = idFactory();
  const state = createEmptyWorkoutEditorState(nextId);

  const first = addWorkoutEditorExercise(
    state,
    'local-1',
    {
      id: '00000000-0000-0000-0000-000000000101',
      name: 'Supino reto',
      muscleGroup: 'chest',
    },
    nextId,
  );
  const second = addWorkoutEditorExercise(
    first,
    'local-1',
    {
      id: '00000000-0000-0000-0000-000000000101',
      name: 'Supino reto',
      muscleGroup: 'chest',
    },
    nextId,
  );

  expect(second.days[0]?.exercises).toMatchObject([
    {
      localId: 'local-2',
      exerciseId: '00000000-0000-0000-0000-000000000101',
      sets: '3',
      reps: '10',
      loadKg: '',
      restSeconds: '',
      notes: '',
      tempo: undefined,
    },
    {
      localId: 'local-3',
      exerciseId: '00000000-0000-0000-0000-000000000101',
    },
  ]);
});
```

Adicionar testes para:

- `removeWorkoutEditorExercise`;
- `moveWorkoutEditorExercise(..., -1|1)`;
- não mover além das bordas;
- `updateWorkoutEditorDayLabel`;
- `updateWorkoutEditorExerciseField`.
- [ ] **Step 3: Escrever testes de hidratação de plano existente**

Fixture:

```ts
const existingPlan = workoutPlanFixture({
  name: 'Força',
  status: 'active',
  notes: 'Priorizar técnica',
  days: [
    {
      id: '00000000-0000-0000-0000-000000000201',
      planId: '00000000-0000-0000-0000-000000000301',
      label: 'Treino A',
      dayOrder: 0,
      exercises: [
        {
          id: '00000000-0000-0000-0000-000000000401',
          workoutDayId: '00000000-0000-0000-0000-000000000201',
          exerciseId: '00000000-0000-0000-0000-000000000101',
          exerciseOrder: 0,
          sets: 4,
          reps: '8-10',
          restSeconds: 90,
          loadKg: '82.50',
          tempo: '3010',
          notes: 'Sem falhar',
          exercise: {
            id: '00000000-0000-0000-0000-000000000101',
            name: 'Supino reto',
            muscleGroup: 'chest',
          },
        },
      ],
    },
  ],
});
```

Verificar:

```ts
const state = hydrateWorkoutEditorState(existingPlan, idFactory());

expect(state.days[0]?.exercises[0]).toMatchObject({
  sets: '4',
  reps: '8-10',
  restSeconds: '90',
  loadKg: '82.50',
  notes: 'Sem falhar',
  tempo: '3010',
});
```

- [ ] **Step 4: Escrever testes de parsing e validação**

Cobrir mensagens concretas:

```ts
it.each([
  ['abc', 'Carga deve ser um número válido.'],
  ['1001', 'Carga deve estar entre 0 e 1000 kg.'],
])('rejeita carga %s', (loadKg, message) => {
  const state = validEditorState();
  state.days[0]!.exercises[0]!.loadKg = loadKg;

  expect(buildCreateTrainerWorkoutInput(state, STUDENT_ID)).toEqual({
    ok: false,
    message,
  });
});

it('aceita vírgula decimal na carga', () => {
  const state = validEditorState();
  state.days[0]!.exercises[0]!.loadKg = '82,5';

  const result = buildCreateTrainerWorkoutInput(state, STUDENT_ID);

  expect(result.ok && result.body.days[0]?.exercises[0]?.loadKg).toBe(82.5);
});
```

Adicionar casos:

- nome vazio;
- label de dia vazio;
- dia sem exercício;
- séries vazias;
- séries decimais;
- séries < 1 ou > 20;
- reps vazias;
- reps > 20 chars;
- descanso vazio → `undefined`;
- descanso não inteiro;
- descanso < 0 ou > 600;
- observação de exercício > 500;
- notas do plano > 2000;
- mais de 7 dias.
- [ ] **Step 5: Escrever testes de payload de criação**

Verificar ordem e omissões:

```ts
it('monta criação com ordens recalculadas e sem datas ou tempo', () => {
  const state = validEditorStateWithTwoDays();

  const result = buildCreateTrainerWorkoutInput(state, STUDENT_ID);

  expect(result).toEqual({
    ok: true,
    body: {
      studentId: STUDENT_ID,
      name: 'Hipertrofia',
      notes: 'Progressão semanal',
      status: 'draft',
      days: [
        {
          label: 'Treino A',
          dayOrder: 0,
          exercises: [
            {
              exerciseId: EXERCISE_ID,
              exerciseOrder: 0,
              sets: 3,
              reps: '10',
              loadKg: 82.5,
            },
          ],
        },
        {
          label: 'Treino B',
          dayOrder: 1,
          exercises: [
            {
              exerciseId: ROW_ID,
              exerciseOrder: 0,
              sets: 4,
              reps: '8',
            },
          ],
        },
      ],
    },
  });

  const json = JSON.stringify(result);
  expect(json).not.toContain('startDate');
  expect(json).not.toContain('endDate');
  expect(json).not.toContain('tempo');
});
```

- [ ] **Step 6: Escrever testes de payload de edição**

Obrigatório:

```ts
it('preserva tempo existente e envia notes vazio ao limpar notas do plano', () => {
  const state = hydrateWorkoutEditorState(existingPlan, idFactory());
  state.notes = '';

  const result = buildUpdateTrainerWorkoutInput(state);

  expect(result.ok && result.body.notes).toBe('');
  expect(
    result.ok && result.body.days?.[0]?.exercises[0]?.tempo,
  ).toBe('3010');

  const json = JSON.stringify(result);
  expect(json).not.toContain('studentId');
  expect(json).not.toContain('startDate');
  expect(json).not.toContain('endDate');
});
```

Também testar que exercício novo em edição não ganha `tempo`.

- [ ] **Step 7: Rodar testes para confirmar falha**

```powershell
pnpm.cmd --dir apps/mobile test src/application/workouts/workout-editor.test.ts
```

Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 8: Implementar os tipos do estado**

Usar:

```ts
import { createWorkoutPlanSchema, updateWorkoutPlanSchema } from '@muvit/validators';
import type {
  CreateTrainerWorkoutPlanInput,
  TrainerWorkoutPlan,
  UpdateTrainerWorkoutPlanInput,
} from './trainer-workout-data';

export type WorkoutEditorStatus = 'active' | 'draft';

export type WorkoutEditorExercise = {
  localId: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: string;
  reps: string;
  restSeconds: string;
  loadKg: string;
  notes: string;
  tempo?: string;
};

export type WorkoutEditorDay = {
  localId: string;
  label: string;
  exercises: WorkoutEditorExercise[];
};

export type WorkoutEditorState = {
  name: string;
  notes: string;
  status: WorkoutEditorStatus;
  days: WorkoutEditorDay[];
};

export type BuildWorkoutInputResult<T> =
  | { ok: true; body: T }
  | { ok: false; message: string };
```

- [ ] **Step 9: Implementar criação/hidratação e operações imutáveis**

Defaults:

```ts
const DEFAULT_DAY_LABELS = [
  'Treino A',
  'Treino B',
  'Treino C',
  'Treino D',
  'Treino E',
  'Treino F',
  'Treino G',
] as const;

export function createEmptyWorkoutEditorState(
  createId: () => string,
): WorkoutEditorState {
  return {
    name: '',
    notes: '',
    status: 'draft',
    days: [
      {
        localId: createId(),
        label: DEFAULT_DAY_LABELS[0],
        exercises: [],
      },
    ],
  };
}
```

Hidratação do exercício:

```ts
{
  localId: createId(),
  exerciseId: item.exerciseId,
  exerciseName: item.exercise.name,
  muscleGroup: item.exercise.muscleGroup,
  sets: String(item.sets),
  reps: item.reps,
  restSeconds: item.restSeconds === null ? '' : String(item.restSeconds),
  loadKg: item.loadKg === null ? '' : String(item.loadKg),
  notes: item.notes ?? '',
  tempo: item.tempo ?? undefined,
}
```

Operações devem sempre retornar novo estado quando houver mudança e preservar referência quando a operação for inválida/borda.

- [ ] **Step 10: Implementar parsing e builders**

Helpers internos:

```ts
function parseRequiredInteger(
  label: string,
  raw: string,
  min: number,
  max: number,
): { ok: true; value: number } | { ok: false; message: string } {
  const normalized = raw.trim();
  if (!/^-?\d+$/.test(normalized)) {
    return { ok: false, message: `${label} deve ser um número inteiro.` };
  }

  const value = Number(normalized);
  if (value < min || value > max) {
    return { ok: false, message: `${label} deve estar entre ${min} e ${max}.` };
  }

  return { ok: true, value };
}

function parseOptionalDecimal(
  label: string,
  raw: string,
  min: number,
  max: number,
): { ok: true; value?: number } | { ok: false; message: string } {
  const normalized = raw.replace(',', '.').trim();
  if (!normalized) return { ok: true, value: undefined };

  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${label} deve ser um número válido.` };
  }
  if (value < min || value > max) {
    return {
      ok: false,
      message: `${label} deve estar entre ${min} e ${max}${label === 'Carga' ? ' kg' : ''}.`,
    };
  }

  return { ok: true, value };
}
```

Para descanso, usar helper inteiro opcional com mensagem **Descanso deve ser um número inteiro.** e faixa **Descanso deve estar entre 0 e 600 segundos.**

Antes do schema, validar:

* `state.name.trim()`;
* `state.days.length` entre 1 e 7;
* cada `day.label.trim()`;
* cada dia com ao menos 1 exercício;
* `reps.trim()`.

Depois montar candidato e executar:

```ts
const parsed = createWorkoutPlanSchema.safeParse(candidate);
```

ou:

```ts
const parsed = updateWorkoutPlanSchema.safeParse(candidate);
```

Se o schema rejeitar depois das validações locais, retornar **Revise os dados do treino.** em vez de expor paths internos do Zod.

- [ ] **Step 11: Rodar testes do editor**

```powershell
pnpm.cmd --dir apps/mobile test src/application/workouts/workout-editor.test.ts
```

Expected: PASS.

- [ ] **Step 12: Rodar cobertura core específica**

```powershell
pnpm.cmd --dir apps/mobile test:coverage:core
```

Expected: PASS sem reduzir os thresholds atuais.

- [ ] **Step 13: Commitar a unidade**

```powershell
git add apps/mobile/src/application/workouts/workout-editor.ts apps/mobile/src/application/workouts/workout-editor.test.ts
git commit -m "feat(mobile): adiciona modelo do editor de treino"
```

---

### Task 3: Implementar catálogo de exercícios e labels musculares

**Files:**

* Create: `apps/mobile/src/application/exercises/exercise-catalog.ts`
* Create: `apps/mobile/src/application/exercises/exercise-catalog.test.ts`
* Create: `apps/mobile/src/lib/muscle-groups.ts`
* Create: `apps/mobile/src/lib/muscle-groups.test.ts`

**Interfaces:**

- Consumes: `ApiRequester`, `exerciseSchema`, `muscleGroupSchema`.
- Produces: `EXERCISE_CATALOG_PAGE_SIZE`, `Exercise`, `ExerciseCatalogPage`, `ListExerciseCatalogInput`, `listExerciseCatalog`, `MuscleGroup`, `MUSCLE_GROUP_LABEL`, `muscleGroupLabel`.
- [ ] **Step 1: Escrever testes da query do catálogo**

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  EXERCISE_CATALOG_PAGE_SIZE,
  listExerciseCatalog,
} from './exercise-catalog';

describe('exercise-catalog', () => {
  it('lista scope all sem q ou grupo quando filtros estão vazios', async () => {
    const api = { request: vi.fn().mockResolvedValue({ items: [], total: 0 }) };

    await listExerciseCatalog(api, {
      q: '   ',
      limit: EXERCISE_CATALOG_PAGE_SIZE,
      offset: 0,
    });

    expect(api.request).toHaveBeenCalledWith(
      '/exercises?scope=all&limit=50&offset=0',
      { signal: undefined },
    );
  });

  it('normaliza busca, aplica grupo e encaminha signal', async () => {
    const api = { request: vi.fn().mockResolvedValue({ items: [], total: 0 }) };
    const signal = new AbortController().signal;

    await listExerciseCatalog(api, {
      q: '  Supino reto  ',
      muscleGroup: 'chest',
      limit: 50,
      offset: 50,
      signal,
    });

    expect(api.request).toHaveBeenCalledWith(
      '/exercises?scope=all&q=Supino%20reto&muscleGroup=chest&limit=50&offset=50',
      { signal },
    );
    expect(JSON.stringify(api.request.mock.calls)).not.toContain('trainerId');
  });
});
```

- [ ] **Step 2: Escrever teste dos labels**

```ts
import { describe, expect, it } from 'vitest';
import { MUSCLE_GROUP_LABEL, muscleGroupLabel } from './muscle-groups';

it('possui label pt-BR para todos os grupos', () => {
  expect(MUSCLE_GROUP_LABEL).toEqual({
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
  });
});

it('mantém valor desconhecido legível sem cast inseguro', () => {
  expect(muscleGroupLabel('grupo-legado')).toBe('grupo-legado');
  expect(muscleGroupLabel('chest')).toBe('Peito');
});
```

- [ ] **Step 3: Rodar para confirmar falha**

```powershell
pnpm.cmd --dir apps/mobile test src/application/exercises/exercise-catalog.test.ts src/lib/muscle-groups.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Implementar o catálogo**

```ts
import type { exerciseSchema } from '@muvit/validators';
import type { z } from 'zod';
import type { ApiRequester } from '../../lib/api';

export const EXERCISE_CATALOG_PAGE_SIZE = 50;

export type Exercise = z.infer<typeof exerciseSchema>;

export type ExerciseCatalogPage = {
  items: Exercise[];
  total: number;
};

export type ListExerciseCatalogInput = {
  q?: string;
  muscleGroup?: Exercise['muscleGroup'];
  limit: number;
  offset: number;
  signal?: AbortSignal;
};

export function listExerciseCatalog(
  api: ApiRequester,
  input: ListExerciseCatalogInput,
): Promise<ExerciseCatalogPage> {
  const normalizedQuery = input.q?.trim();
  const query = [
    'scope=all',
    normalizedQuery ? `q=${encodeURIComponent(normalizedQuery)}` : null,
    input.muscleGroup ? `muscleGroup=${encodeURIComponent(input.muscleGroup)}` : null,
    `limit=${input.limit}`,
    `offset=${input.offset}`,
  ]
    .filter((value): value is string => value !== null)
    .join('&');

  return api.request<ExerciseCatalogPage>(`/exercises?${query}`, {
    signal: input.signal,
  });
}
```

- [ ] **Step 5: Implementar o mapa muscular com tipagem exaustiva**

```ts
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
  return value in MUSCLE_GROUP_LABEL
    ? MUSCLE_GROUP_LABEL[value as MuscleGroup]
    : value;
}
```

- [ ] **Step 6: Rodar testes**

```powershell
pnpm.cmd --dir apps/mobile test src/application/exercises/exercise-catalog.test.ts src/lib/muscle-groups.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commitar a unidade**

```powershell
git add apps/mobile/src/application/exercises/exercise-catalog.ts apps/mobile/src/application/exercises/exercise-catalog.test.ts apps/mobile/src/lib/muscle-groups.ts apps/mobile/src/lib/muscle-groups.test.ts
git commit -m "feat(mobile): adiciona catálogo de exercícios do trainer"
```

---

### Task 4: Entregar a lista de planos do aluno

**Files:**

* Create: `apps/mobile/src/components/workouts/workout-status-badge.tsx`
* Create: `apps/mobile/src/components/workouts/workout-plan-list-item.tsx`
* Create: `apps/mobile/src/components/workouts/workout-plan-list-item.test.tsx`
* Create: `apps/mobile/src/screens/trainer-workouts.tsx`
* Create: `apps/mobile/src/screens/trainer-workouts.test.tsx`
* Create: `apps/mobile/app/(trainer)/trainer/students/[studentId]/workouts/index.tsx`

**Interfaces:**

- Consumes: `TrainerWorkoutPlanSummary`, `listTrainerWorkoutPlans`, `ApiError`, `Card`, `StatePanel`, `InlineMessage`, `AppButton`.
- Produces: rota `/trainer/students/:studentId/workouts`.
- [ ] **Step 1: Escrever testes do status e item de lista**

Fixture:

```ts
function planFixture(
  overrides: Partial<TrainerWorkoutPlanSummary> = {},
): TrainerWorkoutPlanSummary {
  return {
    id: '00000000-0000-0000-0000-000000000301',
    studentId: '00000000-0000-0000-0000-000000000001',
    trainerId: '00000000-0000-0000-0000-000000000901',
    name: 'Hipertrofia',
    startDate: null,
    endDate: null,
    status: 'draft',
    createdAt: '2026-09-06T12:00:00.000Z',
    ...overrides,
  };
}
```

Testar:

- `draft → Rascunho`;
- `active → Ativo`;
- `archived → Arquivado`;
- label acessível do item contém nome + status;
- período `01/09/2026 — 30/09/2026`;
- somente início;
- somente fim;
- data de criação sempre visível;
- `onPress` chamado.
- [ ] **Step 2: Rodar o teste para confirmar falha**

```powershell
pnpm.cmd --dir apps/mobile test src/components/workouts/workout-plan-list-item.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implementar o badge**

Mapeamento:

```ts
const statusCopy = {
  active: 'Ativo',
  draft: 'Rascunho',
  archived: 'Arquivado',
} as const satisfies Record<TrainerWorkoutPlanSummary['status'], string>;
```

Estilos semânticos:

* `active`: `colors.primarySoft` + `colors.primaryText`;
* `draft`: `colors.warningSoft` + `colors.warningText`;
* `archived`: `colors.background` + `colors.muted` + borda `colors.line`.

Exportar:

```ts
export function workoutStatusLabel(
  status: TrainerWorkoutPlanSummary['status'],
): string;
```

para reutilizar no item e no detalhe.

- [ ] **Step 4: Implementar o item da lista**

Estrutura:

```tsx
<Pressable
  accessible
  accessibilityLabel={`Abrir ${plan.name}, ${workoutStatusLabel(plan.status)}`}
  accessibilityRole="button"
  onPress={onPress}
>
  <Card>
    <Text>{plan.name}</Text>
    <WorkoutStatusBadge status={plan.status} />
    <Text>{formatWorkoutPeriod(plan.startDate, plan.endDate)}</Text>
    <Text>{`Criado em ${formatDate(plan.createdAt)}`}</Text>
  </Card>
</Pressable>
```

Quando não houver período, omitir a linha de período em vez de exibir dado inventado.

- [ ] **Step 5: Escrever os testes da screen**

Harness com `QueryClientProvider`, mocks de `useApiClient` e `expo-router`.

Cobrir:

* `studentId` ausente → **Aluno inválido**, zero request;
* loading;
* `404` → **Treinos não encontrados**;
* erro genérico + retry;
* vazio → **Nenhum treino cadastrado** + **Novo treino**;
* renderização dos três status;
* abrir detalhe;
* abrir novo treino;
* voltar para aluno;
* refetch preservando lista;
* refetch falho → `InlineMessage`;
* 404 em refetch oculta cache antigo.

Navegação esperada:

```ts
expect(routerState.push).toHaveBeenCalledWith({
  pathname: '/trainer/students/[studentId]/workouts/[planId]',
  params: { studentId: STUDENT_ID, planId: PLAN_ID },
});
```

e:

```ts
expect(routerState.push).toHaveBeenCalledWith({
  pathname: '/trainer/students/[studentId]/workouts/new',
  params: { studentId: STUDENT_ID },
});
```

- [ ] **Step 6: Rodar screen test para confirmar falha**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-workouts.test.tsx
```

Expected: FAIL.

- [ ] **Step 7: Implementar** `TrainerWorkoutsScreen`

Query:

```ts
const query = useQuery({
  enabled: Boolean(studentId),
  queryKey: ['trainer', 'workouts', studentId],
  queryFn: ({ signal }) => {
    if (!studentId) throw new Error('Aluno inválido.');
    return listTrainerWorkoutPlans(api, studentId, signal);
  },
});
```

Regra de 404:

```ts
const isNotFound = query.error instanceof ApiError && query.error.status === 404;
```

Avaliar `isNotFound` antes de renderizar `query.data`, inclusive após refetch.

Retorno:

```ts
router.dismissTo(
  studentId ? `/trainer/students/${studentId}` : '/trainer/students',
);
```

- [ ] **Step 8: Criar o entrypoint**

`workouts/index.tsx`:

```tsx
import { TrainerWorkoutsScreen } from '../../../../../../src/screens/trainer-workouts';

export default function TrainerWorkoutsRoute() {
  return <TrainerWorkoutsScreen />;
}
```

- [ ] **Step 9: Rodar os testes da unidade**

```powershell
pnpm.cmd --dir apps/mobile test src/components/workouts/workout-plan-list-item.test.tsx src/screens/trainer-workouts.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commitar a unidade**

```powershell
git add apps/mobile/src/components/workouts/workout-status-badge.tsx apps/mobile/src/components/workouts/workout-plan-list-item.tsx apps/mobile/src/components/workouts/workout-plan-list-item.test.tsx apps/mobile/src/screens/trainer-workouts.tsx apps/mobile/src/screens/trainer-workouts.test.tsx apps/mobile/app/'(trainer)'/trainer/students/'[studentId]'/workouts/index.tsx
git commit -m "feat(mobile): adiciona lista de treinos do trainer"
```

---

### Task 5: Entregar o detalhe somente leitura do plano

**Files:**

* Create: `apps/mobile/src/components/workouts/workout-day-card.tsx`
* Create: `apps/mobile/src/screens/trainer-workout-detail.tsx`
* Create: `apps/mobile/src/screens/trainer-workout-detail.test.tsx`
* Create: `apps/mobile/app/(trainer)/trainer/students/[studentId]/workouts/[planId]/index.tsx`

**Interfaces:**

- Consumes: `TrainerWorkoutPlan`, `getTrainerWorkoutPlan`, `WorkoutStatusBadge`, `muscleGroupLabel`.
- Produces: rota `/trainer/students/:studentId/workouts/:planId` em leitura; a ação de edição será acrescentada na Task 9.
- [ ] **Step 1: Escrever testes do detalhe**

Cobrir:

- params ausentes;
- loading;
- `404` genérico;
- erro + retry;
- mismatch `plan.studentId !== studentId`;
- nome, status e período;
- notas presentes;
- notes `null` ou `''` tratados como ausência;
- dias e exercícios na ordem recebida;
- séries/reps sempre visíveis;
- carga opcional em `kg`;
- descanso opcional em `s`;
- observação opcional;
- `tempo` não exibido;
- atualizar;
- erro de atualização preservando conteúdo;
- 404 de atualização ocultando cache;
- retorno determinístico para lista;
- ausência de excluir/arquivar/duplicar.
- [ ] **Step 2: Rodar para confirmarfalha**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-workout-detail.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implementar** `WorkoutDayCard`

Estrutura de leitura:

```tsx
<Card>
  <Text style={styles.title}>{day.label}</Text>

  {day.exercises.map((item) => (
    <View key={item.id} style={styles.exercise}>
      <Text style={styles.exerciseName}>{item.exercise.name}</Text>
      <Text style={sharedStyles.subtitle}>
        {muscleGroupLabel(item.exercise.muscleGroup)}
      </Text>
      <Text style={sharedStyles.subtitle}>
        {`${item.sets} séries · ${item.reps} reps`}
      </Text>
      {item.loadKg !== null ? (
        <Text style={sharedStyles.subtitle}>{`Carga: ${formatDecimal(item.loadKg)} kg`}</Text>
      ) : null}
      {item.restSeconds !== null ? (
        <Text style={sharedStyles.subtitle}>{`Descanso: ${item.restSeconds}s`}</Text>
      ) : null}
      {item.notes?.trim() ? (
        <Text style={sharedStyles.subtitle}>{item.notes}</Text>
      ) : null}
    </View>
  ))}
</Card>
```

Não renderizar `tempo`.

- [ ] **Step 4: Implementar a query e estados da screen**

```ts
const query = useQuery({
  enabled: Boolean(studentId && planId),
  queryKey: ['trainer', 'workout', planId],
  queryFn: ({ signal }) => {
    if (!planId) throw new Error('Treino inválido.');
    return getTrainerWorkoutPlan(api, planId, signal);
  },
});
```

Após obter dados:

```ts
if (query.data.studentId !== studentId) {
  return <StatePanel ... title="Treino indisponível" ... />;
}
```

`404` usa:

- título **Treino não encontrado**;
- descrição **Este treino não está disponível para sua conta.**
- [ ] **Step 5: Implementar conteúdo de detalhe**

Ordem:

1. **Voltar para treinos**;
2. `ScreenHeader` com nome;
3. status;
4. período se existir;
5. notas se `trim()` não estiver vazio;
6. `WorkoutDayCard` para cada dia;
7. `InlineMessage` de erro de atualização;
8. **Atualizar**.

Não adicionar ainda o botão de edição; a Task 9 acrescenta a navegação somente quando o editor de edição existir.

- [ ] **Step 6: Criar o entrypoint**

```tsx
import { TrainerWorkoutDetailScreen } from '../../../../../../../src/screens/trainer-workout-detail';

export default function TrainerWorkoutDetailRoute() {
  return <TrainerWorkoutDetailScreen />;
}
```

- [ ] **Step 7: Rodar os testes**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-workout-detail.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commitar a unidade**

```powershell
git add apps/mobile/src/components/workouts/workout-day-card.tsx apps/mobile/src/screens/trainer-workout-detail.tsx apps/mobile/src/screens/trainer-workout-detail.test.tsx apps/mobile/app/'(trainer)'/trainer/students/'[studentId]'/workouts/'[planId]'/index.tsx
git commit -m "feat(mobile): adiciona detalhe de treino do trainer"
```

---

### Task 6: Criar o modal somente leitura do catálogo de exercícios

**Files:**

* Create: `apps/mobile/src/components/workouts/exercise-catalog-modal.tsx`
* Create: `apps/mobile/src/components/workouts/exercise-catalog-modal.test.tsx`

**Interfaces:**

- Consumes: `listExerciseCatalog`, `EXERCISE_CATALOG_PAGE_SIZE`, `Exercise`, `muscleGroupLabel`, `useApiClient`.
- Produces: `ExerciseCatalogModal({ visible, onClose, onSelect, disabled? })`.
- [ ] **Step 1: Escrever harness e testes do modal**

Props:

```ts
export type ExerciseCatalogModalProps = {
  visible: boolean;
  disabled?: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
};
```

Cobrir:

- `visible=false` → nenhum request;
- abrir → query inicial `scope=all&limit=50&offset=0`;
- loading;
- erro + retry;
- vazio;
- texto digitado não dispara request até **Buscar**;
- busca aplicada;
- **Limpar busca**;
- filtro de grupo reinicia em offset 0;
- labels pt-BR;
- equipamento opcional;
- item acessível seleciona e chama `onSelect`;
- carregar mais;
- erro de paginação preserva itens;
- refresh/fetch concorrente bloqueia ações de busca/paginação;
- nenhuma ação **Criar exercício**, **Editar exercício** ou **Excluir exercício**.
- [ ] **Step 2: Rodar para confirmar falha**

```powershell
pnpm.cmd --dir apps/mobile test src/components/workouts/exercise-catalog-modal.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implementar estado de busca e filtro**

```ts
const [draftSearch, setDraftSearch] = useState('');
const [appliedSearch, setAppliedSearch] = useState('');
const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | undefined>();
```

Query:

```ts
const query = useInfiniteQuery({
  enabled: visible,
  queryKey: [
    'trainer',
    'exercise-catalog',
    appliedSearch,
    muscleGroup ?? 'all',
  ],
  initialPageParam: 0,
  queryFn: ({ pageParam, signal }) =>
    listExerciseCatalog(api, {
      q: appliedSearch,
      muscleGroup,
      limit: EXERCISE_CATALOG_PAGE_SIZE,
      offset: pageParam,
      signal,
    }),
  getNextPageParam: (lastPage, pages) => {
    const loaded = pages.reduce(
      (total, page) => total + page.items.length,
      0,
    );
    return loaded < lastPage.total ? loaded : undefined;
  },
});
```

- [ ] **Step 4: Implementar o** `Modal` **nativo**

Shell:

```tsx
<Modal
  animationType="slide"
  onRequestClose={onClose}
  transparent
  visible={visible}
>
  <View style={styles.backdrop}>
    <View style={styles.sheet}>
      ...
    </View>
  </View>
</Modal>
```

Usar:

* `colors.scrim`;
* `colors.surface`;
* `radii.sheet`;
* `spacing`;
* `typography`.

Ação explícita **Fechar catálogo**.

- [ ] **Step 5: Implementar busca e filtros**

Busca:

* `Field label="Buscar exercício"`;
* **Buscar** aplica `draftSearch.trim()`;
* **Limpar busca** limpa ambos.

Filtro muscular:

- `ScrollView horizontal`;
- primeiro chip **Todos**;
- depois os 10 grupos;
- `Pressable` com `accessibilityState={{ selected }}`;
- mudança de grupo atualiza `muscleGroup`.
- [ ] **Step 6: Implementar lista e paginação**

Item:

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={`Selecionar ${exercise.name}, ${muscleGroupLabel(exercise.muscleGroup)}`}
  onPress={() => onSelect(exercise)}
>
  <Text>{exercise.name}</Text>
  <Text>{muscleGroupLabel(exercise.muscleGroup)}</Text>
  {exercise.equipment ? <Text>{exercise.equipment}</Text> : null}
</Pressable>
```

Durante `query.isFetching`, desabilitar **Buscar**, filtros e **Carregar mais** para impedir operações concorrentes sobre a mesma infinite query.

- [ ] **Step 7: Rodar testes**

```powershell
pnpm.cmd --dir apps/mobile test src/components/workouts/exercise-catalog-modal.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commitar a unidade**

```powershell
git add apps/mobile/src/components/workouts/exercise-catalog-modal.tsx apps/mobile/src/components/workouts/exercise-catalog-modal.test.tsx
git commit -m "feat(mobile): adiciona seletor de exercícios"
```

---

### Task 7: Criar a edição visual do dia ativo

**Files:**

* Create: `apps/mobile/src/components/workouts/workout-editor-day.tsx`
* Create: `apps/mobile/src/components/workouts/workout-editor-day.test.tsx`

**Interfaces:**

- Consumes: `WorkoutEditorDay`, `WorkoutEditorExercise`, `Field`, `Card`, `AppButton`.
- Produces: `WorkoutEditorDayView`, uma composição controlada sem estado de domínio próprio.
- [ ] **Step 1: Definir props e escrever testes**

```ts
export type WorkoutEditorDayViewProps = {
  day: WorkoutEditorDay;
  disabled?: boolean;
  onChangeLabel: (value: string) => void;
  onAddExercise: () => void;
  onChangeExercise: (
    exerciseLocalId: string,
    field: 'sets' | 'reps' | 'loadKg' | 'restSeconds' | 'notes',
    value: string,
  ) => void;
  onMoveExercise: (exerciseLocalId: string, direction: -1 | 1) => void;
  onRemoveExercise: (exerciseLocalId: string) => void;
};
```

Testar:

- label do dia;
- vazio com texto **Nenhum exercício neste dia**;
- **Adicionar exercício**;
- nome e grupo;
- fields Séries, Repetições, Carga, Descanso e Observação;
- carga com `keyboardType="decimal-pad"`;
- séries/descanso com teclado numérico;
- mover primeiro para cima desabilitado;
- mover último para baixo desabilitado;
- callbacks com `localId`;
- remover por label `Remover Supino reto`;
- `tempo` não aparece;
- `disabled` bloqueia todas as ações mutáveis.
- [ ] **Step 2: Rodar para confirmar falha**

```powershell
pnpm.cmd --dir apps/mobile test src/components/workouts/workout-editor-day.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implementar a composição**

Estrutura:

```tsx
<Card>
  <Field
    editable={!disabled}
    label="Nome do dia"
    onChangeText={onChangeLabel}
    value={day.label}
  />

  {day.exercises.length === 0 ? (
    <Text style={sharedStyles.subtitle}>Nenhum exercício neste dia</Text>
  ) : null}

  {day.exercises.map((exercise, index) => (
    <Card key={exercise.localId}>
      <Text>{exercise.exerciseName}</Text>
      <Text>{muscleGroupLabel(exercise.muscleGroup)}</Text>
      <Field label="Séries" ... />
      <Field label="Repetições" ... />
      <Field label="Carga" unit="kg" ... />
      <Field label="Descanso" unit="s" ... />
      <Field label="Observação" multiline ... />
      <AppButton
        disabled={disabled || index === 0}
        label={`Mover ${exercise.exerciseName} para cima`}
        ...
      />
      <AppButton
        disabled={disabled || index === day.exercises.length - 1}
        label={`Mover ${exercise.exerciseName} para baixo`}
        ...
      />
      <AppButton
        disabled={disabled}
        label={`Remover ${exercise.exerciseName}`}
        ...
      />
    </Card>
  ))}

  <AppButton
    disabled={disabled}
    label="Adicionar exercício"
    onPress={onAddExercise}
  />
</Card>
```

- [ ] **Step 4: Rodar testes**

```powershell
pnpm.cmd --dir apps/mobile test src/components/workouts/workout-editor-day.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commitar a unidade**

```powershell
git add apps/mobile/src/components/workouts/workout-editor-day.tsx apps/mobile/src/components/workouts/workout-editor-day.test.tsx
git commit -m "feat(mobile): adiciona edição visual do dia"
```

---

### Task 8: Implementar criação de treino no editor mobile

**Files:**

* Create: `apps/mobile/src/screens/trainer-workout-editor.tsx`
* Create: `apps/mobile/src/screens/trainer-workout-editor.test.tsx`
* Create: `apps/mobile/app/(trainer)/trainer/students/[studentId]/workouts/new.tsx`
* Modify: `apps/mobile/test/react-native.mock.ts`

**Interfaces:**

- Consumes: modelo da Task 2, catálogo da Task 6, `WorkoutEditorDayView`, `createTrainerWorkoutPlan`, global `queryClient`.
- Produces inicialmente: `TrainerWorkoutEditorScreen({ mode: 'create' })`; a Task 9 amplia para `mode: 'edit'`.
- [ ] **Step 1: Expor** `Alert` **no mock de React Native**

Adicionar em `test/react-native.mock.ts`:

```ts
export const Alert = {
  alert: (
    _title: string,
    _message?: string,
    _buttons?: Array<{
      text?: string;
      style?: string;
      onPress?: () => void;
    }>,
  ) => undefined,
};
```

Isso permite `vi.spyOn(Alert, 'alert')` sem mudar o runtime real.

- [ ] **Step 2: Escrever testes do estado inicial de criação**

Harness:

* `paramsState.studentId = STUDENT_ID`;
* mock `useApiClient`;
* mock `queryClient.invalidateQueries` e `setQueryData`;
* QueryClientProvider apenas para o catálogo/modal se necessário.

Casos:

- `studentId` ausente → **Aluno inválido**, zero POST;
- título **Novo treino**;
- status inicial **Rascunho** selecionado;
- um dia **Treino A**;
- nenhum exercício;
- **Adicionar dia** cria **Treino B**;
- até 7 dias;
- trocar dia ativo preserva os demais.
- [ ] **Step 3: Escrever teste da confirmação ao remover dia com conteúdo**

Fluxo:

```tsx
await user.press(screen.getByRole('button', { name: 'Adicionar exercício' }));
// selecionar Supino no modal
await user.press(screen.getByRole('button', { name: /Selecionar Supino reto/ }));

await user.press(screen.getByRole('button', { name: 'Adicionar dia' }));
await user.press(screen.getByRole('button', { name: 'Selecionar Treino A' }));
await user.press(screen.getByRole('button',
``` { name: 'Remover Treino A' }));

expect(Alert.alert).toHaveBeenCalledWith(
  'Remover dia?',
  'O dia Treino A e seus exercícios serão removidos deste treino.',
  expect.any(Array),
);
```

Capturar os botões do `Alert.alert`, invocar primeiro **Cancelar** e verificar que o dia permanece; depois abrir de novo e invocar **Remover dia**, verificando que o dia some e o dia restante fica ativo.

Dia vazio com mais de um dia deve remover sem `Alert.alert`.

- [ ] **Step 4: Escrever teste de integração com catálogo**

Mockar a API em sequência para o catálogo e para o POST.

Confirmar:

- **Adicionar exercício** abre **Adicionar exercício**;
- selecionar exercício fecha o modal;
- exercício aparece com Séries 3 e Repetições 10;
- mesmo exercício pode ser adicionado novamente sem colisão;
- remoção e reordenação funcionam via callbacks.
- [ ] **Step 5: Escrever teste de validação sem POST**

```tsx
await user.type(screen.getByLabelText('Nome do treino'), 'Hipertrofia');
await user.press(screen.getByRole('button', { name: 'Salvar treino' }));

expect(await screen.findByText('Cada dia precisa ter ao menos 1 exercício.')).toBeTruthy();
expect(apiState.request).not.toHaveBeenCalledWith(
  '/workout-plans',
  expect.anything(),
);
```

Também testar carga `abc`, séries `2.5` e reps vazias.

- [ ] **Step 6: Escrever teste do POST e cache**

Preencher:

* nome;
* notas;
* status ativo;
* um exercício;
* carga `82,5`;
* descanso `90`;
* observação.

Resposta do POST: `createdPlan`.

Esperar:

```ts
expect(apiState.request).toHaveBeenCalledWith('/workout-plans', {
  method: 'POST',
  body: JSON.stringify(expectedBody),
});

expect(queryState.invalidateQueries).toHaveBeenCalledWith({
  queryKey: ['trainer', 'workouts', STUDENT_ID],
});
expect(queryState.invalidateQueries).toHaveBeenCalledWith({
  queryKey: ['trainer', 'summary'],
});
expect(queryState.setQueryData).toHaveBeenCalledWith(
  ['trainer', 'workout', PLAN_ID],
  createdPlan,
);
expect(await screen.findByText('Treino salvo com sucesso.')).toBeTruthy();
expect(screen.getByRole('button', { name: 'Ver treino' })).toBeTruthy();
```

Pressionar **Ver treino**:

```ts
expect(routerState.replace).toHaveBeenCalledWith(
  `/trainer/students/${STUDENT_ID}/workouts/${PLAN_ID}`,
);
```

- [ ] **Step 7: Escrever testes de erro e sucesso transitório**

Cobrir:

- submit concorrente: botão vira **Salvando...** e fica disabled;
- erro de POST → **Não foi possível salvar o treino.** e valores permanecem;
- após sucesso, qualquer nova alteração remove a mensagem e o botão **Ver treino**.
- [ ] **Step 8: Rodar para confirmar falha**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-workout-editor.test.tsx
```

Expected: FAIL.

- [ ] **Step 9: Implementar factory estável de IDs locais na screen**

```ts
const localIdCounter = useRef(0);
const createLocalId = useCallback(() => {
  localIdCounter.current += 1;
  return `workout-local-${localIdCounter.current}`;
}, []);

const [editor, setEditor] = useState(() =>
  createEmptyWorkoutEditorState(createLocalId),
);
```

- [ ] **Step 10: Implementar mutação controlada do editor**

Toda alteração local deve limpar sucesso anterior:

```ts
function changeEditor(
  updater: (current: WorkoutEditorState) => WorkoutEditorState,
): void {
  if (submitting) return;
  setCreatedPlan(undefined);
  setSuccessMessage(undefined);
  setError(undefined);
  setEditor(updater);
}
```

Manter `activeDayId` separado e atualizar quando um dia ativo for removido.

- [ ] **Step 11: Implementar status e seletor de dia**

Status:

* dois `Pressable`: **Rascunho** e **Ativo**;
* `accessibilityState={{ selected: editor.status === 'draft' }}` etc.;
* sem opção Arquivado.

Dias:

- `ScrollView horizontal`;
- botão acessível `Selecionar ${day.label}`;
- `accessibilityState={{ selected: activeDayId === day.localId }}`;
- ação **Adicionar dia** disabled em 7;
- ação **Remover ${day.label}** disabled quando só existir 1 dia.
- [ ] **Step 12: Implementar remoção segura de dia**

```ts
function requestRemoveDay(dayId: string): void {
  const day = editor.days.find((item) => item.localId === dayId);
  if (!day || editor.days.length <= 1 || submitting) return;

  const remove = () => {
    const next = removeWorkoutEditorDay(editor, dayId);
    setEditor(next);
    if (activeDayId === dayId) {
      setActiveDayId(next.days[0]?.localId);
    }
  };

  if (day.exercises.length === 0) {
    remove();
    return;
  }

  Alert.alert(
    'Remover dia?',
    `O dia ${day.label} e seus exercícios serão removidos deste treino.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover dia', style: 'destructive', onPress: remove },
    ],
  );
}
```

Antes de `remove()`, limpar feedback de sucesso/erro da mesma forma que `changeEditor`.

- [ ] **Step 13: Integrar** `WorkoutEditorDayView` **e catálogo**

Estado:

```ts
const [catalogOpen, setCatalogOpen] = useState(false);
```

Ao selecionar:

```ts
function selectExercise(exercise: Exercise): void {
  if (!activeDayId) return;
  changeEditor((current) =>
    addWorkoutEditorExercise(
      current,
      activeDayId,
      {
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
      },
      createLocalId,
    ),
  );
  setCatalogOpen(false);
}
```

- [ ] **Step 14: Implementar submit de criação**

```ts
async function submitCreate(): Promise<void> {
  if (!studentId || submitting) return;

  const result = buildCreateTrainerWorkoutInput(editor, studentId);
  if (!result.ok) {
    setError(result.message);
    return;
  }

  setSubmitting(true);
  setError(undefined);

  try {
    const created = await createTrainerWorkoutPlan(api, result.body);

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['trainer', 'workouts', studentId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['trainer', 'summary'],
      }),
    ]);

    queryClient.setQueryData(
      ['trainer', 'workout', created.id],
      created,
    );

    setCreatedPlan(created);
    setSuccessMessage('Treino salvo com sucesso.');
  } catch {
    setError('Não foi possível salvar o treino.');
  } finally {
    setSubmitting(false);
  }
}
```

- [ ] **Step 15: Criar o entrypoint de novo treino**

```tsx
import { TrainerWorkoutEditorScreen } from '../../../../../../src/screens/trainer-workout-editor';

export default function TrainerNewWorkoutRoute() {
  return <TrainerWorkoutEditorScreen mode="create" />;
}
```

- [ ] **Step 16: Rodar testes da criação**

```powershell
pnpm.cmd --dir apps/mobile test src/application/workouts/workout-editor.test.ts src/components/workouts/exercise-catalog-modal.test.tsx src/components/workouts/workout-editor-day.test.tsx src/screens/trainer-workout-editor.test.tsx
```

Expected: PASS para os casos `mode="create"`.

- [ ] **Step 17: Commitar a unidade**

```powershell
git add apps/mobile/test/react-native.mock.ts apps/mobile/src/screens/trainer-workout-editor.tsx apps/mobile/src/screens/trainer-workout-editor.test.tsx apps/mobile/app/'(trainer)'/trainer/students/'[studentId]'/workouts/new.tsx
git commit -m "feat(mobile): adiciona criação de treino do trainer"
```

---

### Task 9: Ampliar o editor para edição de plano existente

**Files:**

* Modify: `apps/mobile/src/screens/trainer-workout-editor.tsx`
* Modify: `apps/mobile/src/screens/trainer-workout-editor.test.tsx`
* Modify: `apps/mobile/src/screens/trainer-workout-detail.tsx`
* Modify: `apps/mobile/src/screens/trainer-workout-detail.test.tsx`
* Create: `apps/mobile/app/(trainer)/trainer/students/[studentId]/workouts/[planId]/edit.tsx`

**Interfaces:**

- Extends: `TrainerWorkoutEditorScreen` para `mode: 'create' | 'edit'`.
- Consumes: `getTrainerWorkoutPlan`, `updateTrainerWorkoutPlan`, `hydrateWorkoutEditorState`, `buildUpdateTrainerWorkoutInput`.
- Produces: edição de `active|draft`, bloqueio de `archived` e ação **Editar treino** no detalhe.
- [ ] **Step 1: Escrever testes de params/loading/404/mismatch em edição**

Adicionar ao arquivo existente:

- `mode="edit"` sem `studentId` ou `planId` → **Treino inválido**, zero PATCH;
- loading;
- `404` → **Treino não encontrado**;
- erro genérico + retry;
- `plan.studentId !== route studentId` → **Treino indisponível**, sem formulário.
- [ ] **Step 2: Escrever teste de plano arquivado**

```tsx
apiState.request.mockResolvedValueOnce(
  workoutPlanFixture({ status: 'archived' }),
);

renderEditor('edit');

expect(await screen.findByText('Treino arquivado')).toBeTruthy();
expect(
  screen.getByText('Planos arquivados são somente leitura no mobile.'),
).toBeTruthy();
expect(screen.queryByRole('button', { name: 'Salvar alterações' })).toBeNull();
```

- [ ] **Step 3: Escrever teste de hidratação**

Plano com:

* nome;
* notes;
* status active;
* dois dias;
* carga/rest;
* `tempo='3010'`.

Verificar fields da UI e mudança de dia ativo sem perder dados.

Não deve existir input `Tempo`.

- [ ] **Step 4: Escrever teste do PATCH**

Editar nome, limpar notas, mudar exercício e salvar.

Esperar:

* método PATCH;
* body completo;
* `notes: ''`;
* `tempo: '3010'` preservado no exercício carregado;
* ausência de `studentId`, `startDate`, `endDate`, `trainerId`.

Cache:

```ts
expect(queryState.setQueryData).toHaveBeenCalledWith(
  ['trainer', 'workout', PLAN_ID],
  updatedPlan,
);
expect(queryState.invalidateQueries).toHaveBeenCalledWith({
  queryKey: ['trainer', 'workouts', STUDENT_ID],
});
expect(queryState.invalidateQueries).toHaveBeenCalledWith({
  queryKey: ['trainer', 'summary'],
});
```

Feedback **Treino atualizado com sucesso.**

- [ ] **Step 5: Escrever teste de erro e hidratação única**

Simular:

1. query resolve plano;
2. usuário altera nome localmente;
3. PATCH falha.

Esperar que o campo continue com o nome alterado.

Também garantir que um refetch do mesmo `planId` não reseta silenciosamente o formulário já hidratado durante a edição.

- [ ] **Step 6: Rodar os testes para confirmar falha**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-workout-editor.test.tsx src/screens/trainer-workout-detail.test.tsx
```

Expected: FAIL nos novos cenários.

- [ ] **Step 7: Ampliar props e query**

```ts
export type TrainerWorkoutEditorScreenProps = {
  mode: 'create' | 'edit';
};
```

Params:

```ts
const params = useLocalSearchParams<{
  studentId?: string | string[];
  planId?: string | string[];
}>();
```

Query chamada em todos os renders, mas habilitada só na edição:

```ts
const planQuery = useQuery({
  enabled: mode === 'edit' && Boolean(planId),
  queryKey: ['trainer', 'workout', planId],
  queryFn: ({ signal }) => {
    if (!planId) throw new Error('Treino inválido.');
    return getTrainerWorkoutPlan(api, planId, signal);
  },
});
```

- [ ] **Step 8: Hidratar apenas uma vez por** `planId`

```ts
const hydratedPlanId = useRef<string>();

useEffect(() => {
  if (
    mode !== 'edit' ||
    !planQuery.data ||
    planQuery.data.status === 'archived' ||
    planQuery.data.studentId !== studentId ||
    hydratedPlanId.current === planQuery.data.id
  ) {
    return;
  }

  const next = hydrateWorkoutEditorState(
    planQuery.data,
    createLocalId,
  );
  setEditor(next);
  setActiveDayId(next.days[0]?.localId);
  hydratedPlanId.current = planQuery.data.id;
}, [
  createLocalId,
  mode,
  planQuery.data,
  studentId,
]);
```

Não usar `planQuery.data` como source-of-truth depois da hidratação; o formulário local passa a ser a fonte editável.

- [ ] **Step 9: Implementar estados seguros de edição**

Antes do formulário:

* params inválidos;
* loading;
* `404`;
* erro sem dados;
* mismatch;
* archived.

Retorno da edição:

- se houver `studentId` e `planId`, `router.dismissTo(/trainer/students/.../workouts/... )`;
- senão, lista de treinos/alunos.
- [ ] **Step 10: Implementar submit de edição**

```ts
async function submitEdit(): Promise<void> {
  if (!studentId || !planId || submitting) return;

  const result = buildUpdateTrainerWorkoutInput(editor);
  if (!result.ok) {
```setError(result.message);
    return;
  }

  setSubmitting(true);
  setError(undefined);

  try {
    const updated = await updateTrainerWorkoutPlan(
      api,
      planId,
      result.body,
    );

    queryClient.setQueryData(
      ['trainer', 'workout', planId],
      updated,
    );

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['trainer', 'workouts', studentId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['trainer', 'summary'],
      }),
    ]);

    setSuccessMessage('Treino atualizado com sucesso.');
  } catch {
    setError('Não foi possível atualizar o treino.');
  } finally {
    setSubmitting(false);
  }
}
```

Botão:

* create → **Salvar treino** / **Salvando...**;
* edit → **Salvar alterações** / **Salvando alterações...**.

Após sucesso de edit, exibir **Voltar para treino**.

- [ ] **Step 11: Criar o entrypoint de edição**

```tsx
import { TrainerWorkoutEditorScreen } from '../../../../../../../src/screens/trainer-workout-editor';

export default function TrainerEditWorkoutRoute() {
  return <TrainerWorkoutEditorScreen mode="edit" />;
}
```

- [ ] **Step 12: Adicionar ação de edição ao detalhe**

Somente após dados válidos:

```tsx
{plan.status !== 'archived' ? (
  <AppButton
    label="Editar treino"
    onPress={() =>
      router.push({
        pathname:
          '/trainer/students/[studentId]/workouts/[planId]/edit',
        params: { studentId, planId },
      })
    }
  />
) : null}
```

Atualizar testes:

- active → editar;
- draft → editar;
- archived → sem editar.
- [ ] **Step 13: Rodar testes**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-workout-editor.test.tsx src/screens/trainer-workout-detail.test.tsx
```

Expected: PASS.

- [ ] **Step 14: Commitar a unidade**

```powershell
git add apps/mobile/src/screens/trainer-workout-editor.tsx apps/mobile/src/screens/trainer-workout-editor.test.tsx apps/mobile/src/screens/trainer-workout-detail.tsx apps/mobile/src/screens/trainer-workout-detail.test.tsx apps/mobile/app/'(trainer)'/trainer/students/'[studentId]'/workouts/'[planId]'/edit.tsx
git commit -m "feat(mobile): adiciona edição de treino do trainer"
```

---

### Task 10: Integrar Treinos no detalhe do aluno e atualizar regras locais

**Files:**

* Modify: `apps/mobile/src/screens/trainer-student-detail.tsx`
* Modify: `apps/mobile/src/screens/trainer-student-detail.test.tsx`
* Modify: `apps/mobile/AGENTS.md`

**Interfaces:**

- Consumes: rotas criadas nas Tasks 4 e 8.
- Produces: entrada contextual **Treinos** sem query adicional; documentação local coerente com os dois shells implementados.
- [ ] **Step 1: Atualizar o teste do detalhe do aluno**

Substituir a expectativa antiga de ausência de Treinos por:

```tsx
expect(screen.getByText('Treinos')).toBeTruthy();
expect(screen.getByRole('button', { name: 'Ver treinos' })).toBeTruthy();
expect(screen.getByRole('button', { name: 'Novo treino' })).toBeTruthy();

expect(apiState.request).toHaveBeenCalledTimes(1);
expect(apiState.request).toHaveBeenCalledWith(
  '/students/student-1',
  expect.any(Object),
);
```

Navegação:

```ts
await user.press(screen.getByRole('button', { name: 'Ver treinos' }));

expect(routerState.push).toHaveBeenCalledWith({
  pathname: '/trainer/students/[studentId]/workouts',
  params: { studentId: 'student-1' },
});

await user.press(screen.getByRole('button', { name: 'Novo treino' }));

expect(routerState.push).toHaveBeenCalledWith({
  pathname: '/trainer/students/[studentId]/workouts/new',
  params: { studentId: 'student-1' },
});
```

Preservar as assertions de **Avaliações**, **Ver histórico** e **Nova avaliação**.

- [ ] **Step 2: Rodar para confirmar falha**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-student-detail.test.tsx
```

Expected: FAIL porque a seção ainda não existe.

- [ ] **Step 3: Adicionar a seção Treinos**

Após a seção Avaliações:

```tsx
<Card>
  <Text style={styles.sectionTitle}>Treinos</Text>
  <Text style={sharedStyles.subtitle}>
    Consulte ou monte a prescrição de treino deste aluno.
  </Text>
  <AppButton
    label="Ver treinos"
    onPress={() =>
      router.push({
        pathname: '/trainer/students/[studentId]/workouts',
        params: { studentId },
      })
    }
    variant="secondary"
  />
  <AppButton
    label="Novo treino"
    onPress={() =>
      router.push({
        pathname: '/trainer/students/[studentId]/workouts/new',
        params: { studentId },
      })
    }
  />
</Card>
```

Não adicionar `useQuery` de workout.

- [ ] **Step 4: Atualizar** `apps/mobile/AGENTS.md`

Substituir a regra defasada:

```text
- O fluxo mobile autenticável implementado atualmente é exclusivo de `student`; ...
```

por regras verificáveis:

```text
- O app possui shells autenticados separados para `student` e `trainer`; preserve guards, rotas e caches por role e não reutilize rotas self-scoped do aluno em fluxos do treinador.
- Chamadas do domínio do treinador devem deixar ownership para a `RequestIdentity` da API; não envie `trainerId` pelo cliente e prefixe caches específicos com `trainer`.
```

Preservar o arquivo abaixo de 200 linhas.

- [ ] **Step 5: Rodar o teste do detalhe**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-student-detail.test.tsx
```

Expected: PASS e apenas um request ao abrir o detalhe.

- [ ] **Step 6: Commitar a unidade**

```powershell
git add apps/mobile/src/screens/trainer-student-detail.tsx apps/mobile/src/screens/trainer-student-detail.test.tsx apps/mobile/AGENTS.md
git commit -m "feat(mobile): integra treinos ao aluno do trainer"
```

---

### Task 11: Consolidar cobertura e regressão automatizada da <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue>

**Files:**

* Modify: `apps/mobile/vitest.ui-coverage.config.ts`
* Verify: todos os arquivos das Tasks 1–10.
* Verify: fluxos anteriores do treinador e do aluno.

**Interfaces:**

- Não produz nova interface de domínio.
- Garante que as novas screens entram no piso visual bloqueante e que o escopo não vazou para backend/CRUD de exercícios.
- [ ] **Step 1: Adicionar as screens ao include de cobertura visual**

Preservar todos os includes existentes e adicionar:

```ts
'src/screens/trainer-workouts.tsx',
'src/screens/trainer-workout-detail.tsx',
'src/screens/trainer-workout-editor.tsx',
```

Manter:

```ts
thresholds: {
  statements: 85,
  branches: 85,
  functions: 85,
  lines: 85,
},
```

- [ ] **Step 2: Rodar testes específicos da** <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue>

```powershell
pnpm.cmd --dir apps/mobile test src/application/workouts/trainer-workout-data.test.ts src/application/workouts/workout-editor.test.ts src/application/exercises/exercise-catalog.test.ts src/lib/muscle-groups.test.ts src/components/workouts/workout-plan-list-item.test.tsx src/components/workouts/exercise-catalog-modal.test.tsx src/components/workouts/workout-editor-day.test.tsx src/screens/trainer-workouts.test.tsx src/screens/trainer-workout-detail.test.tsx src/screens/trainer-workout-editor.test.tsx src/screens/trainer-student-detail.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Rodar regressão das avaliações do treinador**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-assessments.test.tsx src/screens/trainer-assessment-detail.test.tsx src/screens/trainer-new-assessment.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Rodar regressão de home, alunos, tabs e guards**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-home.test.tsx src/screens/trainer-students.test.tsx src/screens/trainer-student-detail.test.tsx src/__tests__/trainer-tabs-layout.test.tsx src/__tests__/role-layouts.test.tsx src/__tests__/root-layout.test.tsx src/__tests__/tabs-layout.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Rodar regressão do fluxo de treino do aluno**

```powershell
pnpm.cmd --dir apps/mobile test src/application/workouts/today-workout.test.ts src/application/workouts/workout-log.test.ts src/screens/today-workout.test.tsx src/screens/log-workout.test.tsx
```

Expected: PASS sem mudança nas rotas `/students/me/*`, cache offline ou journal.

- [ ] **Step 6: Rodar a suíte mobile completa**

```powershell
pnpm.cmd --dir apps/mobile test
```

Expected: PASS.

- [ ] **Step 7: Rodar cobertura core**

```powershell
pnpm.cmd --dir apps/mobile test:coverage:core
```

Expected: PASS com statements, branches, functions e lines >= 85%.

- [ ] **Step 8: Rodar cobertura visual crítica**

```powershell
pnpm.cmd --dir apps/mobile test:coverage:ui
```

Expected: PASS com as três novas screens incluídas.

- [ ] **Step 9: Rodar typecheck, Biome e Expo Doctor**

```powershell
pnpm.cmd --dir apps/mobile typecheck
pnpm.cmd exec biome check apps/mobile
pnpm.cmd --dir apps/mobile doctor
```

Expected: todos exit 0.

- [ ] **Step 10: Verificar whitespace e UTF-8**

```powershell
git diff --check
git diff --name-only --diff-filter=ACMR |
  ForEach-Object {
    if (Test-Path $_) {
      Select-String -Path $_ -Pattern '\\u[0-9A-Fa-f]{4}' -SimpleMatch:$false
    }
  }
```

Expected:

- `git diff --check` sem saída;
- nenhuma sequência `\uXXXX` usada para representar texto pt-BR.
- [ ] **Step 11: Verificar que o diff permanece mobile-only**

```powershell
git diff --name-only
```

Não podem aparecer:

```text
apps/api/
packages/db/
packages/validators/
PRODUCT.md
DESIGN.md
```

- [ ] **Step 12: Verificar ausência de ownership e CRUD de exercícios no cliente**

```powershell
git diff -- apps/mobile/src/application/workouts/trainer-workout-data.ts apps/mobile/src/application/exercises/exercise-catalog.ts |
  Select-String -Pattern 'trainerId|POST /exercises|PATCH /exercises|DELETE /exercises'
```

Expected: nenhuma ocorrência.

Verificar também via testes que:

- POST `/workout-plans` não contém `trainerId`;
- PATCH `/workout-plans/:id` não contém `studentId` nem `trainerId`;
- catálogo sempre contém `scope=all`.
- [ ] **Step 13: Revisar** `AGENTS.md`

Confirmar:

- arquivo <= 200 linhas;
- não há mais texto dizendo que apenas `student` é autenticável;
- regras novas descrevem isolamento `student`/`trainer` e ownership pela API.
- [ ] **Step 14: Commitar configuração de coverage**

```powershell
git add apps/mobile/vitest.ui-coverage.config.ts
git commit -m "test(mobile): cobre treinos do trainer"
```

---

### Task 12: Validar manualmente o fluxo e preparar handoff

**Files:**

* Verify only.
* Compare implementation against `docs/superpowers/specs/2026-09-06-muv-19-trainer-workouts-design.md`.

**Interfaces:**

- A entrega final deve satisfazer consulta, criação, edição e catálogo sem regressão do aluno e sem mudança de backend.
- [ ] **Step 1: Validar entrada pelo detalhe do aluno**

Com Maestro/emulador:

1. autenticar como treinador;
2. abrir **Alunos**;
3. abrir aluno vinculado;
4. confirmar que **Avaliações** continua disponível;
5. confirmar seção **Treinos**;
6. abrir **Ver treinos**;
7. voltar;
8. abrir **Novo treino**.

Expected: abrir o detalhe do aluno não dispara query de workout apenas para preview.

- [ ] **Step 2: Validar lista de treinos**

1. abrir lista;
2. conferir loading;
3. conferir plano ativo;
4. conferir rascunho;
5. conferir arquivado;
6. conferir período quando existir;
7. atualizar;
8. confirmar retorno **Voltar para aluno**.

Se o seed não tiver os três statuses, registrar quais foram observados e manter os restantes cobertos por teste automatizado.

- [ ] **Step 3: Validar detalhe**

 1. abrir plano ativo;
 2. conferir nome/status;
 3. conferir notas/período quando houver;
 4. conferir dias em ordem;
 5. conferir exercícios em ordem;
 6. conferir séries/reps;
 7. conferir carga/descanso quando houver;
 8. confirmar ausência de `tempo` visual;
 9. confirmar **Editar treino**;
10. abrir plano arquivado;
11. confirmar ausência de **Editar treino**.

- [ ] **Step 4: Validar criação mínima funcional**

1. abrir **Novo treino**;
2. informar nome;
3. manter status rascunho;
4. abrir catálogo;
5. selecionar um exercício;
6. salvar;
7. confirmar **Treino salvo com sucesso.**;
8. abrir **Ver treino**;
9. confirmar presença na lista depois.

- [ ] **Step 5: Validar catálogo**

1. abrir catálogo;
2. buscar exercício global pelo nome;
3. limpar busca;
4. buscar exercício próprio do treinador;
5. filtrar por grupo muscular;
6. verificar grupo em pt-BR;
7. carregar página adicional se houver > 50;
8. confirmar ausência de criar/editar/excluir exercício.

Se não houver > 50 exercícios, registrar paginação como coberta apenas por teste automatizado.

- [ ] **Step 6: Validar editor completo**

 1. criar segundo dia;
 2. selecionar o segundo dia;
 3. adicionar exercícios;
 4. editar séries;
 5. editar reps;
 6. usar carga decimal com vírgula;
 7. editar descanso;
 8. editar observação;
 9. reordenar exercícios;
10. remover exercício;
11. voltar ao primeiro dia e confirmar que estado foi preservado;
12. tentar remover dia com exercício;
13. cancelar confirmação;
14. repetir e confirmar remoção.

- [ ] **Step 7: Validar erros locais**

1. deixar um dia sem exercício;
2. tentar salvar;
3. confirmar erro sem request;
4. usar séries `2,5` ou `abc`;
5. confirmar erro;
6. usar carga `abc`;
7. confirmar erro;
8. corrigir valores e salvar.

Expected: conteúdo válido já digitado permanece.

- [ ] **Step 8: Validar edição**

1. abrir plano ativo ou rascunho;
2. tocar **Editar treino**;
3. alterar nome;
4. limpar notas do plano;
5. alterar parâmetro de exercício;
6. salvar;
7. confirmar **Treino atualizado com sucesso.**;
8. voltar ao detalhe;
9. confirmar os dados atualizados.

Se houver plano seed com `tempo`, confirmar por teste automatizado que o payload preserva o campo; ele não precisa aparecer na UI.

- [ ] **Step 9: Validar deep links e indisponibilidade**

1. abrir UUID de plano inexistente;
2. confirmar **Treino não encontrado**;
3. se possível, montar URL com `studentId` de um aluno e `planId` de outro aluno acessível;
4. confirmar **Treino indisponível** e ausência dos dados do plano no contexto errado.

Cross-tenant real pode ficar coberto por teste automatizado se não for seguro reproduzir manualmente.

- [ ] **Step 10: Validar regressão do aluno**

1. encerrar sessão do treinador;
2. autenticar como aluno;
3. abrir treino atual;
4. abrir sessão guiada;
5. confirmar que o fluxo continua usando `/students/me/workout-plans`;
6. confirmar que `/trainer` continua bloqueado para aluno.

- [ ] **Step 11: Registrar limitações de validação manual**

Registrar como **coberto por teste automatizado e não reproduzido manualmente** qualquer cenário não exercitado:

* falha de rede;
* 404 após refetch;
*
  > 50 exercícios;
* todos os statuses;
* cross-tenant;
* preservação de `tempo`.

Não afirmar validação manual que não ocorreu.

- [ ] **Step 12: Revisar critérios finais de conclusão**

A <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> só está pronta quando:

```text
- implementação parte de develop;
- detalhe do aluno possui Ver treinos e Novo treino sem query extra;
- lista usa /students/:studentId/workout-plans;
- detalhe usa /workout-plans/:id;
- 404 não revela escopo;
- mismatch plan.studentId != route studentId não é renderizado;
- active e draft podem ser editados;
- archived é somente leitura;
- editor suporta 1–7 dias;
- cada dia exige ao menos 1 exercício no salvamento;
- editor suporta séries, reps, carga, descanso e observação;
- startDate/endDate não são apagados em edição;
- tempo existente é preservado em edição e não aparece como campo;
- limpar notas do plano em edição envia notes vazio;
- catálogo usa scope=all, busca, grupo e paginação de 50;
- catálogo não possui CRUD de exercício;
- cliente não envia trainerId;
- nenhuma regra nova de exclusividade de plano ativo existe;
- nenhum storage/journal offline foi criado para o trainer;
- criação invalida lista + summary e popula detalhe retornado;
- edição atualiza cache do detalhe e invalida lista + summary;
- fluxo do aluno continua inalterado;
- apps/api, packages/db e packages/validators não mudaram;
- tests, coverage core/UI, typecheck, Biome, Expo Doctor e diff check passam;
- validação manual foi executada ou suas limitações foram registradas.
```

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-06-muv-19-trainer-workouts.md`.

Duas opções de execução:

1. **Subagent-Driven (recomendado)** — usar `superpowers:subagent-driven-development`, um worker novo por task e revisão entre tasks.
2. **Inline Execution** — usar `superpowers:executing-plans`, executando em lotes com checkpoints.
