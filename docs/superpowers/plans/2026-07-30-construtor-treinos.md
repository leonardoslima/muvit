# Construtor de treinos alinhado ao Pencil - Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar `/workouts` no construtor full-height dos nodes `WGclk` e `XOIIZ`, com seleção de aluno, edição completa do rascunho e drawer de exercícios sobreposto.

**Architecture:** `WorkoutsPage` permanece como Server Component e carrega alunos e exercícios em paralelo. Um Client Component route-local mantém o rascunho, delega transformações ao modelo puro em `src/application/workouts` e compõe painéis de apresentação sem acesso direto à API; a Server Action recebe o payload pronto e cria o plano.

**Tech Stack:** Next.js 16, React 19, TypeScript estrito, Tailwind CSS 4, Radix UI pelo pacote `radix-ui`, lucide-react, SDK gerado, Vitest e Testing Library.

## Global Constraints

- `/workouts` passa a ser a rota canônica do construtor.
- `/workouts/new?studentId=<id>` redireciona para `/workouts?studentId=<id>`.
- O drawer `GxGsg` possui 320 px, fica ancorado à direita e é renderizado por cima do conteúdo central.
- O drawer não participa do grid, não reduz a tabela e não desloca nenhum painel.
- A interface visível permanece em pt-BR com caracteres UTF-8 literais.
- Não alterar API, validators, schema ou migrations.
- Não adicionar biblioteca de drag-and-drop, calendário ou gerenciamento de estado.
- Não editar treinos persistidos nem redesenhar `/workouts/[id]`.
- Não modificar `assets/design/pencil_design.pen`.
- Usar somente os primitives, tokens e dependências existentes.
- Executar comandos a partir da raiz do repositório.

---

### Task 1: Completar o modelo puro do rascunho

**Files:**
- Modify: `apps/web/src/application/workouts/workout-editor-model.ts`
- Modify: `apps/web/src/application/workouts/workout-editor-model.test.ts`

**Interfaces:**
- Produces: `WorkoutStudentOption`, `ExerciseLite`, `WorkoutExerciseState`, `WorkoutDayState`, `WorkoutDraftState` e `CreateWorkoutInput`.
- Produces: `createWorkoutDraft(studentId: string, createId: () => string): WorkoutDraftState`.
- Produces: `resetWorkoutDraft(draft: WorkoutDraftState, createId: () => string): WorkoutDraftState`.
- Produces: `reorderWorkoutExercise(days: WorkoutDayState[], dayIndex: number, fromIndex: number, toIndex: number): WorkoutDayState[]`.
- Produces: `validateWorkoutDraft(draft: WorkoutDraftState): string | null`.
- Produces: `buildCreateWorkoutInput(draft: WorkoutDraftState): CreateWorkoutInput`.
- Consumes: `MuscleGroup` de `@/lib/muscle-groups`.

- [ ] **Step 1: Expandir os testes com o contrato do rascunho**

Adicionar casos que fixem defaults, reset, datas, reordenação e payload:

```ts
it('cria o rascunho inicial para o aluno selecionado', () => {
  expect(createWorkoutDraft('student-1', () => 'day-1')).toEqual({
    studentId: 'student-1',
    name: '',
    startDate: '',
    endDate: '',
    status: 'draft',
    notes: '',
    days: [{ id: 'day-1', label: 'Treino A', exercises: [] }],
  });
});

it('restaura o rascunho preservando o aluno selecionado', () => {
  const draft = {
    ...createWorkoutDraft('student-1', () => 'day-old'),
    name: 'Hipertrofia',
    studentId: 'student-2',
    notes: 'Progressão semanal',
  };

  expect(resetWorkoutDraft(draft, () => 'day-new')).toEqual(
    createWorkoutDraft('student-2', () => 'day-new'),
  );
});

it('rejeita período com data final anterior à inicial', () => {
  const draft = {
    ...createWorkoutDraft('student-1', () => 'day-1'),
    name: 'Hipertrofia',
    startDate: '2026-07-30',
    endDate: '2026-07-29',
  };

  expect(validateWorkoutDraft(draft)).toBe(
    'A data final não pode ser anterior à data inicial.',
  );
});

it('monta o payload com período, status, tempo e notas do exercício', () => {
  const draft = {
    ...createWorkoutDraft('student-1', () => 'day-1'),
    name: ' Hipertrofia ',
    startDate: '2026-08-01',
    endDate: '2026-10-31',
    status: 'active' as const,
    notes: ' Progressão semanal ',
    days: [
      {
        id: 'day-1',
        label: 'Treino A',
        exercises: [
          {
            exerciseId: 'exercise-1',
            exerciseName: 'Supino reto',
            muscleGroup: 'chest' as const,
            equipment: 'Barra',
            sets: 4,
            reps: '8-12',
            loadKg: 40,
            restSeconds: 90,
            tempo: '3-1-2',
            notes: 'Controlar a descida',
          },
        ],
      },
    ],
  };

  expect(buildCreateWorkoutInput(draft)).toEqual({
    studentId: 'student-1',
    name: 'Hipertrofia',
    startDate: '2026-08-01',
    endDate: '2026-10-31',
    status: 'active',
    notes: 'Progressão semanal',
    days: [
      {
        label: 'Treino A',
        dayOrder: 0,
        exercises: [
          {
            exerciseId: 'exercise-1',
            exerciseOrder: 0,
            sets: 4,
            reps: '8-12',
            loadKg: 40,
            restSeconds: 90,
            tempo: '3-1-2',
            notes: 'Controlar a descida',
          },
        ],
      },
    ],
  });
});
```

- [ ] **Step 2: Executar o teste focado e confirmar RED**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/application/workouts/workout-editor-model.test.ts"
```

Expected: FAIL porque `WorkoutDraftState`, `createWorkoutDraft`, `resetWorkoutDraft` e `reorderWorkoutExercise` ainda não existem e as assinaturas de validação/payload ainda são antigas.

- [ ] **Step 3: Declarar os tipos completos do editor**

Atualizar o topo do modelo:

```ts
export type WorkoutStudentOption = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
};

export type ExerciseLite = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
};

export type WorkoutExerciseState = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  sets: number;
  reps: string;
  restSeconds?: number;
  loadKg?: number;
  tempo?: string;
  notes?: string;
};

