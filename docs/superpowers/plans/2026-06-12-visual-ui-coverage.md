# Visual UI Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a controlled visual/UI coverage ramp for `apps/web` and `apps/mobile`, with blocking UI coverage gates for critical visual flows and broad app coverage remaining visible but non-blocking.

**Architecture:** Keep visual tests at the edge: web uses Vitest + Testing Library + jsdom, mobile adds React Native Testing Library with mocked native/router/query dependencies. Coverage UI configs include only critical visual files with real behavior tests, while existing core coverage remains unchanged.

**Tech Stack:** TypeScript, Vitest, V8 coverage, Testing Library, React Native Testing Library, Next.js, Expo/React Native, Biome, pnpm.

---

## File Structure

Create or modify web test files:

- `apps/web/src/components/student-form.test.tsx` - student form render, initial values and error state.
- `apps/web/src/components/sidebar.test.tsx` - active navigation and user/logout controls.
- `apps/web/src/components/top-bar.test.tsx` - title, subtitle and action slot.
- `apps/web/src/app/(app)/students/[id]/assessments/_form.test.tsx` - assessment form render, file input and action error.
- `apps/web/src/app/(app)/students/[id]/assessments/_chart.test.tsx` - empty and populated chart states.
- `apps/web/src/app/(app)/workouts/new/_editor.test.tsx` - workout editor interactions.
- `apps/web/vitest.ui-coverage.config.ts` - blocking visual coverage config.
- `apps/web/package.json` - `test:coverage:ui` script.

Create or modify mobile test files:

- `apps/mobile/test/setup.ts` - RNTL cleanup and shared native mocks.
- `apps/mobile/src/screens/today-workout.test.tsx` - today workout loading, empty, loaded and stale states.
- `apps/mobile/src/screens/progress.test.tsx` - progress loading, empty and populated states.
- `apps/mobile/src/screens/profile.test.tsx` - profile loading, data fallback and logout.
- `apps/mobile/src/screens/log-workout.test.tsx` - log workout loading, unavailable, set editing and finish.
- `apps/mobile/src/screens/new-assessment.test.tsx` - assessment form editing, photo picker and submit.
- `apps/mobile/vitest.config.ts` - include `*.test.tsx` and setup file.
- `apps/mobile/vitest.ui-coverage.config.ts` - blocking visual coverage config.
- `apps/mobile/package.json` - `test:coverage:ui` script and explicit RNTL dev dependency.
- `pnpm-lock.yaml` - dependency metadata after adding RNTL.

Modify docs:

- `apps/web/AGENTS.md` - document local visual coverage command.
- `apps/mobile/AGENTS.md` - document local visual coverage command and RNTL harness rule.

Playwright:

- Do not add Playwright in the first pass. Use it only if a planned web UI test cannot be made reliable in jsdom because it requires browser navigation/layout behavior. If that happens, create `apps/web/playwright.config.ts`, add `@playwright/test`, add a focused smoke test under `apps/web/e2e`, and document the command in the same task that needs it.

---

### Task 1: Web Student Form and Shell UI Tests

**Files:**
- Create: `apps/web/src/components/student-form.test.tsx`
- Create: `apps/web/src/components/sidebar.test.tsx`
- Create: `apps/web/src/components/top-bar.test.tsx`

- [ ] **Step 1: Write web student form test**

Create `apps/web/src/components/student-form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudentForm } from './student-form';

describe('StudentForm', () => {
  it('renders initial values and the custom submit label', () => {
    render(
      <StudentForm
        action={vi.fn()}
        submitLabel="Atualizar aluno"
        initial={{
          id: 'student-id',
          name: 'Ana Souza',
          email: 'ana@example.com',
          phone: '11999999999',
          birthDate: '2000-01-01',
          gender: 'female',
          goals: 'Hipertrofia',
          restrictions: 'Joelho',
          status: 'paused',
        }}
      />,
    );

    expect(screen.getByLabelText('Nome')).toHaveValue('Ana Souza');
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@example.com');
    expect(screen.getByLabelText('Telefone')).toHaveValue('11999999999');
    expect(screen.getByLabelText('Data de nascimento')).toHaveValue('2000-01-01');
    expect(screen.getByLabelText('Sexo')).toHaveValue('female');
    expect(screen.getByLabelText('Status')).toHaveValue('paused');
    expect(screen.getByLabelText('Objetivos')).toHaveValue('Hipertrofia');
    expect(screen.getByLabelText(/Restri/i)).toHaveValue('Joelho');
    expect(screen.getByRole('button', { name: 'Atualizar aluno' })).toBeEnabled();
  });

  it('renders the empty create form with required name', () => {
    render(<StudentForm action={vi.fn()} />);

    expect(screen.getByLabelText('Nome')).toBeRequired();
    expect(screen.getByLabelText('Status')).toHaveValue('active');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });
});
```