export type WorkoutDraftState = {
  studentId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: WorkoutStatus;
  notes: string;
  days: WorkoutDayState[];
};
```

Incluir `startDate?: string` e `endDate?: string` em `CreateWorkoutInput`.

- [ ] **Step 4: Implementar criação, reset e reordenação imutáveis**

```ts
export function createWorkoutDraft(
  studentId: string,
  createId: () => string,
): WorkoutDraftState {
  return {
    studentId,
    name: '',
    startDate: '',
    endDate: '',
    status: 'draft',
    notes: '',
    days: [createWorkoutDay('Treino A', createId)],
  };
}

export function resetWorkoutDraft(
  draft: WorkoutDraftState,
  createId: () => string,
): WorkoutDraftState {
  return createWorkoutDraft(draft.studentId, createId);
}

export function reorderWorkoutExercise(
  days: WorkoutDayState[],
  dayIndex: number,
  fromIndex: number,
  toIndex: number,
): WorkoutDayState[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return days;

  return days.map((day, currentDayIndex) => {
    if (currentDayIndex !== dayIndex || toIndex >= day.exercises.length) return day;
    const exercises = [...day.exercises];
    const [exercise] = exercises.splice(fromIndex, 1);
    if (!exercise) return day;
    exercises.splice(toIndex, 0, exercise);
    return { ...day, exercises };
  });
}
```

Ao adicionar exercício, copiar `equipment` para o estado.

- [ ] **Step 5: Atualizar validação e montagem do payload**

```ts
export function validateWorkoutDraft(draft: WorkoutDraftState): string | null {
  if (!draft.studentId) return 'Selecione um aluno.';
  if (!draft.name.trim()) return 'Informe um nome para o treino.';
  if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
    return 'A data final não pode ser anterior à data inicial.';
  }
  if (draft.days.some((day) => !day.label.trim())) {
    return 'Informe um nome para cada dia.';
  }
  if (draft.days.some((day) => day.exercises.length === 0)) {
    return 'Cada dia precisa ter ao menos 1 exercício.';
  }
  return null;
}

function optionalTrimmed(value: string): string | undefined {
  return value.trim() || undefined;
}

export function buildCreateWorkoutInput(draft: WorkoutDraftState): CreateWorkoutInput {
  return {
    studentId: draft.studentId,
    name: draft.name.trim(),
    startDate: draft.startDate || undefined,
    endDate: draft.endDate || undefined,
    status: draft.status,
    notes: optionalTrimmed(draft.notes),
    days: draft.days.map((day, dayOrder) => ({
      label: day.label.trim(),
      dayOrder,
      exercises: day.exercises.map((exercise, exerciseOrder) => ({
        exerciseId: exercise.exerciseId,
        exerciseOrder,
        sets: exercise.sets,
        reps: exercise.reps.trim(),
        restSeconds: exercise.restSeconds,
        loadKg: exercise.loadKg,
        tempo: optionalTrimmed(exercise.tempo ?? ''),
        notes: optionalTrimmed(exercise.notes ?? ''),
      })),
    })),
  };
}
```

- [ ] **Step 6: Executar o teste focado e confirmar GREEN**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/application/workouts/workout-editor-model.test.ts"
```

Expected: todos os testes do modelo PASS.

- [ ] **Step 7: Verificar e commit**

Run:

```powershell
pnpm.cmd --dir apps/web typecheck
pnpm.cmd exec biome check "apps/web/src/application/workouts/workout-editor-model.ts" "apps/web/src/application/workouts/workout-editor-model.test.ts"
git diff --check
git add -- "apps/web/src/application/workouts/workout-editor-model.ts" "apps/web/src/application/workouts/workout-editor-model.test.ts"
git commit -m "refactor(web): completa modelo do editor de treino"
```

Expected: comandos de verificação com código 0; commit contém somente o modelo e seus testes.

---

### Task 2: Tornar `/workouts` a entrada full-height do construtor

**Files:**
- Modify: `apps/web/src/app/(app)/layout.tsx`
- Modify: `apps/web/src/app/(app)/layout.test.tsx`
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/(app)/workouts/page.tsx`
- Create: `apps/web/src/app/(app)/workouts/page.test.tsx`
- Create: `apps/web/src/app/(app)/workouts/_workout-builder.tsx`

**Interfaces:**
- Consumes: `WorkoutStudentOption` e `ExerciseLite` da Task 1.
- Produces: `WorkoutBuilder({ students, exercises, initialStudentId, studentsLoadFailed, exercisesLoadFailed })`.
- Produces: elemento direto `data-full-bleed` dentro de `data-app-content`.
- `WorkoutsPage` aceita `searchParams: Promise<{ studentId?: string }>` e não acessa estado de navegador.

- [ ] **Step 1: Escrever os testes RED da página e do layout**

No novo `workouts/page.test.tsx`, mockar SDK, cliente e builder:

```tsx
vi.mock('./_workout-builder', () => ({
  WorkoutBuilder: (props: { initialStudentId: string }) => (
    <div data-testid="workout-builder">{props.initialStudentId}</div>
  ),
}));

it('carrega alunos e exercícios em paralelo e respeita studentId válido', async () => {
  vi.mocked(getStudents).mockResolvedValue({
    data: { items: students, total: students.length },
  });
  vi.mocked(getExercises).mockResolvedValue({
    data: { items: exercises, total: exercises.length },
  });

  render(
    await WorkoutsPage({
      searchParams: Promise.resolve({ studentId: 'student-2' }),
    }),
  );

  expect(getStudents).toHaveBeenCalledWith({
    client: expect.anything(),
    query: { limit: 100, status: 'active' },
  });
  expect(getExercises).toHaveBeenCalledWith({
    client: expect.anything(),
    query: { limit: 100, scope: 'all' },
  });
  expect(screen.getByTestId('workout-builder')).toHaveTextContent('student-2');
});

it('seleciona o primeiro aluno quando a query é ausente ou inválida', async () => {
  render(
    await WorkoutsPage({
      searchParams: Promise.resolve({ studentId: 'student-inexistente' }),
    }),
  );

  expect(screen.getByTestId('workout-builder')).toHaveTextContent('student-1');
});
```

No teste do layout:

```tsx
it('expõe o container que permite páginas full-bleed', async () => {
  const { container } = render(
    await AppLayout({ children: <div data-full-bleed>Conteúdo</div> }),
  );

  expect(container.querySelector('[data-app-content]')).toContainElement(
    screen.getByText('Conteúdo'),
  );
});
```

- [ ] **Step 2: Executar os testes e confirmar RED**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/app/(app)/layout.test.tsx" "src/app/(app)/workouts/page.test.tsx"
```

Expected: FAIL porque a página ainda não recebe `searchParams`, não carrega exercícios, não renderiza `WorkoutBuilder` e o layout não possui `data-app-content`.

- [ ] **Step 3: Habilitar full-bleed no shell autenticado**

Alterar apenas o wrapper interno:

```tsx
<main className="flex-1 overflow-y-auto bg-background">
  <div
    data-app-content
    className="flex min-h-full flex-col gap-7 px-10 py-8"
  >
    {children}
  </div>
</main>
```

Adicionar em `globals.css`:

```css
  [data-app-content]:has(> [data-full-bleed]) {
    gap: 0;
    padding: 0;
    height: 100%;
    min-height: 0;
  }
```

Não alterar o espaçamento das páginas sem `data-full-bleed`.

- [ ] **Step 4: Implementar a Server Component de `/workouts`**

```tsx
export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  const client = await configureServerClient();
  const [studentsResult, exercisesResult] = await Promise.all([
    getStudents({ client, query: { limit: 100, status: 'active' } }),
    getExercises({ client, query: { limit: 100, scope: 'all' } }),
  ]);

  const students = (studentsResult.data?.items ?? []).map((student) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    avatarUrl: student.avatarUrl,
  }));
  const exercises = (exercisesResult.data?.items ?? []).map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment,
  }));
  const initialStudentId =
    students.find((student) => student.id === studentId)?.id ?? students[0]?.id ?? '';

  return (
    <WorkoutBuilder
      students={students}
      exercises={exercises}
      initialStudentId={initialStudentId}
      studentsLoadFailed={Boolean(studentsResult.error)}
      exercisesLoadFailed={Boolean(exercisesResult.error)}
    />
  );
}
```

- [ ] **Step 5: Criar o shell mínimo do builder**

Criar o componente com a interface definitiva e um root full-bleed:

```tsx
'use client';

export type WorkoutBuilderProps = {
  students: WorkoutStudentOption[];
  exercises: ExerciseLite[];
  initialStudentId: string;
  studentsLoadFailed: boolean;
  exercisesLoadFailed: boolean;
};

export function WorkoutBuilder({
  students,
  exercises,
  initialStudentId,
  studentsLoadFailed,
  exercisesLoadFailed,
}: WorkoutBuilderProps) {
  return (
    <div
      data-full-bleed
      data-students-load-failed={studentsLoadFailed || undefined}
      data-exercises-load-failed={exercisesLoadFailed || undefined}
      className="relative flex h-full min-h-0 overflow-hidden bg-background"
    >
      <span className="sr-only">
        {students.length} alunos e {exercises.length} exercícios carregados para {initialStudentId}
      </span>
    </div>
  );
}
```

Esse shell será preenchido nas Tasks 3–5.

- [ ] **Step 6: Executar os testes e confirmar GREEN**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/app/(app)/layout.test.tsx" "src/app/(app)/workouts/page.test.tsx"
```

Expected: testes do layout e da página PASS.

- [ ] **Step 7: Verificar e commit**

Run:

```powershell
pnpm.cmd --dir apps/web typecheck
pnpm.cmd exec biome check "apps/web/src/app/(app)/layout.tsx" "apps/web/src/app/(app)/layout.test.tsx" "apps/web/src/app/globals.css" "apps/web/src/app/(app)/workouts/page.tsx" "apps/web/src/app/(app)/workouts/page.test.tsx" "apps/web/src/app/(app)/workouts/_workout-builder.tsx"
git diff --check
git add -- "apps/web/src/app/(app)/layout.tsx" "apps/web/src/app/(app)/layout.test.tsx" "apps/web/src/app/globals.css" "apps/web/src/app/(app)/workouts/page.tsx" "apps/web/src/app/(app)/workouts/page.test.tsx" "apps/web/src/app/(app)/workouts/_workout-builder.tsx"
git commit -m "feat(web): abre construtor na rota de treinos"
```

Expected: verificação com código 0; outras rotas mantêm o padding atual.

---

### Task 3: Implementar detalhes do treino e ações do rascunho

**Files:**
- Modify: `apps/web/src/app/(app)/workouts/_workout-builder.tsx`
- Create: `apps/web/src/app/(app)/workouts/_workout-builder.test.tsx`
- Create: `apps/web/src/app/(app)/workouts/_workout-details-panel.tsx`
- Move: `apps/web/src/app/(app)/workouts/new/actions.ts` to `apps/web/src/app/(app)/workouts/actions.ts`
- Modify: `apps/web/src/app/(app)/workouts/new/_editor.tsx`

**Interfaces:**
- Consumes: `createWorkoutDraft`, `resetWorkoutDraft`, `validateWorkoutDraft`, `buildCreateWorkoutInput`.
- Produces: `WorkoutDetailsPanel({ draft, students, error, pending, studentsLoadFailed, onDraftChange, onDiscard, onSave })`.
- Produces: `createWorkoutPlanAction(input: CreateWorkoutInput): Promise<{ error: string } | undefined>`.
- `onDraftChange` recebe `Partial<Omit<WorkoutDraftState, 'days'>>`.
- `onSave` não recebe status; usa `draft.status`.

- [ ] **Step 1: Escrever testes RED do painel de detalhes**

```tsx
it('renderiza os metadados em pt-BR e altera o rascunho', () => {
  render(<WorkoutBuilder {...builderProps} />);

  fireEvent.change(screen.getByLabelText('Nome do plano'), {
    target: { value: 'Hipertrofia A/B' },
  });
  fireEvent.change(screen.getByLabelText('Data inicial'), {
    target: { value: '2026-08-01' },
  });
  fireEvent.click(screen.getByRole('radio', { name: 'Ativo' }));

  expect(screen.getByDisplayValue('Hipertrofia A/B')).toBeInTheDocument();
  expect(screen.getByDisplayValue('2026-08-01')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Ativo' })).toBeChecked();
});

it('descarta os campos após confirmação e preserva o aluno', async () => {
  render(<WorkoutBuilder {...builderProps} initialStudentId="student-2" />);
  fireEvent.change(screen.getByLabelText('Nome do plano'), {
    target: { value: 'Rascunho local' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));

  const dialog = screen.getByRole('alertdialog', { name: 'Descartar alterações?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Descartar' }));

  await waitFor(() => {
    expect(screen.getByLabelText('Nome do plano')).toHaveValue('');
    expect(screen.getByLabelText('Aluno')).toHaveValue('student-2');
  });
});

it('mostra estado sem alunos e desabilita o salvamento', () => {
  render(<WorkoutBuilder {...builderProps} students={[]} initialStudentId="" />);

  expect(screen.getByText('Cadastre um aluno para montar treinos.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Cadastrar aluno' })).toHaveAttribute(
    'href',
    '/students/new',
  );
  expect(screen.getByRole('button', { name: 'Salvar treino' })).toBeDisabled();
});