Run: `pnpm.cmd --dir apps/web exec vitest run src/components/student-form.test.tsx`

Expected: PASS.

- [ ] **Step 2: Write sidebar test with mocked pathname**

Create `apps/web/src/components/sidebar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './sidebar';

const navigationState = vi.hoisted(() => ({ pathname: '/students' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
}));

describe('Sidebar', () => {
  it('renders navigation links and user logout controls', () => {
    navigationState.pathname = '/students/123';

    render(<Sidebar user={{ name: 'Ana Trainer', email: 'ana@muvit.test' }} />);

    expect(screen.getByRole('link', { name: /muvit/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /alunos/i })).toHaveAttribute('href', '/students');
    expect(screen.getByText('Ana Trainer')).toBeInTheDocument();
    expect(screen.getByText('ana@muvit.test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });

  it('omits account controls when there is no user', () => {
    navigationState.pathname = '/dashboard';

    render(<Sidebar user={null} />);

    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument();
  });
});
```

Run: `pnpm.cmd --dir apps/web exec vitest run src/components/sidebar.test.tsx`

Expected: PASS.

- [ ] **Step 3: Write top bar test**

Create `apps/web/src/components/top-bar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  it('renders title, optional subtitle and action slot', () => {
    render(<TopBar title="Alunos" subtitle="ativos" actions={<button type="button">Novo</button>} />);

    expect(screen.getByRole('heading', { name: 'Alunos' })).toBeInTheDocument();
    expect(screen.getByText('ativos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument();
  });

  it('omits optional subtitle and actions', () => {
    render(<TopBar title="Dashboard" />);

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByText('ativos')).not.toBeInTheDocument();
  });
});
```

Run: `pnpm.cmd --dir apps/web exec vitest run src/components/top-bar.test.tsx`

Expected: PASS.

- [ ] **Step 4: Run focused web UI shell tests**

Run:

```powershell
pnpm.cmd --dir apps/web exec vitest run src/components/student-form.test.tsx src/components/sidebar.test.tsx src/components/top-bar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit web shell tests**

```powershell
git add apps/web/src/components/student-form.test.tsx apps/web/src/components/sidebar.test.tsx apps/web/src/components/top-bar.test.tsx
git commit -m "test(web): cobre formulario e shell visual"
```

### Task 2: Web Assessment UI Tests

**Files:**
- Create: `apps/web/src/app/(app)/students/[id]/assessments/_form.test.tsx`
- Create: `apps/web/src/app/(app)/students/[id]/assessments/_chart.test.tsx`

- [ ] **Step 1: Write assessment form tests**

Create `apps/web/src/app/(app)/students/[id]/assessments/_form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssessmentForm } from './_form';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useActionState: () => [
      { error: 'Informe a data.' },
      vi.fn(),
      false,
    ],
  };
});

vi.mock('./actions', () => ({
  createAssessmentAction: vi.fn(),
}));

describe('AssessmentForm', () => {
  it('renders assessment fields and the action error', () => {
    render(<AssessmentForm studentId="student-id" />);

    expect(screen.getByLabelText('Data')).toBeRequired();
    expect(screen.getByLabelText('Peso (kg)')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Altura (cm)')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('% Gordura')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Foto')).toHaveAttribute('accept', 'image/jpeg,image/png');
    expect(screen.getByText('Informe a data.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar/i })).toBeEnabled();
  });
});
```

Run: `pnpm.cmd --dir apps/web exec vitest run "src/app/(app)/students/[id]/assessments/_form.test.tsx"`

Expected: PASS.

- [ ] **Step 2: Write assessment chart tests**

Create `apps/web/src/app/(app)/students/[id]/assessments/_chart.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EvolutionChart } from './_chart';