it('informa falha ao carregar alunos e bloqueia o salvamento', () => {
  render(<WorkoutBuilder {...builderProps} studentsLoadFailed />);

  expect(screen.getByRole('alert')).toHaveTextContent(
    'Não foi possível carregar os alunos.',
  );
  expect(screen.getByRole('button', { name: 'Salvar treino' })).toBeDisabled();
});
```

- [ ] **Step 2: Executar o teste focado e confirmar RED**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/app/(app)/workouts/_workout-builder.test.tsx"
```

Expected: FAIL porque o painel e os controles ainda não existem.

- [ ] **Step 3: Mover a action para a rota canônica**

Mover o arquivo sem alterar sua responsabilidade e atualizar importações:

```ts
'use server';

export async function createWorkoutPlanAction(input: CreateWorkoutInput) {
  const client = await configureServerClient();
  const response = await postWorkoutPlans({ client, body: input });
  if (response.error || !response.data) {
    return { error: 'Não foi possível salvar o treino. Tente novamente.' };
  }

  revalidatePath('/workouts');
  revalidatePath(`/students/${input.studentId}`);
  redirect(`/workouts/${response.data.id}`);
}
```

Enquanto o editor legado existir, trocar seu import para `import { createWorkoutPlanAction } from '../actions';`. A Task 6 removerá esse editor depois de confirmar cobertura equivalente.

- [ ] **Step 4: Implementar `WorkoutDetailsPanel`**

Usar `Input`, `Select`, `Avatar`, `Button` e `ConfirmationDialog`. Estruturar o painel:

```tsx
<aside className="flex w-[360px] shrink-0 flex-col justify-between border-r border-border bg-card">
  <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
    <h1 className="font-display text-lg font-bold">Detalhes do treino</h1>
    {/* Nome, aluno, período, status e notas */}
  </div>
  <div className="flex items-center gap-2 border-t border-border px-6 py-4">
    <ConfirmationDialog
      trigger={<Button variant="ghost">Descartar</Button>}
      title="Descartar alterações?"
      description="Os dados deste rascunho serão removidos."
      confirmLabel="Descartar"
      pendingLabel="Descartando..."
      confirmAction={onDiscard}
    />
    <Button className="flex-1" onClick={onSave} disabled={pending || !draft.studentId}>
      <Save />
      {pending ? 'Salvando…' : 'Salvar treino'}
    </Button>
  </div>
</aside>
```

Requisitos dos campos:

```tsx
<Input
  id="workout-name"
  value={draft.name}
  onChange={(event) => onDraftChange({ name: event.target.value })}
/>

<Input
  id="start-date"
  type="date"
  value={draft.startDate}
  onChange={(event) => onDraftChange({ startDate: event.target.value })}
/>

<Input
  id="end-date"
  type="date"
  min={draft.startDate || undefined}
  value={draft.endDate}
  onChange={(event) => onDraftChange({ endDate: event.target.value })}
/>
```

Status usa um `radiogroup` com três botões visuais e valores `draft`, `active`, `archived`. Notas usam `textarea` com `maxLength={2000}` e podem ser recolhidas pelo ícone de chevron.

Quando `studentsLoadFailed` for verdadeiro, renderizar “Não foi possível carregar os alunos.” com `role="alert"` e desabilitar os controles que dependem de aluno. Enquanto `pending` for verdadeiro, desabilitar select, campos, status, descarte e salvamento para impedir alterações concorrentes.

- [ ] **Step 5: Conectar estado, descarte e salvamento no builder**

```tsx
const createId = () => crypto.randomUUID();
const [draft, setDraft] = useState<WorkoutDraftState>(() =>
  createWorkoutDraft(initialStudentId, createId),
);
const [error, setError] = useState<string | null>(null);
const [pending, startTransition] = useTransition();

function changeDraft(change: Partial<Omit<WorkoutDraftState, 'days'>>) {
  setDraft((current) => ({ ...current, ...change }));
}

function discardDraft() {
  setDraft((current) => resetWorkoutDraft(current, createId));
  setError(null);
}

function saveDraft() {
  const validationError = validateWorkoutDraft(draft);
  if (validationError) {
    setError(validationError);
    return;
  }

  setError(null);
  startTransition(async () => {
    const result = await createWorkoutPlanAction(buildCreateWorkoutInput(draft));
    if (result?.error) setError(result.error);
  });
}
```

Montar `WorkoutDetailsPanel` como primeiro filho do root full-bleed.