describe('EvolutionChart', () => {
  it('renders empty-state copy when there is not enough data', () => {
    render(<EvolutionChart points={[{ date: '2026-06-12', weight: 80, bodyFat: null }]} />);

    expect(screen.getByText(/sem dados suficientes/i)).toBeInTheDocument();
  });

  it('renders a labelled svg chart for enough data', () => {
    render(
      <EvolutionChart
        points={[
          { date: '2026-06-01', weight: 82, bodyFat: 20 },
          { date: '2026-06-08', weight: 81, bodyFat: 19 },
        ]}
      />,
    );

    expect(screen.getByText('Peso (kg)')).toBeInTheDocument();
    expect(screen.getByText('% Gordura')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Evolucao de peso e percentual de gordura' })).toBeInTheDocument();
  });
});
```

Run: `pnpm.cmd --dir apps/web exec vitest run "src/app/(app)/students/[id]/assessments/_chart.test.tsx"`

Expected: PASS.

- [ ] **Step 3: Run focused assessment UI tests**

Run:

```powershell
pnpm.cmd --dir apps/web exec vitest run "src/app/(app)/students/[id]/assessments/_form.test.tsx" "src/app/(app)/students/[id]/assessments/_chart.test.tsx"
```

Expected: PASS.

- [ ] **Step 4: Commit assessment UI tests**

```powershell
git add "apps/web/src/app/(app)/students/[id]/assessments/_form.test.tsx" "apps/web/src/app/(app)/students/[id]/assessments/_chart.test.tsx"
git commit -m "test(web): cobre avaliacao visual"
```

### Task 3: Web Workout Editor UI Tests

**Files:**
- Create: `apps/web/src/app/(app)/workouts/new/_editor.test.tsx`

- [ ] **Step 1: Write workout editor tests**

Create `apps/web/src/app/(app)/workouts/new/_editor.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkoutEditor } from './_editor';
import { createWorkoutPlanAction } from './actions';

vi.mock('./actions', () => ({
  createWorkoutPlanAction: vi.fn(),
}));

const exercises = [
  { id: 'ex-1', name: 'Supino', muscleGroup: 'chest' as const },
  { id: 'ex-2', name: 'Remada', muscleGroup: 'back' as const },
];

describe('WorkoutEditor', () => {
  it('validates required workout data before saving', () => {
    render(<WorkoutEditor studentId="student-id" exercises={exercises} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar treino' }));

    expect(screen.getByText('Informe um nome para o treino.')).toBeInTheDocument();
    expect(createWorkoutPlanAction).not.toHaveBeenCalled();
  });

  it('adds an exercise and submits an active workout', async () => {
    vi.mocked(createWorkoutPlanAction).mockResolvedValue(null);
    vi.stubGlobal('crypto', { randomUUID: () => 'day-id' });

    render(<WorkoutEditor studentId="student-id" exercises={exercises} />);

    fireEvent.change(screen.getByLabelText('Nome do treino'), {
      target: { value: 'Hipertrofia' },
    });
    fireEvent.click(screen.getByRole('button', { name: /exercicio/i }));
    fireEvent.click(screen.getByRole('button', { name: /supino/i }));

    expect(screen.getByText('Supino')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar treino' }));

    await waitFor(() => {
      expect(createWorkoutPlanAction).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'student-id',
          name: 'Hipertrofia',
          status: 'active',
          days: [
            expect.objectContaining({
              exercises: [expect.objectContaining({ exerciseId: 'ex-1' })],
            }),
          ],
        }),
      );
    });
  });
});
```

Run: `pnpm.cmd --dir apps/web exec vitest run "src/app/(app)/workouts/new/_editor.test.tsx"`

Expected: PASS. If Radix Dialog focus behavior fails under jsdom, keep this as a component test and mock `@radix-ui/react-dialog` locally in the test with simple pass-through components. Do not move to Playwright unless jsdom cannot reliably open/select/submit the editor.

- [ ] **Step 2: Run all web UI tests added so far**

Run:

```powershell
pnpm.cmd --dir apps/web exec vitest run src/components/student-form.test.tsx src/components/sidebar.test.tsx src/components/top-bar.test.tsx "src/app/(app)/students/[id]/assessments/_form.test.tsx" "src/app/(app)/students/[id]/assessments/_chart.test.tsx" "src/app/(app)/workouts/new/_editor.test.tsx"
```

Expected: PASS.

- [ ] **Step 3: Commit workout editor UI tests**

```powershell
git add "apps/web/src/app/(app)/workouts/new/_editor.test.tsx"
git commit -m "test(web): cobre editor visual de treino"
```

### Task 4: Mobile Visual Test Harness

**Files:**
- Create: `apps/mobile/test/setup.ts`
- Modify: `apps/mobile/vitest.config.ts`
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add React Native Testing Library**

Run from repo root:

```powershell
pnpm.cmd --dir apps/mobile add -D @testing-library/react-native@^13.3.3 react-test-renderer@19.1.0
```

Expected: `apps/mobile/package.json` and `pnpm-lock.yaml` update.

- [ ] **Step 2: Add mobile test setup file**

Create `apps/mobile/test/setup.ts`:

```ts
import { cleanup } from '@testing-library/react-native';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
```

- [ ] **Step 3: Update mobile Vitest config**

Modify `apps/mobile/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
```

- [ ] **Step 4: Run existing mobile tests**

Run: `pnpm.cmd --dir apps/mobile test`

Expected: PASS with existing mobile tests.

- [ ] **Step 5: Commit mobile harness**

```powershell
git add apps/mobile/package.json pnpm-lock.yaml apps/mobile/test/setup.ts apps/mobile/vitest.config.ts
git commit -m "test(mobile): adiciona harness visual"
```

### Task 5: Mobile Today Workout, Progress and Profile Screen Tests

**Files:**
- Create: `apps/mobile/src/screens/today-workout.test.tsx`
- Create: `apps/mobile/src/screens/progress.test.tsx`
- Create: `apps/mobile/src/screens/profile.test.tsx`

- [ ] **Step 1: Write today workout screen tests**

Create `apps/mobile/src/screens/today-workout.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TodayWorkoutScreen } from './today-workout';