- [ ] **Step 6: Executar o teste focado e confirmar GREEN**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/app/(app)/workouts/_workout-builder.test.tsx"
```

Expected: testes de metadados, descarte e ausência de alunos PASS.

- [ ] **Step 7: Verificar e commit**

Run:

```powershell
pnpm.cmd --dir apps/web typecheck
pnpm.cmd exec biome check "apps/web/src/app/(app)/workouts/_workout-builder.tsx" "apps/web/src/app/(app)/workouts/_workout-builder.test.tsx" "apps/web/src/app/(app)/workouts/_workout-details-panel.tsx" "apps/web/src/app/(app)/workouts/actions.ts" "apps/web/src/app/(app)/workouts/new/_editor.tsx"
git diff --check
git add -- "apps/web/src/app/(app)/workouts/_workout-builder.tsx" "apps/web/src/app/(app)/workouts/_workout-builder.test.tsx" "apps/web/src/app/(app)/workouts/_workout-details-panel.tsx" "apps/web/src/app/(app)/workouts/actions.ts" "apps/web/src/app/(app)/workouts/new/actions.ts" "apps/web/src/app/(app)/workouts/new/_editor.tsx"
git commit -m "feat(web): monta detalhes do construtor de treinos"
```

Expected: verificação com código 0; o commit registra a movimentação da action e o painel.

---

### Task 4: Implementar abas, estado vazio e tabela de exercícios

**Files:**
- Modify: `apps/web/src/app/(app)/workouts/_workout-builder.tsx`
- Modify: `apps/web/src/app/(app)/workouts/_workout-builder.test.tsx`
- Create: `apps/web/src/app/(app)/workouts/_workout-day-tabs.tsx`
- Create: `apps/web/src/app/(app)/workouts/_workout-empty-state.tsx`
- Create: `apps/web/src/app/(app)/workouts/_workout-exercise-table.tsx`

**Interfaces:**
- Produces: `WorkoutDayTabs({ days, activeDayIndex, onSelect, onAdd, onRemove, onRename })`.
- Produces: `WorkoutEmptyState({ onAddExercise })`.
- Produces: `WorkoutExerciseTable({ dayIndex, exercises, onUpdate, onRemove, onReorder, onAddExercise })`.
- `onUpdate<K extends keyof WorkoutExerciseState>(exerciseIndex: number, key: K, value: WorkoutExerciseState[K]): void`.
- `onReorder(fromIndex: number, toIndex: number): void`.
- Consumes: funções puras de dias e exercícios da Task 1.

- [ ] **Step 1: Adicionar testes RED dos dias e do estado vazio**

```tsx
it('mostra o estado XOIIZ com o gatilho de adicionar exercício', () => {
  render(<WorkoutBuilder {...builderProps} />);

  expect(screen.getByRole('heading', { name: 'Nenhum exercício ainda' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Adicionar exercício' })).toBeEnabled();
});

it('adiciona, seleciona e renomeia dias', () => {
  render(<WorkoutBuilder {...builderProps} />);
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar dia' }));
  fireEvent.click(screen.getByRole('tab', { name: 'Treino B' }));
  fireEvent.click(screen.getByRole('button', { name: 'Renomear Treino B' }));
  fireEvent.change(screen.getByLabelText('Nome do dia'), {
    target: { value: 'Inferiores' },
  });
  fireEvent.keyDown(screen.getByLabelText('Nome do dia'), { key: 'Enter' });

  expect(screen.getByRole('tab', { name: 'Inferiores' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
```

- [ ] **Step 2: Adicionar testes RED da tabela**

```tsx
it('edita todos os campos suportados do exercício', () => {
  renderBuilderWithExercise();

  fireEvent.change(screen.getByLabelText('Séries de Supino reto'), {
    target: { value: '4' },
  });
  fireEvent.change(screen.getByLabelText('Tempo de Supino reto'), {
    target: { value: '3-1-2' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Notas de Supino reto' }));
  fireEvent.change(screen.getByLabelText('Notas de Supino reto'), {
    target: { value: 'Controlar a descida' },
  });

  expect(screen.getByLabelText('Séries de Supino reto')).toHaveValue(4);
  expect(screen.getByLabelText('Tempo de Supino reto')).toHaveValue('3-1-2');
  expect(screen.getByLabelText('Notas de Supino reto')).toHaveValue(
    'Controlar a descida',
  );
});

it('reordena por teclado a partir da alça', () => {
  renderBuilderWithTwoExercises();
  const handle = screen.getByRole('button', { name: 'Reordenar Remada' });
  fireEvent.keyDown(handle, { key: 'ArrowUp' });

  expect(
    screen.getAllByTestId('workout-exercise-name').map((node) => node.textContent),
  ).toEqual(['Remada', 'Supino reto']);
});
```

- [ ] **Step 3: Executar os testes e confirmar RED**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/app/(app)/workouts/_workout-builder.test.tsx"
```

Expected: FAIL porque abas, estado vazio, tabela e drawer ainda não estão implementados.

- [ ] **Step 4: Implementar as abas acessíveis**

```tsx
<div
  role="tablist"
  aria-label="Dias do treino"
  className="flex h-[45px] items-center border-b border-border px-6"
>
  {days.map((day, index) => (
    <button
      key={day.id}
      type="button"
      role="tab"
      aria-selected={index === activeDayIndex}
      aria-controls={`workout-day-panel-${day.id}`}
      onClick={() => onSelect(index)}
      className={cn(
        'h-full border-b-2 px-5 font-display text-[13px]',
        index === activeDayIndex
          ? 'border-primary font-semibold text-primary'
          : 'border-transparent font-medium text-muted-foreground',
      )}
    >
      {day.label}
    </button>
  ))}
  <Button
    type="button"
    variant="outline"
    size="icon-sm"
    aria-label="Adicionar dia"
    onClick={onAdd}
    disabled={days.length >= 7}
  >
    <Plus />
  </Button>
</div>
```

A edição do título aparece no cabeçalho do `tabpanel`; `Enter` confirma e `Escape` restaura o texto anterior. Remoção usa `ConfirmationDialog`.

- [ ] **Step 5: Implementar o estado vazio `XOIIZ`**

```tsx
export function WorkoutEmptyState({ onAddExercise }: { onAddExercise: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-10 text-center">
      <div className="grid size-[120px] place-items-center rounded-full bg-success-bg">
        <Dumbbell className="size-12 text-primary" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <h2 className="font-display text-base font-bold">Nenhum exercício ainda</h2>
        <p className="text-sm text-muted-foreground">
          Adicione o primeiro exercício para começar a montar este treino.
        </p>
      </div>
      <Button type="button" onClick={onAddExercise}>
        <Plus />
        Adicionar exercício
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Implementar a tabela editável**

Usar estrutura semântica de tabela com largura mínima que preserve as colunas:

```tsx
<div className="min-h-0 flex-1 overflow-auto">
  <table className="w-full min-w-[720px] border-collapse">
    <thead className="sticky top-0 bg-card-hover">
      <tr className="font-display text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        <th className="w-10" aria-label="Reordenação" />
        <th className="min-w-[220px] text-left">Exercício</th>
        <th className="w-[70px]">Séries</th>
        <th className="w-[70px]">Reps</th>
        <th className="w-[90px]">Carga (kg)</th>
        <th className="w-[90px]">Descanso (s)</th>
        <th className="w-[80px]">Tempo</th>
        <th className="w-16" aria-label="Ações" />
      </tr>
    </thead>
    <tbody>{/* linhas controladas */}</tbody>
  </table>
</div>
```

Cada alça usa `draggable` para ponteiro e `ArrowUp`/`ArrowDown` para teclado. Inputs possuem `aria-label` com o nome do exercício. O ícone `MessageSquare` alterna uma linha de notas com `colSpan={8}`. O botão `X` usa `ConfirmationDialog`.

O botão inferior equivalente a `mmJ8l` fica após a tabela:

```tsx
<Button
  type="button"
  variant="outline"
  className="h-11 w-full text-primary"
  onClick={onAddExercise}
>
  <Plus />
  Adicionar exercício
</Button>
```

- [ ] **Step 7: Integrar componentes ao builder**

O painel central deve usar:

```tsx
<section className="flex min-w-0 flex-1 flex-col bg-background">
  <WorkoutDayTabs
    days={draft.days}
    activeDayIndex={activeDayIndex}
    onSelect={setActiveDayIndex}
    onAdd={addDay}
    onRemove={removeDay}
    onRename={renameDay}
  />
  <div
    id={`workout-day-panel-${activeDay.id}`}
    role="tabpanel"
    className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5"
  >
    {/* cabeçalho editável */}
    {activeDay.exercises.length === 0 ? (
      <WorkoutEmptyState onAddExercise={openExerciseDrawer} />
    ) : (
      <WorkoutExerciseTable
        dayIndex={activeDayIndex}
        exercises={activeDay.exercises}
        onUpdate={updateExercise}
        onRemove={removeExercise}
        onReorder={reorderExercise}
        onAddExercise={openExerciseDrawer}
      />
    )}
  </div>
</section>
```

Após remover o dia ativo, limitar o novo índice a `Math.max(0, nextDays.length - 1)`.

- [ ] **Step 8: Executar o teste focado e confirmar GREEN parcial**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/app/(app)/workouts/_workout-builder.test.tsx"
```

Expected: testes de detalhes, dias, estado vazio e tabela PASS. Os testes de abertura do drawer serão adicionados somente na Task 5.

- [ ] **Step 9: Verificar e commit**

Run:

```powershell
pnpm.cmd --dir apps/web typecheck
pnpm.cmd exec biome check "apps/web/src/app/(app)/workouts/_workout-builder.tsx" "apps/web/src/app/(app)/workouts/_workout-builder.test.tsx" "apps/web/src/app/(app)/workouts/_workout-day-tabs.tsx" "apps/web/src/app/(app)/workouts/_workout-empty-state.tsx" "apps/web/src/app/(app)/workouts/_workout-exercise-table.tsx"
git diff --check
git add -- "apps/web/src/app/(app)/workouts/_workout-builder.tsx" "apps/web/src/app/(app)/workouts/_workout-builder.test.tsx" "apps/web/src/app/(app)/workouts/_workout-day-tabs.tsx" "apps/web/src/app/(app)/workouts/_workout-empty-state.tsx" "apps/web/src/app/(app)/workouts/_workout-exercise-table.tsx"
git commit -m "feat(web): implementa dias e exercícios do construtor"
```

Expected: verificação com código 0; commit contém somente a área central e seus testes.

---

### Task 5: Implementar `GxGsg` como drawer sobreposto

**Files:**
- Modify: `apps/web/src/app/(app)/workouts/_workout-builder.tsx`
- Modify: `apps/web/src/app/(app)/workouts/_workout-builder.test.tsx`
- Create: `apps/web/src/app/(app)/workouts/_exercise-drawer.tsx`

**Interfaces:**
- Produces: `ExerciseDrawer({ open, onOpenChange, exercises, loadFailed, onPick })`.
- `onPick(exercise: ExerciseLite): void` inclui o exercício no dia ativo.
- Consumes: `Dialog`, `DialogContent`, `DialogClose` e `DialogTitle` existentes.
- Consumes: `MUSCLE_GROUP_LABEL` para labels dos filtros.

- [ ] **Step 1: Escrever os testes RED específicos do drawer**

```tsx
it('abre GxGsg sobre o conteúdo sem transformar o drawer em coluna', () => {
  render(<WorkoutBuilder {...builderProps} />);
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar exercício' }));

  const drawer = screen.getByRole('dialog', { name: 'Adicionar exercício' });
  expect(drawer).toHaveAttribute('data-exercise-drawer');
  expect(drawer).toHaveClass('fixed', 'right-0', 'w-80');
  expect(drawer).not.toHaveClass('flex-1');
});

it('filtra por nome e grupo muscular e adiciona ao dia ativo', async () => {
  render(<WorkoutBuilder {...builderProps} />);
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar exercício' }));
  fireEvent.change(screen.getByPlaceholderText('Buscar exercícios…'), {
    target: { value: 'supino' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Peito' }));
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar Supino reto' }));

  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: 'Adicionar exercício' })).not.toBeInTheDocument();
    expect(screen.getByText('Supino reto')).toBeInTheDocument();
  });
});

it('fecha pelo X e devolve o foco ao gatilho', async () => {
  render(<WorkoutBuilder {...builderProps} />);
  const trigger = screen.getByRole('button', { name: 'Adicionar exercício' });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('button', { name: 'Fechar biblioteca de exercícios' }));

  await waitFor(() => expect(trigger).toHaveFocus());
});

it('informa falha e busca sem resultado', () => {
  const { rerender } = render(
    <WorkoutBuilder {...builderProps} exercisesLoadFailed />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar exercício' }));
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Não foi possível carregar os exercícios.',
  );

  rerender(<WorkoutBuilder {...builderProps} />);
  fireEvent.change(screen.getByPlaceholderText('Buscar exercícios…'), {
    target: { value: 'inexistente' },
  });
  expect(screen.getByText('Nenhum exercício encontrado.')).toBeInTheDocument();
});
```

- [ ] **Step 2: Executar o teste focado e confirmar RED**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/app/(app)/workouts/_workout-builder.test.tsx"
```

Expected: FAIL nos testes do drawer porque `_exercise-drawer.tsx` ainda não existe.

- [ ] **Step 3: Implementar filtros derivados**

```tsx
const [query, setQuery] = useState('');
const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | 'all'>('all');

const filteredExercises = useMemo(() => {
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  return exercises.filter((exercise) => {
    const matchesQuery =
      !normalizedQuery ||
      exercise.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery);
    const matchesGroup =
      muscleGroup === 'all' || exercise.muscleGroup === muscleGroup;
    return matchesQuery && matchesGroup;
  });
}, [exercises, muscleGroup, query]);
```

Os filtros exibidos são `Todos` e apenas grupos presentes em `exercises`, na ordem definida por `MUSCLE_GROUP_LABEL`.

- [ ] **Step 4: Implementar o drawer com Radix Dialog**

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent
    data-exercise-drawer
    aria-describedby={undefined}
    showCloseButton={false}
    overlayClassName="bg-foreground/40 lg:bg-transparent"
    className="fixed inset-y-0 right-0 left-auto top-0 z-50 flex h-dvh w-[min(320px,100vw)] max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-y-0 border-r-0 border-l border-border bg-card p-0 shadow-[-4px_0_24px_#00000018] sm:max-w-none"
  >
    <div className="flex items-center justify-between border-b border-border px-5 py-4">
      <DialogTitle className="font-display text-base font-bold">
        Adicionar exercício
      </DialogTitle>
      <DialogClose asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Fechar biblioteca de exercícios"
        >
          <X />
        </Button>
      </DialogClose>
    </div>
    {/* busca, chips, lista e link para /exercises */}
  </DialogContent>
</Dialog>
```

No desktop o overlay é transparente, portanto o painel parece estar diretamente sobre a tabela. O overlay continua capturando clique externo e o Radix mantém foco, `Escape` e retorno ao gatilho.

- [ ] **Step 5: Implementar cards e inclusão**

Cada exercício usa:

```tsx
<li className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
  <div className="grid size-12 shrink-0 place-items-center rounded-md bg-muted">
    <Dumbbell className="size-5 text-muted-foreground" />
  </div>
  <div className="min-w-0 flex-1">
    <p className="truncate text-[13px] font-semibold">{exercise.name}</p>
    <div className="mt-1 flex gap-1">
      <Badge variant="active" dot={false}>
        {MUSCLE_GROUP_LABEL[exercise.muscleGroup]}
      </Badge>
      {exercise.equipment && (
        <span className="rounded-sm bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {exercise.equipment}
        </span>
      )}
    </div>
  </div>
  <Button
    type="button"
    size="icon-sm"
    aria-label={`Adicionar ${exercise.name}`}
    onClick={() => onPick(exercise)}
  >
    <Plus />
  </Button>
</li>
```

O rodapé contém `<Link href="/exercises">Criar exercício personalizado</Link>`.

- [ ] **Step 6: Integrar o drawer ao builder**

```tsx
const [exerciseDrawerOpen, setExerciseDrawerOpen] = useState(false);

function pickExercise(exercise: ExerciseLite) {
  setDraft((current) => ({
    ...current,
    days: addWorkoutExercise(current.days, activeDayIndex, exercise),
  }));
  setExerciseDrawerOpen(false);
}

<ExerciseDrawer
  open={exerciseDrawerOpen}
  onOpenChange={setExerciseDrawerOpen}
  exercises={exercises}
  loadFailed={exercisesLoadFailed}
  onPick={pickExercise}
/>
```

Tanto `WorkoutEmptyState` quanto `WorkoutExerciseTable` recebem `onAddExercise={() => setExerciseDrawerOpen(true)}`.

- [ ] **Step 7: Executar o teste focado e confirmar GREEN**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/app/(app)/workouts/_workout-builder.test.tsx"
```

Expected: todos os testes do builder, incluindo abertura pelos dois gatilhos, filtros, inclusão, `X`, `Escape` e retorno de foco, PASS.

- [ ] **Step 8: Verificar e commit**

Run:

```powershell
pnpm.cmd --dir apps/web typecheck
pnpm.cmd exec biome check "apps/web/src/app/(app)/workouts/_workout-builder.tsx" "apps/web/src/app/(app)/workouts/_workout-builder.test.tsx" "apps/web/src/app/(app)/workouts/_exercise-drawer.tsx"
git diff --check
git add -- "apps/web/src/app/(app)/workouts/_workout-builder.tsx" "apps/web/src/app/(app)/workouts/_workout-builder.test.tsx" "apps/web/src/app/(app)/workouts/_exercise-drawer.tsx"
git commit -m "feat(web): adiciona drawer de exercícios sobreposto"
```

Expected: verificação com código 0; o drawer não é filho flex que consome largura.

---

### Task 6: Finalizar salvamento, compatibilidade de rota e cobertura

**Files:**
- Modify: `apps/web/src/app/(app)/workouts/_workout-builder.test.tsx`
- Create: `apps/web/src/app/(app)/workouts/actions.test.ts`
- Modify: `apps/web/src/app/(app)/workouts/new/page.tsx`
- Modify: `apps/web/src/app/(app)/workouts/new/page.test.tsx`
- Delete: `apps/web/src/app/(app)/workouts/new/_editor.tsx`
- Delete: `apps/web/src/app/(app)/workouts/new/_editor.test.tsx`

**Interfaces:**
- Consumes: `createWorkoutPlanAction` da Task 3.
- Produces: redirect permanente de compatibilidade que preserva `studentId`.
- O payload submetido corresponde exatamente a `CreateWorkoutInput` da Task 1.
- O editor legado é removido somente depois de a cobertura equivalente existir em `_workout-builder.test.tsx`.

- [ ] **Step 1: Escrever teste RED do payload completo no builder**

```tsx
it('submete o rascunho completo e preserva erro sem limpar campos', async () => {
  vi.mocked(createWorkoutPlanAction).mockResolvedValue({
    error: 'Não foi possível salvar o treino. Tente novamente.',
  });
  renderBuilderWithExercise();

  fireEvent.change(screen.getByLabelText('Nome do plano'), {
    target: { value: 'Hipertrofia' },
  });
  fireEvent.change(screen.getByLabelText('Data inicial'), {
    target: { value: '2026-08-01' },
  });
  fireEvent.change(screen.getByLabelText('Data final'), {
    target: { value: '2026-10-31' },
  });
  fireEvent.click(screen.getByRole('radio', { name: 'Ativo' }));
  fireEvent.change(screen.getByLabelText('Tempo de Supino reto'), {
    target: { value: '3-1-2' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar treino' }));

  await waitFor(() => {
    expect(createWorkoutPlanAction).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 'student-1',
        name: 'Hipertrofia',
        startDate: '2026-08-01',
        endDate: '2026-10-31',
        status: 'active',
        days: [
          expect.objectContaining({
            exercises: [
              expect.objectContaining({
                exerciseId: 'exercise-1',
                tempo: '3-1-2',
              }),
            ],
          }),
        ],
      }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível salvar o treino. Tente novamente.',
    );
    expect(screen.getByLabelText('Nome do plano')).toHaveValue('Hipertrofia');
  });
});
```

- [ ] **Step 2: Escrever testes RED da action**

Mockar `configureServerClient`, `postWorkoutPlans`, `revalidatePath` e `redirect`:

```ts
it('envia o payload, invalida rotas e redireciona para o plano criado', async () => {
  vi.mocked(postWorkoutPlans).mockResolvedValue({
    data: { id: 'workout-1' },
  } as Awaited<ReturnType<typeof postWorkoutPlans>>);

  await expect(createWorkoutPlanAction(input)).rejects.toThrow(
    'redirect:/workouts/workout-1',
  );

  expect(postWorkoutPlans).toHaveBeenCalledWith({
    client: expect.anything(),
    body: input,
  });
  expect(revalidatePath).toHaveBeenCalledWith('/workouts');
  expect(revalidatePath).toHaveBeenCalledWith('/students/student-1');
});

it('traduz falha esperada sem redirecionar', async () => {
  vi.mocked(postWorkoutPlans).mockResolvedValue({
    error: { message: 'internal' },
  } as Awaited<ReturnType<typeof postWorkoutPlans>>);

  await expect(createWorkoutPlanAction(input)).resolves.toEqual({
    error: 'Não foi possível salvar o treino. Tente novamente.',
  });
  expect(redirect).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Escrever teste RED do redirecionamento legado**

```tsx
it('redireciona para o construtor preservando studentId', async () => {
  await expect(
    NewWorkoutPage({
      searchParams: Promise.resolve({ studentId: 'student-1' }),
    }),
  ).rejects.toThrow('redirect:/workouts?studentId=student-1');
});

it('redireciona para o construtor sem query quando studentId não existe', async () => {
  await expect(
    NewWorkoutPage({ searchParams: Promise.resolve({}) }),
  ).rejects.toThrow('redirect:/workouts');
});
```

- [ ] **Step 4: Executar os testes focados e confirmar RED**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/app/(app)/workouts/_workout-builder.test.tsx" "src/app/(app)/workouts/actions.test.ts" "src/app/(app)/workouts/new/page.test.tsx"
```

Expected: FAIL até a action, o payload final e o redirecionamento legado corresponderem aos contratos.

- [ ] **Step 5: Implementar o redirecionamento legado**

```tsx
import { redirect } from 'next/navigation';

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  redirect(studentId ? `/workouts?studentId=${encodeURIComponent(studentId)}` : '/workouts');
}
```

Remover chamadas de aluno/exercícios e o editor legado dessa rota.

- [ ] **Step 6: Remover o editor legado após confirmar cobertura equivalente**

Comparar os casos de `_editor.test.tsx` com `_workout-builder.test.tsx` e confirmar cobertura para:

- validação antes do salvamento;
- inclusão de exercício;
- criação ativa e em rascunho;
- inclusão, renomeação e remoção de dias;
- edição, reordenação e remoção de exercícios;
- notas e erro da action;
- busca vazia.

Depois apagar `_editor.tsx` e `_editor.test.tsx`. Não manter reexport, código morto ou comentários de migração.

- [ ] **Step 7: Executar os testes focados e confirmar GREEN**

Run:

```powershell
pnpm.cmd --dir apps/web test -- "src/app/(app)/workouts/_workout-builder.test.tsx" "src/app/(app)/workouts/actions.test.ts" "src/app/(app)/workouts/page.test.tsx" "src/app/(app)/workouts/new/page.test.tsx" "src/application/workouts/workout-editor-model.test.ts"
```

Expected: todos os testes focados PASS e nenhum import referencia `_editor`.

- [ ] **Step 8: Executar cobertura e verificação estática completas**

Run:

```powershell
pnpm.cmd --dir apps/web test
pnpm.cmd --dir apps/web test:coverage:core
pnpm.cmd --dir apps/web test:coverage:ui
pnpm.cmd --dir apps/web typecheck
pnpm.cmd exec biome check apps/web
git diff --check
```

Expected: testes e verificações com código 0; os gates configurados de cobertura core e UI atingem pelo menos 85%.

- [ ] **Step 9: Verificar UTF-8 literal nos arquivos textuais alterados**

Run:

```powershell
git diff --name-only --diff-filter=ACMR | Where-Object { $_ -match '\.(ts|tsx|css|md)$' } | ForEach-Object { rg -n '\\u[0-9a-fA-F]{4}' -- $_ }
```

Expected: nenhuma ocorrência usada para representar acentos ou caracteres de interface.

- [ ] **Step 10: Verificar visualmente os dois estados no navegador**

Com API e web iniciadas pelo usuário, abrir `http://localhost:3000/workouts?studentId=<id-ativo>` em 1440 × 960 e comparar:

- sidebar com 260 px;
- detalhes com 360 px;
- abas e estado vazio equivalentes a `XOIIZ`;
- `mmJ8l` visível após adicionar exercício;
- `GxGsg` com 320 px sobre a tabela;
- abertura pelos dois gatilhos;
- tabela sem redução quando o drawer abre;
- fechamento por `X`, clique externo e `Escape`;
- foco devolvido ao gatilho;
- nenhuma rolagem horizontal na página;
- nenhum erro no console.

Repetir em 390 × 844 e confirmar drawer limitado ao viewport, backdrop, campos utilizáveis e ausência de overflow horizontal.

- [ ] **Step 11: Inspecionar o escopo final e commit**

Run:

```powershell
git status --short
git diff --stat
git diff -- "apps/web"
```

Confirmar que `assets/design/pencil_design.pen` permanece fora do stage. Depois:

```powershell
git add -- "apps/web/src/app/(app)/workouts/_workout-builder.test.tsx" "apps/web/src/app/(app)/workouts/actions.test.ts" "apps/web/src/app/(app)/workouts/new/page.tsx" "apps/web/src/app/(app)/workouts/new/page.test.tsx" "apps/web/src/app/(app)/workouts/new/_editor.tsx" "apps/web/src/app/(app)/workouts/new/_editor.test.tsx"
git diff --cached --check
git commit -m "feat(web): finaliza construtor de treinos"
```

Expected: commit contém somente a finalização coerente do construtor; o worktree mantém intactas alterações locais fora do escopo.

---

## Handoff de execução

O executor deve começar relendo:

- `AGENTS.md`;
- `apps/web/AGENTS.md`;
- `docs/superpowers/specs/2026-07-30-construtor-treinos-design.md`;
- este plano;
- os nodes `WGclk`, `XOIIZ`, `mmJ8l` e `GxGsg` pelo MCP do Pencil.

Antes de editar, verificar o estado do Git e preservar `assets/design/pencil_design.pen`. Executar cada task em ordem, respeitar o ciclo RED-GREEN, revisar o diff após cada task e não avançar quando a verificação focada estiver vermelha.