const authState = vi.hoisted(() => ({ userId: 'student-id' }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('../lib/auth-store', () => ({
  useAuth: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

function renderWithQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TodayWorkoutScreen />
    </QueryClientProvider>,
  );
}

describe('TodayWorkoutScreen', () => {
  it('renders empty state when there is no active workout', async () => {
    apiState.request.mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Sem treino ativo')).toBeTruthy();
    expect(screen.getByText(/professor publicar um treino ativo/i)).toBeTruthy();
  });

  it('renders loaded workout and stale offline badge', async () => {
    apiState.request
      .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
      .mockResolvedValueOnce({
        id: 'plan-id',
        name: 'Plano A',
        days: [
          {
            id: 'day-id',
            label: 'Treino A',
            exercises: [
              {
                id: 'we-1',
                sets: 3,
                reps: '10',
                restSeconds: 60,
                notes: null,
                exercise: { name: 'Supino', muscleGroup: 'chest' },
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Treino de hoje')).toBeTruthy();
    expect(screen.getByText('Plano A - Treino A')).toBeTruthy();
    expect(screen.getByText('Supino')).toBeTruthy();
    expect(screen.getByText('Iniciar treino')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Sem treino ativo')).toBeNull());
  });
});
```

Run: `pnpm.cmd --dir apps/mobile exec vitest run src/screens/today-workout.test.tsx`

Expected: PASS.

- [ ] **Step 2: Write progress screen tests**

Create `apps/mobile/src/screens/progress.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ProgressScreen } from './progress';

const authState = vi.hoisted(() => ({ userId: 'student-id' }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('../lib/auth-store', () => ({
  useAuth: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

function renderWithQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProgressScreen />
    </QueryClientProvider>,
  );
}

describe('ProgressScreen', () => {
  it('renders empty state', async () => {
    apiState.request.mockResolvedValueOnce({ items: [], total: 0 });

    renderWithQueryClient();

    expect(await screen.findByText('Nenhuma avaliacao registrada.')).toBeTruthy();
  });

  it('renders assessment cards', async () => {
    apiState.request.mockResolvedValueOnce({
      total: 1,
      items: [
        {
          id: 'assessment-id',
          date: '2026-06-12',
          weightKg: 80,
          bodyFatPct: 19,
          notes: 'Evoluiu',
        },
      ],
    });

    renderWithQueryClient();

    expect(await screen.findByText('2026-06-12')).toBeTruthy();
    expect(screen.getByText('Peso: 80 kg')).toBeTruthy();
    expect(screen.getByText('Gordura: 19%')).toBeTruthy();
    expect(screen.getByText('Evoluiu')).toBeTruthy();
  });
});
```

Run: `pnpm.cmd --dir apps/mobile exec vitest run src/screens/progress.test.tsx`

Expected: PASS.

- [ ] **Step 3: Write profile screen tests**

Create `apps/mobile/src/screens/profile.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { ProfileScreen } from './profile';

const routerState = vi.hoisted(() => ({ replace: vi.fn() }));
const authState = vi.hoisted(() => ({ clear: vi.fn() }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('../lib/auth-store', () => ({
  useAuth: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('expo-router', () => ({
  router: routerState,
}));

function renderWithQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileScreen />
    </QueryClientProvider>,
  );
}

describe('ProfileScreen', () => {
  it('renders profile data and logs out', async () => {
    const user = userEvent.setup();
    apiState.request.mockResolvedValueOnce({
      id: 'student-id',
      name: 'Ana Aluna',
      email: 'ana@example.com',
      role: 'student',
    });

    renderWithQueryClient();

    expect(await screen.findByText('Ana Aluna')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();

    await user.press(screen.getByText('Sair'));

    await waitFor(() => {
      expect(authState.clear).toHaveBeenCalledOnce();
      expect(routerState.replace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('renders fallback values when profile data is unavailable', async () => {
    apiState.request.mockResolvedValueOnce({});

    renderWithQueryClient();

    expect(await screen.findByText('Aluno')).toBeTruthy();
    expect(screen.getByText('Sem email cadastrado')).toBeTruthy();
  });
});
```

Run: `pnpm.cmd --dir apps/mobile exec vitest run src/screens/profile.test.tsx`

Expected: PASS.

- [ ] **Step 4: Run focused mobile read-only screen tests**

Run:

```powershell
pnpm.cmd --dir apps/mobile exec vitest run src/screens/today-workout.test.tsx src/screens/progress.test.tsx src/screens/profile.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit read-only mobile screen tests**

```powershell
git add apps/mobile/src/screens/today-workout.test.tsx apps/mobile/src/screens/progress.test.tsx apps/mobile/src/screens/profile.test.tsx
git commit -m "test(mobile): cobre telas visuais principais"
```

### Task 6: Mobile Interactive Screen Tests

**Files:**
- Create: `apps/mobile/src/screens/log-workout.test.tsx`
- Create: `apps/mobile/src/screens/new-assessment.test.tsx`

- [ ] **Step 1: Write log workout screen test**

Create `apps/mobile/src/screens/log-workout.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { LogWorkoutScreen } from './log-workout';

const routerState = vi.hoisted(() => ({ back: vi.fn(), dayId: 'day-id' }));
const authState = vi.hoisted(() => ({ userId: 'student-id' }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('expo-router', () => ({
  router: { back: routerState.back },
  useLocalSearchParams: () => ({ dayId: routerState.dayId }),
}));

vi.mock('../lib/auth-store', () => ({
  useAuth: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));

function renderWithQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LogWorkoutScreen />
    </QueryClientProvider>,
  );
}

describe('LogWorkoutScreen', () => {
  it('renders unavailable state when loading fails', async () => {
    apiState.request.mockResolvedValueOnce({ items: [] });

    renderWithQueryClient();

    expect(await screen.findByText('Treino indisponivel')).toBeTruthy();
  });

  it('edits sets and finishes workout', async () => {
    const user = userEvent.setup();
    apiState.request
      .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
      .mockResolvedValueOnce({
        id: 'plan-id',
        days: [
          {
            id: 'day-id',
            label: 'Treino A',
            exercises: [
              {
                id: 'we-1',
                sets: 1,
                reps: '10',
                loadKg: 40,
                exercise: { name: 'Supino' },
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({ id: 'log-id' })
      .mockResolvedValueOnce(undefined);

    renderWithQueryClient();

    expect(await screen.findByText('Treino A')).toBeTruthy();
    await user.type(screen.getByPlaceholderText('reps'), '12');
    await user.type(screen.getByPlaceholderText('kg'), '42');
    await user.press(screen.getByText('Finalizar treino'));

    await waitFor(() => expect(routerState.back).toHaveBeenCalledOnce());
  });
});
```

Run: `pnpm.cmd --dir apps/mobile exec vitest run src/screens/log-workout.test.tsx`

Expected: PASS.

- [ ] **Step 2: Write new assessment screen test**

Create `apps/mobile/src/screens/new-assessment.test.tsx`:

```tsx
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { NewAssessmentScreen } from './new-assessment';

const routerState = vi.hoisted(() => ({ back: vi.fn() }));
const authState = vi.hoisted(() => ({ userId: 'student-id' }));
const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const queryState = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
const pickerState = vi.hoisted(() => ({ launchImageLibraryAsync: vi.fn() }));

vi.mock('expo-router', () => ({
  router: routerState,
}));

vi.mock('expo-image-picker', () => pickerState);

vi.mock('../lib/auth-store', () => ({
  useAuth: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('../lib/query-client', () => ({
  queryClient: queryState,
}));

vi.mock('../lib/uploads', () => ({
  uploadAssessmentPhoto: vi.fn().mockResolvedValue('https://cdn.test/photo.jpg'),
}));

describe('NewAssessmentScreen', () => {
  it('selects a supported photo and submits assessment', async () => {
    const user = userEvent.setup();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg' }],
    });
    apiState.request.mockResolvedValueOnce(undefined);
    queryState.invalidateQueries.mockResolvedValueOnce(undefined);

    render(<NewAssessmentScreen />);

    await user.type(screen.getByPlaceholderText('Peso (kg)'), '80');
    await user.type(screen.getByPlaceholderText('Gordura corporal (%)'), '19');
    await user.type(screen.getByPlaceholderText('Notas'), 'Evoluiu');
    await user.press(screen.getByText('Adicionar foto'));

    expect(await screen.findByText('Foto selecionada')).toBeTruthy();

    await user.press(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(apiState.request).toHaveBeenCalledWith('/students/student-id/assessments', expect.any(Object));
      expect(queryState.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['assessments', 'student-id'] });
      expect(routerState.back).toHaveBeenCalledOnce();
    });
  });
});
```

Run: `pnpm.cmd --dir apps/mobile exec vitest run src/screens/new-assessment.test.tsx`

Expected: PASS.

- [ ] **Step 3: Run focused mobile interactive screen tests**

Run:

```powershell
pnpm.cmd --dir apps/mobile exec vitest run src/screens/log-workout.test.tsx src/screens/new-assessment.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit interactive mobile screen tests**

```powershell
git add apps/mobile/src/screens/log-workout.test.tsx apps/mobile/src/screens/new-assessment.test.tsx
git commit -m "test(mobile): cobre interacoes visuais"
```

### Task 7: UI Coverage Scripts and Local Docs

**Files:**
- Create: `apps/web/vitest.ui-coverage.config.ts`
- Create: `apps/mobile/vitest.ui-coverage.config.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/mobile/package.json`
- Modify: `apps/web/AGENTS.md`
- Modify: `apps/mobile/AGENTS.md`

- [ ] **Step 1: Add web UI coverage config**

Create `apps/web/vitest.ui-coverage.config.ts`:

```ts
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: [
          'src/components/student-form.tsx',
          'src/components/onboarding-wizard.tsx',
          'src/components/stat-card.tsx',
          'src/components/sidebar.tsx',
          'src/components/top-bar.tsx',
          'src/app/(app)/students/_search.tsx',
          'src/app/(app)/students/[id]/assessments/_form.tsx',
          'src/app/(app)/students/[id]/assessments/_chart.tsx',
          'src/app/(app)/workouts/new/_editor.tsx',
        ],
        exclude: ['src/**/*.test.{ts,tsx}', 'test/**'],
        thresholds: {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85,
        },
      },
    },
  }),
);
```

- [ ] **Step 2: Add mobile UI coverage config**

Create `apps/mobile/vitest.ui-coverage.config.ts`:

```ts
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        include: [
          'src/screens/today-workout.tsx',
          'src/screens/progress.tsx',
          'src/screens/profile.tsx',
          'src/screens/log-workout.tsx',
          'src/screens/new-assessment.tsx',
        ],
        exclude: ['src/**/*.test.{ts,tsx}', 'test/**'],
        thresholds: {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85,
        },
      },
    },
  }),
);
```

- [ ] **Step 3: Add package scripts**

Modify `apps/web/package.json` scripts:

```json
"test:coverage:ui": "vitest run --config vitest.ui-coverage.config.ts --coverage"
```

Modify `apps/mobile/package.json` scripts:

```json
"test:coverage:ui": "vitest run --config vitest.ui-coverage.config.ts --coverage"
```

- [ ] **Step 4: Document local UI coverage rules**

Append one bullet to `apps/web/AGENTS.md` under `## Piso SOLID local`:

```md
- Cobertura visual critica deve ser medida por `pnpm.cmd --dir apps/web test:coverage:ui`; use Testing Library/jsdom primeiro e Playwright somente para fluxo web que dependa de navegador real.
```

Append one bullet to `apps/mobile/AGENTS.md` under `## Piso SOLID local`:

```md
- Cobertura visual critica deve ser medida por `pnpm.cmd --dir apps/mobile test:coverage:ui`; screens devem usar React Native Testing Library com mocks de router, API, storage e dependencias nativas.
```

- [ ] **Step 5: Run UI coverage gates**

Run:

```powershell
pnpm.cmd --dir apps/web test:coverage:ui
pnpm.cmd --dir apps/mobile test:coverage:ui
```

Expected: PASS with statements, branches, functions and lines each at least 85%.

If one UI gate misses only branches in a file with real UI behavior already covered, add one targeted test for that visible branch. Do not remove the file from `include` unless the file is outside the critical UI set in this plan.

- [ ] **Step 6: Verify docs constraints**

Run:

```powershell
Get-Content apps/web/AGENTS.md | Measure-Object -Line
Get-Content apps/mobile/AGENTS.md | Measure-Object -Line
rg -n "[^\\x00-\\x7F]" apps/web/AGENTS.md apps/mobile/AGENTS.md
```

Expected: both AGENTS files remain below 200 lines; `rg` returns no matches.

- [ ] **Step 7: Commit UI coverage configs and docs**

```powershell
git add apps/web/vitest.ui-coverage.config.ts apps/mobile/vitest.ui-coverage.config.ts apps/web/package.json apps/mobile/package.json apps/web/AGENTS.md apps/mobile/AGENTS.md
git commit -m "test: configura cobertura visual"
```

### Task 8: Final Verification

**Files:**
- No file changes expected unless verification exposes a concrete issue.

- [ ] **Step 1: Run web verification**

Run:

```powershell
pnpm.cmd --dir apps/web test
pnpm.cmd --dir apps/web test:coverage:core
pnpm.cmd --dir apps/web test:coverage:ui
pnpm.cmd --dir apps/web test:coverage
pnpm.cmd --dir apps/web typecheck
```

Expected: all commands PASS. `test:coverage:core` and `test:coverage:ui` must both meet configured 85% thresholds.

- [ ] **Step 2: Run mobile verification**

Run:

```powershell
pnpm.cmd --dir apps/mobile test
pnpm.cmd --dir apps/mobile test:coverage:core
pnpm.cmd --dir apps/mobile test:coverage:ui
pnpm.cmd --dir apps/mobile test:coverage
pnpm.cmd --dir apps/mobile typecheck
```

Expected: all commands PASS. `test:coverage:core` and `test:coverage:ui` must both meet configured 85% thresholds.

- [ ] **Step 3: Run Biome**

Run:

```powershell
pnpm.cmd exec biome check apps/web apps/mobile
```

Expected: PASS.

- [ ] **Step 4: Inspect git state**

Run:

```powershell
git status --short
git diff --stat
```

Expected: working tree clean after commits. If verification required fixes, commit them:

```powershell
git add apps/web apps/mobile pnpm-lock.yaml
git commit -m "chore: ajusta verificacao de cobertura visual"
```

---

## Self-Review

- Spec coverage: covers web visual tests, mobile visual harness, blocking UI coverage gates, non-blocking broad coverage, Playwright policy and final verification.
- Scope control: no broad E2E suite, no full 85% global UI requirement, no visual redesign.
- Type consistency: test files use current component/screen names and existing scripts/config structure.
- Verification: includes focused tests, full tests, core coverage, UI coverage, broad coverage, typecheck and Biome.
- Specificity check: implementation tasks include exact files, snippets, commands and expected outcomes.
