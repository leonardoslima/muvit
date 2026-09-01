# MUV-17 — Home e gestão de alunos do professor no mobile Implementation Plan

> **Execução registrada em 2026-09-01:** os passos de implementação, validação determinística e revisão de escopo foram concluídos e marcados. A validação manual do Step 9 foi iniciada no emulador Android, com evidências da home, carteira, busca sem resultados e abertura de detalhes, mas permaneceu parcial porque o agente não entregou a cápsula final com todos os cenários; o passo continua aberto.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar os placeholders do shell `trainer` em uma home funcional, uma carteira pesquisável/paginada de alunos vinculados e um detalhe somente leitura, usando exclusivamente os contratos já existentes da API.

**Architecture:** A camada pura `src/application/trainer/trainer-data.ts` encapsulará `/trainer/summary`, `/students` e `/students/:id`, sem React Native ou Expo Router. As screens usarão `useApiClient` + TanStack Query com chaves prefixadas por `trainer`; components específicos cuidarão de métrica, status e linha de aluno. A tab Alunos passará a ser um segmento com Stack interno para suportar `/trainer/students/:studentId` sem criar nova tab e sem antecipar MUV-18/MUV-19.

**Tech Stack:** Expo Router 6, Expo 54, React Native 0.81, React 19, TypeScript estrito, TanStack Query 5, Better Auth, Zod 3, Vitest 4, React Native Testing Library, Biome e foundation de `PRODUCT.md`/`DESIGN.md`.

**Spec:** `docs/superpowers/specs/2026-08-31-muv-17-trainer-home-students-design.md`

## Global Constraints

- Não alterar API, banco, migrations, validators, autenticação, permissões ou payloads.
- Usar somente `GET /trainer/summary`, `GET /students` e `GET /students/:id`.
- Nunca enviar `trainerId` pelo mobile; o backend resolve ownership por `req.identity.profileId`.
- Não usar o ID do usuário Better Auth como `profileId`.
- Não criar CRUD de aluno.
- Não consultar avaliações ou treinos nesta issue.
- Não criar rotas de MUV-18/MUV-19 nem destinos mortos.
- Não montar fila offline, journal, workout session storage, push registration ou rotas `/students/me/*` para `trainer`.
- O cache de domínio do treinador será apenas TanStack Query em memória, com chaves iniciadas por `trainer`.
- Busca de alunos será server-side por nome, aplicada explicitamente pelo usuário.
- Paginação usará `limit=25` e `offset`, com ação `Carregar mais`.
- `Screen`, `ScreenHeader`, `Card`, `Field`, `StatePanel`, `InlineMessage`, `AppButton` e tokens de `src/lib/styles.ts` são a foundation obrigatória.
- Não adicionar dependências.
- Texto visível e documentação permanecem em pt-BR com UTF-8 literal.
- Módulos em `src/application` não importam `react-native`, `expo-router`, screens ou components.
- Todo aluno fora do escopo do treinador deve continuar indistinguível de um ID inexistente na UI.
- A tab bar do treinador continua expondo somente Início, Alunos e Perfil.
- O plano pode conter checkpoints de commit para a futura execução; nenhum commit faz parte da preparação desta documentação.

## Mapa de arquivos e responsabilidades

### Criar

- `apps/mobile/src/application/trainer/trainer-data.ts` — tipos e requester puro para summary/list/detail.
- `apps/mobile/src/application/trainer/trainer-data.test.ts` — contrato dos paths, query string e signal.
- `apps/mobile/src/components/trainer/trainer-metric-card.tsx` — card de indicador da home.
- `apps/mobile/src/components/trainer/student-status-badge.tsx` — label semântico de `active | paused | inactive`.
- `apps/mobile/src/components/trainer/student-list-item.tsx` — card/Pressable de aluno.
- `apps/mobile/src/screens/trainer-home.tsx` — query e estados da home.
- `apps/mobile/src/screens/trainer-home.test.tsx` — comportamento da home.
- `apps/mobile/src/screens/trainer-students.tsx` — busca, paginação, refresh e lista.
- `apps/mobile/src/screens/trainer-students.test.tsx` — comportamento da carteira.
- `apps/mobile/src/screens/trainer-student-detail.tsx` — query e detalhe somente leitura.
- `apps/mobile/src/screens/trainer-student-detail.test.tsx` — estados e conteúdo do detalhe.
- `apps/mobile/app/(trainer)/trainer/students/_layout.tsx` — Stack interno da tab Alunos.
- `apps/mobile/app/(trainer)/trainer/students/[studentId].tsx` — entrypoint do detalhe.

### Mover/alterar

- `apps/mobile/app/(trainer)/trainer/students.tsx` → `apps/mobile/app/(trainer)/trainer/students/index.tsx`.
- `apps/mobile/app/(trainer)/trainer/index.tsx` — delegar para `TrainerHomeScreen`.
- `apps/mobile/src/__tests__/trainer-screens.test.tsx` — remover expectativas dos placeholders e manter regressão do Perfil.
- `apps/mobile/src/__tests__/trainer-tabs-layout.test.tsx` — verificar sem mudar a expectativa pública de exatamente três tabs.

### Remover

- `apps/mobile/src/screens/trainer-section.tsx`.
- `apps/mobile/src/screens/trainer-section.test.tsx`.

---

### Task 1: Encapsular os contratos existentes do treinador

**Files:**
- Create: `apps/mobile/src/application/trainer/trainer-data.ts`
- Test: `apps/mobile/src/application/trainer/trainer-data.test.ts`

**Interfaces:**
- Consumes: `ApiRequester` de `apps/mobile/src/lib/api.ts` e `studentSchema` de `@muvit/validators`.
- Produces: `TrainerSummary`, `TrainerStudent`, `TrainerStudentsPage`, `TRAINER_STUDENTS_PAGE_SIZE`, `getTrainerSummary`, `listTrainerStudents` e `getTrainerStudent`.
- Nenhuma função conhece React Query; ela apenas monta request e retorna o payload.

- [x] **Step 1: Escrever testes falhando para os três requests**

Criar `trainer-data.test.ts` com um requester fake:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  TRAINER_STUDENTS_PAGE_SIZE,
  getTrainerStudent,
  getTrainerSummary,
  listTrainerStudents,
} from './trainer-data';

describe('trainer-data', () => {
  it('carrega o resumo do treinador sem enviar ownership pelo cliente', async () => {
    const request = vi.fn().mockResolvedValue({
      students: { total: 3, active: 2, paused: 1, inactive: 0, newThisWeek: 1 },
      workouts: { activePlans: 2 },
      assessments: { last30d: 4 },
    });

    await getTrainerSummary({ request });

    expect(request).toHaveBeenCalledWith('/trainer/summary', { signal: undefined });
  });

  it('lista alunos com paginação e sem q quando a busca está vazia', async () => {
    const request = vi.fn().mockResolvedValue({ items: [], total: 0 });

    await listTrainerStudents(
      { request },
      { q: '   ', limit: TRAINER_STUDENTS_PAGE_SIZE, offset: 25 },
    );

    expect(request).toHaveBeenCalledWith('/students?limit=25&offset=25', {
      signal: undefined,
    });
  });

  it('normaliza e codifica a busca por nome', async () => {
    const request = vi.fn().mockResolvedValue({ items: [], total: 0 });

    await listTrainerStudents(
      { request },
      { q: '  Ana Júlia  ', limit: 25, offset: 0 },
    );

    expect(request).toHaveBeenCalledWith(
      '/students?q=Ana%20J%C3%BAlia&limit=25&offset=0',
      { signal: undefined },
    );
  });

  it('carrega um aluno pelo id e encaminha o signal', async () => {
    const request = vi.fn().mockResolvedValue({ id: 'student-id' });
    const controller = new AbortController();

    await getTrainerStudent({ request }, 'student-id', controller.signal);

    expect(request).toHaveBeenCalledWith('/students/student-id', {
      signal: controller.signal,
    });
  });
});
```

- [x] **Step 2: Rodar o teste para confirmar a falha**

Run:

```powershell
pnpm.cmd --dir apps/mobile test src/application/trainer/trainer-data.test.ts
```

Expected: FAIL porque `./trainer-data` ainda não existe.

- [x] **Step 3: Implementar o requester mínimo**

Criar `trainer-data.ts`:

```ts
import type { studentSchema } from '@muvit/validators';
import type { z } from 'zod';
import type { ApiRequester } from '../../lib/api';

export const TRAINER_STUDENTS_PAGE_SIZE = 25;

export type TrainerSummary = {
  students: {
    total: number;
    active: number;
    paused: number;
    inactive: number;
    newThisWeek: number;
  };
  workouts: {
    activePlans: number;
  };
  assessments: {
    last30d: number;
  };
};

export type TrainerStudent = z.infer<typeof studentSchema>;

export type TrainerStudentsPage = {
  items: TrainerStudent[];
  total: number;
};

export type ListTrainerStudentsInput = {
  q?: string;
  limit: number;
  offset: number;
  signal?: AbortSignal;
};

export function getTrainerSummary(
  api: ApiRequester,
  signal?: AbortSignal,
): Promise<TrainerSummary> {
  return api.request<TrainerSummary>('/trainer/summary', { signal });
}

export function listTrainerStudents(
  api: ApiRequester,
  input: ListTrainerStudentsInput,
): Promise<TrainerStudentsPage> {
  const normalizedQuery = input.q?.trim();
  const query = [
    normalizedQuery ? `q=${encodeURIComponent(normalizedQuery)}` : null,
    `limit=${input.limit}`,
    `offset=${input.offset}`,
  ]
    .filter((value): value is string => value !== null)
    .join('&');

  return api.request<TrainerStudentsPage>(`/students?${query}`, {
    signal: input.signal,
  });
}

export function getTrainerStudent(
  api: ApiRequester,
  studentId: string,
  signal?: AbortSignal,
): Promise<TrainerStudent> {
  return api.request<TrainerStudent>(`/students/${encodeURIComponent(studentId)}`, {
    signal,
  });
}
```

Não adicionar `trainerId`, status filter, assessment ou workout path.

- [x] **Step 4: Rodar o teste direcionado**

Run:

```powershell
pnpm.cmd --dir apps/mobile test src/application/trainer/trainer-data.test.ts
```

Expected: PASS.

- [x] **Step 5: Rodar o core coverage antes de avançar**

Run:

```powershell
pnpm.cmd --dir apps/mobile test:coverage:core
```

Expected: PASS e o núcleo medido continua >= 85%.

- [x] **Step 6: Commitar a unidade na futura execução**

```powershell
git add -- apps/mobile/src/application/trainer/trainer-data.ts apps/mobile/src/application/trainer/trainer-data.test.ts
git commit -m "feat(mobile): adiciona dados do trainer"
```

---

### Task 2: Implementar a home funcional do treinador

**Files:**
- Create: `apps/mobile/src/components/trainer/trainer-metric-card.tsx`
- Create: `apps/mobile/src/screens/trainer-home.tsx`
- Test: `apps/mobile/src/screens/trainer-home.test.tsx`
- Modify: `apps/mobile/app/(trainer)/trainer/index.tsx`

**Interfaces:**
- Consumes: `getTrainerSummary(api, signal)`.
- Produces: `TrainerHomeScreen`.
- Query key: `['trainer', 'summary']`.
- `TrainerMetricCard` recebe `{ label: string; value: number; description?: string }`.
- A ação `Ver alunos` navega para `/trainer/students`.

- [x] **Step 1: Escrever testes falhando da home**

O teste deve usar um `QueryClientProvider` local, mockar `useApiClient` e simplificar `Link` como os testes existentes fazem. Criar a infraestrutura de teste explicitamente:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainerHomeScreen } from './trainer-home';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'View',
}));

function renderTrainerHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TrainerHomeScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiState.request.mockReset();
});
```

Cobrir estes casos:

```tsx
it('mostra loading enquanto o resumo está pendente', () => {
  apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));

  renderTrainerHome();

  expect(screen.getByText('Carregando visão geral')).toBeTruthy();
});

it('permite retry após erro inicial', async () => {
  const user = userEvent.setup();
  apiState.request
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      students: { total: 0, active: 0, paused: 0, inactive: 0, newThisWeek: 0 },
      workouts: { activePlans: 0 },
      assessments: { last30d: 0 },
    });

  renderTrainerHome();

  await user.press(await screen.findByRole('button', { name: 'Tentar novamente' }));

  expect(await screen.findByText('Nenhum aluno vinculado')).toBeTruthy();
});

it('renderiza os indicadores retornados pela API', async () => {
  apiState.request.mockResolvedValueOnce({
    students: { total: 12, active: 9, paused: 2, inactive: 1, newThisWeek: 3 },
    workouts: { activePlans: 8 },
    assessments: { last30d: 6 },
  });

  renderTrainerHome();

  expect(await screen.findByText('9')).toBeTruthy();
  expect(screen.getByText('12 vinculados')).toBeTruthy();
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.getByText('8')).toBeTruthy();
  expect(screen.getByText('6')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Ver alunos' })).toBeTruthy();
});
```

Adicionar o caso de refetch falhando depois de dados válidos com o comportamento preservado:

```tsx
it('preserva os indicadores quando a atualização falha', async () => {
  const user = userEvent.setup();
  apiState.request
    .mockResolvedValueOnce({
      students: { total: 12, active: 9, paused: 2, inactive: 1, newThisWeek: 3 },
      workouts: { activePlans: 8 },
      assessments: { last30d: 6 },
    })
    .mockRejectedValueOnce(new Error('offline'));

  renderTrainerHome();

  expect(await screen.findByText('12 vinculados')).toBeTruthy();
  await user.press(screen.getByRole('button', { name: 'Atualizar' }));

  expect(await screen.findByText('Não foi possível atualizar a visão geral.')).toBeTruthy();
  expect(screen.getByText('12 vinculados')).toBeTruthy();
});
```

- [x] **Step 2: Rodar o teste para confirmar a falha**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-home.test.tsx
```

Expected: FAIL porque `TrainerHomeScreen` ainda não existe.

- [x] **Step 3: Criar `TrainerMetricCard`**

Implementar apenas visualização:

```tsx
import { StyleSheet, Text } from 'react-native';
import { colors, sharedStyles, spacing, typography } from '../../lib/styles';
import { Card } from '../ui/card';

export type TrainerMetricCardProps = {
  label: string;
  value: number;
  description?: string;
};

export function TrainerMetricCard({
  description,
  label,
  value,
}: TrainerMetricCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={sharedStyles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {description ? <Text style={sharedStyles.subtitle}>{description}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    minWidth: 140,
  },
  value: {
    color: colors.ink,
    ...typography.headline,
    marginTop: spacing.xs,
  },
});
```

Não criar cor, sombra ou tipografia local fora dos tokens.

- [x] **Step 4: Implementar `TrainerHomeScreen`**

Estrutura esperada:

```tsx
const query = useQuery({
  queryKey: ['trainer', 'summary'],
  queryFn: ({ signal }) => getTrainerSummary(api, signal),
});

if (query.isPending) {
  return (
    <Screen style={styles.centered}>
      <StatePanel
        description="Estamos carregando os indicadores da sua operação."
        title="Carregando visão geral"
        tone="loading"
      />
    </Screen>
  );
}

if (!query.data) {
  return (
    <Screen style={styles.centered}>
      <StatePanel
        actionLabel="Tentar novamente"
        description="Verifique sua conexão e tente novamente."
        onAction={() => void query.refetch()}
        title="Não foi possível carregar a visão geral"
        tone="error"
      />
    </Screen>
  );
}

const summary = query.data;

return (
  <Screen scroll contentContainerStyle={styles.content}>
    <ScreenHeader
      subtitle="Acompanhe os principais sinais da sua carteira."
      title="Início"
    />

    {summary.students.total === 0 ? (
      <StatePanel
        description="Nenhum aluno vinculado para acompanhar no momento."
        title="Nenhum aluno vinculado"
        tone="empty"
      />
    ) : (
      <>
        <View style={styles.metrics}>
          <TrainerMetricCard
            description={`${summary.students.total} vinculados`}
            label="Alunos ativos"
            value={summary.students.active}
          />
          <TrainerMetricCard
            label="Novos na semana"
            value={summary.students.newThisWeek}
          />
          <TrainerMetricCard
            label="Planos ativos"
            value={summary.workouts.activePlans}
          />
          <TrainerMetricCard
            label="Avaliações em 30 dias"
            value={summary.assessments.last30d}
          />
        </View>
        <Text style={sharedStyles.subtitle}>
          {summary.students.paused} pausados • {summary.students.inactive} inativos
        </Text>
      </>
    )}

    {query.isRefetchError ? (
      <InlineMessage message="Não foi possível atualizar a visão geral." tone="error" />
    ) : null}

    <AppButton
      disabled={query.isRefetching}
      label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
      onPress={() => void query.refetch()}
      variant="secondary"
    />

    <Link asChild href="/trainer/students">
      <AppButton label="Ver alunos" onPress={() => undefined} />
    </Link>
  </Screen>
);
```

Os estilos locais da screen usam apenas `spacing`, `colors`, `typography` e `sharedStyles`; `styles.metrics` usa `flexDirection: 'row'`, `flexWrap: 'wrap'` e `gap: spacing.md` para acomodar telas pequenas.

- [x] **Step 5: Trocar o placeholder da rota**

`apps/mobile/app/(trainer)/trainer/index.tsx` deve virar somente:

```tsx
import { TrainerHomeScreen } from '../../../src/screens/trainer-home';

export default function TrainerHomeRoute() {
  return <TrainerHomeScreen />;
}
```

- [x] **Step 6: Rodar testes da home**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-home.test.tsx
```

Expected: PASS.

- [x] **Step 7: Rodar typecheck focado no workspace**

```powershell
pnpm.cmd --dir apps/mobile typecheck
```

Expected: PASS.

- [x] **Step 8: Commitar a unidade na futura execução**

```powershell
git add -- apps/mobile/src/components/trainer/trainer-metric-card.tsx apps/mobile/src/screens/trainer-home.tsx apps/mobile/src/screens/trainer-home.test.tsx apps/mobile/app/'(trainer)'/trainer/index.tsx
git commit -m "feat(mobile): implementa home do trainer"
```

---

### Task 3: Criar os components de aluno usados na lista e no detalhe

**Files:**
- Create: `apps/mobile/src/components/trainer/student-status-badge.tsx`
- Create: `apps/mobile/src/components/trainer/student-list-item.tsx`
- Test: `apps/mobile/src/components/trainer/student-list-item.test.tsx`

**Interfaces:**
- `StudentStatusBadge` recebe `status: TrainerStudent['status']`.
- `StudentListItem` recebe `student: TrainerStudent` e `onPress: () => void`.
- A linha mostra nome, contato preferencial e status.
- A linha é acessível como botão.

- [x] **Step 1: Escrever teste falhando do item de aluno**

```tsx
it('exibe nome, contato, status e abre o aluno', async () => {
  const user = userEvent.setup();
  const onPress = vi.fn();

  render(
    <StudentListItem
      onPress={onPress}
      student={{
        id: 'student-1',
        trainerId: 'trainer-1',
        isIndependent: false,
        name: 'Ana Júlia Souza',
        email: 'ana@example.com',
        phone: '27999999999',
        birthDate: null,
        gender: null,
        goals: null,
        restrictions: null,
        status: 'active',
        avatarUrl: null,
        expoPushToken: null,
        createdAt: '2026-08-31T12:00:00.000Z',
      }}
    />,
  );

  expect(screen.getByText('AJ')).toBeTruthy();
  expect(screen.getByText('Ana Júlia Souza')).toBeTruthy();
  expect(screen.getByText('ana@example.com')).toBeTruthy();
  expect(screen.getByText('Ativo')).toBeTruthy();

  await user.press(screen.getByRole('button', { name: 'Abrir Ana Júlia Souza' }));
  expect(onPress).toHaveBeenCalledOnce();
});
```

Cobrir os demais estados com testes concretos:

```tsx
it.each([
  ['paused', 'Pausado'],
  ['inactive', 'Inativo'],
] as const)('traduz status %s para %s', (status, label) => {
  render(
    <StudentListItem
      onPress={() => undefined}
      student={{
        id: 'student-1',
        trainerId: 'trainer-1',
        isIndependent: false,
        name: 'Ana Lima',
        email: null,
        phone: '27999999999',
        birthDate: null,
        gender: null,
        goals: null,
        restrictions: null,
        status,
        avatarUrl: null,
        expoPushToken: null,
        createdAt: '2026-08-31T12:00:00.000Z',
      }}
    />,
  );

  expect(screen.getByText(label)).toBeTruthy();
  expect(screen.getByText('27999999999')).toBeTruthy();
});

it('usa fallback quando o aluno não possui contato', () => {
  render(
    <StudentListItem
      onPress={() => undefined}
      student={{
        id: 'student-2',
        trainerId: 'trainer-1',
        isIndependent: false,
        name: 'Bruno Costa',
        email: null,
        phone: null,
        birthDate: null,
        gender: null,
        goals: null,
        restrictions: null,
        status: 'inactive',
        avatarUrl: null,
        expoPushToken: null,
        createdAt: '2026-08-31T12:00:00.000Z',
      }}
    />,
  );

  expect(screen.getByText('Sem contato cadastrado')).toBeTruthy();
});
```

- [x] **Step 2: Rodar o teste para confirmar a falha**

```powershell
pnpm.cmd --dir apps/mobile test src/components/trainer/student-list-item.test.tsx
```

Expected: FAIL por módulos ausentes.

- [x] **Step 3: Implementar `StudentStatusBadge`**

Mapeamento obrigatório:

```ts
const statusCopy = {
  active: 'Ativo',
  paused: 'Pausado',
  inactive: 'Inativo',
} as const;
```

Estilo:

- `active`: `primarySoft` + `primaryText`;
- `paused`: `warningSoft` + `warningText`;
- `inactive`: `background` + `muted` + borda `line`;
- label sempre visível;
- pill usando `radii.pill`.

- [x] **Step 4: Implementar `StudentListItem`**

Estrutura:

```tsx
<Pressable
  accessibilityLabel={`Abrir ${student.name}`}
  accessibilityRole="button"
  onPress={onPress}
  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
>
  <Card>
    <View style={styles.row}>
      <View
        accessibilityLabel={`Iniciais de ${student.name}`}
        style={styles.avatar}
      >
        <Text style={styles.avatarText}>{getInitials(student.name)}</Text>
      </View>

      <View style={styles.copy}>
        <Text style={styles.name}>{student.name}</Text>
        <Text style={sharedStyles.subtitle}>{resolveContact(student)}</Text>
      </View>

      <StudentStatusBadge status={student.status} />
    </View>
  </Card>
</Pressable>
```

`getInitials` usa no máximo as duas primeiras palavras e fallback `AL`. `resolveContact` prefere email, depois telefone.

- [x] **Step 5: Rodar testes dos components**

```powershell
pnpm.cmd --dir apps/mobile test src/components/trainer/student-list-item.test.tsx
```

Expected: PASS.

- [x] **Step 6: Commitar a unidade na futura execução**

```powershell
git add -- apps/mobile/src/components/trainer/student-status-badge.tsx apps/mobile/src/components/trainer/student-list-item.tsx apps/mobile/src/components/trainer/student-list-item.test.tsx
git commit -m "feat(mobile): adiciona cards de alunos do trainer"
```

---

### Task 4: Implementar a lista, busca e paginação de alunos

**Files:**
- Create: `apps/mobile/src/screens/trainer-students.tsx`
- Test: `apps/mobile/src/screens/trainer-students.test.tsx`
- Create: `apps/mobile/app/(trainer)/trainer/students/_layout.tsx`
- Move: `apps/mobile/app/(trainer)/trainer/students.tsx` → `apps/mobile/app/(trainer)/trainer/students/index.tsx`
- Verify: `apps/mobile/src/__tests__/trainer-tabs-layout.test.tsx` — a expectativa pública continua exatamente três tabs.

**Interfaces:**
- Consumes: `listTrainerStudents`.
- Query key: `['trainer', 'students', appliedSearch]`.
- Page size: `TRAINER_STUDENTS_PAGE_SIZE`.
- `searchInput` é edição local; `appliedSearch` define a query ativa.
- Cada `StudentListItem` abre `/trainer/students/:studentId`.
- `students/_layout.tsx` produz um Stack sem header nativo.

- [x] **Step 1: Escrever testes falhando para lista e busca**

Criar o setup do teste com fixture, Query Client e router explícitos:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrainerStudent } from '../application/trainer/trainer-data';
import { TrainerStudentsScreen } from './trainer-students';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('../lib/use-api', () => ({ useApiClient: () => apiState }));
vi.mock('expo-router', () => ({ router: routerState }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));

function studentFixture(overrides: Partial<TrainerStudent> = {}): TrainerStudent {
  return {
    id: 'student-1',
    trainerId: 'trainer-1',
    isIndependent: false,
    name: 'Ana Lima',
    email: 'ana@example.com',
    phone: '27999999999',
    birthDate: null,
    gender: null,
    goals: null,
    restrictions: null,
    status: 'active',
    avatarUrl: null,
    expoPushToken: null,
    createdAt: '2026-08-31T12:00:00.000Z',
    ...overrides,
  };
}

function renderTrainerStudents() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TrainerStudentsScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiState.request.mockReset();
  routerState.push.mockReset();
});
```

Casos mínimos:

```tsx
it('carrega a carteira e abre o detalhe', async () => {
  const user = userEvent.setup();
  apiState.request.mockResolvedValueOnce({
    total: 1,
    items: [studentFixture({ id: 'student-1', name: 'Ana Lima' })],
  });

  renderTrainerStudents();

  expect(await screen.findByText('Ana Lima')).toBeTruthy();
  await user.press(screen.getByRole('button', { name: 'Abrir Ana Lima' }));

  expect(routerState.push).toHaveBeenCalledWith({
    pathname: '/trainer/students/[studentId]',
    params: { studentId: 'student-1' },
  });
});

it('só aplica a busca quando o usuário submete', async () => {
  const user = userEvent.setup();
  apiState.request
    .mockResolvedValueOnce({ total: 0, items: [] })
    .mockResolvedValueOnce({ total: 0, items: [] });

  renderTrainerStudents();

  await screen.findByText('Nenhum aluno vinculado');
  await user.type(screen.getByLabelText('Buscar aluno'), 'Ana Júlia');

  expect(apiState.request).toHaveBeenCalledTimes(1);

  await user.press(screen.getByRole('button', { name: 'Buscar' }));

  await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
  expect(apiState.request).toHaveBeenLastCalledWith(
    '/students?q=Ana%20J%C3%BAlia&limit=25&offset=0',
    expect.any(Object),
  );
});
```

Cobrir os demais comportamentos com testes executáveis:

```tsx
it('mostra loading durante a carga inicial', () => {
  apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));
  renderTrainerStudents();
  expect(screen.getByText('Carregando alunos')).toBeTruthy();
});

it('permite retry depois de erro inicial', async () => {
  const user = userEvent.setup();
  apiState.request
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ total: 0, items: [] });

  renderTrainerStudents();

  await user.press(await screen.findByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Nenhum aluno vinculado')).toBeTruthy();
});

it('diferencia busca sem resultado e permite limpar', async () => {
  const user = userEvent.setup();
  apiState.request
    .mockResolvedValueOnce({ total: 1, items: [studentFixture()] })
    .mockResolvedValueOnce({ total: 0, items: [] })
    .mockResolvedValueOnce({ total: 1, items: [studentFixture()] });

  renderTrainerStudents();
  expect(await screen.findByText('Ana Lima')).toBeTruthy();

  await user.type(screen.getByLabelText('Buscar aluno'), 'Ninguém');
  await user.press(screen.getByRole('button', { name: 'Buscar' }));
  expect(await screen.findByText('Nenhum aluno encontrado')).toBeTruthy();

  await user.press(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(await screen.findByText('Ana Lima')).toBeTruthy();
});

it('mantém a busca aplicada ao atualizar', async () => {
  const user = userEvent.setup();
  apiState.request
    .mockResolvedValueOnce({ total: 0, items: [] })
    .mockResolvedValueOnce({ total: 1, items: [studentFixture()] })
    .mockResolvedValueOnce({ total: 1, items: [studentFixture()] });

  renderTrainerStudents();
  await screen.findByText('Nenhum aluno vinculado');
  await user.type(screen.getByLabelText('Buscar aluno'), 'Ana');
  await user.press(screen.getByRole('button', { name: 'Buscar' }));
  expect(await screen.findByText('Ana Lima')).toBeTruthy();

  await user.press(screen.getByRole('button', { name: 'Atualizar' }));
  await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(3));
  expect(apiState.request).toHaveBeenLastCalledWith(
    '/students?q=Ana&limit=25&offset=0',
    expect.any(Object),
  );
});

it('carrega a próxima página pelo offset realmente carregado', async () => {
  const user = userEvent.setup();
  const firstPage = Array.from({ length: 25 }, (_, index) =>
    studentFixture({
      id: `student-${index + 1}`,
      name: index === 0 ? 'Ana Lima' : `Aluno ${index + 1}`,
    }),
  );
  apiState.request
    .mockResolvedValueOnce({ total: 26, items: firstPage })
    .mockResolvedValueOnce({
      total: 26,
      items: [studentFixture({ id: 'student-26', name: 'Zeca Lima' })],
    });

  renderTrainerStudents();
  expect(await screen.findByText('Ana Lima')).toBeTruthy();
  await user.press(screen.getByRole('button', { name: 'Carregar mais' }));

  expect(await screen.findByText('Zeca Lima')).toBeTruthy();
  expect(apiState.request).toHaveBeenLastCalledWith(
    '/students?limit=25&offset=25',
    expect.any(Object),
  );
});

it('preserva itens se carregar mais falhar', async () => {
  const user = userEvent.setup();
  apiState.request
    .mockResolvedValueOnce({ total: 26, items: [studentFixture()] })
    .mockRejectedValueOnce(new Error('offline'));

  renderTrainerStudents();
  expect(await screen.findByText('Ana Lima')).toBeTruthy();
  await user.press(screen.getByRole('button', { name: 'Carregar mais' }));

  expect(await screen.findByText('Não foi possível carregar mais alunos.')).toBeTruthy();
  expect(screen.getByText('Ana Lima')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Tentar carregar mais' })).toBeTruthy();
});

it('não mostra Carregar mais quando todos os itens foram carregados', async () => {
  apiState.request.mockResolvedValueOnce({ total: 1, items: [studentFixture()] });
  renderTrainerStudents();
  expect(await screen.findByText('Ana Lima')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull();
});
```

O status e os fallbacks de contato não precisam ser duplicados aqui porque são exercitados diretamente em `student-list-item.test.tsx`; esta screen testa a composição e a navegação.

- [x] **Step 2: Rodar o teste para confirmar a falha**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-students.test.tsx
```

Expected: FAIL porque a screen ainda não existe.

- [x] **Step 3: Implementar a query paginada**

Usar `useInfiniteQuery`:

```tsx
const query = useInfiniteQuery({
  queryKey: ['trainer', 'students', appliedSearch],
  initialPageParam: 0,
  queryFn: ({ pageParam, signal }) =>
    listTrainerStudents(api, {
      q: appliedSearch,
      limit: TRAINER_STUDENTS_PAGE_SIZE,
      offset: pageParam,
      signal,
    }),
  getNextPageParam: (lastPage, pages) => {
    const loaded = pages.reduce((total, page) => total + page.items.length, 0);
    return loaded < lastPage.total ? loaded : undefined;
  },
});

const students = query.data?.pages.flatMap((page) => page.items) ?? [];
const total = query.data?.pages[0]?.total ?? 0;
```

Não calcular `offset` por `pages.length * limit`, porque a última página pode ter menos itens; usar a quantidade realmente carregada.

- [x] **Step 4: Implementar busca explícita**

Estados:

```tsx
const [searchInput, setSearchInput] = useState('');
const [appliedSearch, setAppliedSearch] = useState('');

function applySearch(): void {
  setAppliedSearch(searchInput.trim());
}

function clearSearch(): void {
  setSearchInput('');
  setAppliedSearch('');
}
```

`Field`:

```tsx
<Field
  autoCapitalize="words"
  label="Buscar aluno"
  onChangeText={setSearchInput}
  onSubmitEditing={applySearch}
  placeholder="Nome do aluno"
  returnKeyType="search"
  value={searchInput}
/>
```

Ações:

- `Buscar`;
- `Limpar busca` somente quando `searchInput` ou `appliedSearch` não estiver vazio;
- `Atualizar`/`Atualizando...`.

- [x] **Step 5: Implementar estados da lista**

Regras exatas:

```ts
const isInitialLoading = query.isPending;
const hasData = Boolean(query.data);
const isInitialError = query.isError && !hasData;
const isSearchEmpty = Boolean(appliedSearch) && hasData && total === 0;
const isPortfolioEmpty = !appliedSearch && hasData && total === 0;
```

Cópias:

- loading: `Carregando alunos`;
- erro: `Não foi possível carregar seus alunos`;
- carteira vazia: `Nenhum aluno vinculado`;
- busca vazia: `Nenhum aluno encontrado`;
- erro de página adicional: `Não foi possível carregar mais alunos.`;
- erro de atualização com dados: `Não foi possível atualizar a lista.`.

A composição da lista deve usar os flags específicos do Infinite Query para não confundir falha de página adicional com falha de refresh:

```tsx
const hasPaginationError = query.isFetchNextPageError;
const hasRefreshError = query.isRefetchError && !query.isFetchNextPageError;

return (
  <Screen scroll contentContainerStyle={styles.content}>
    <ScreenHeader
      subtitle="Localize e abra um aluno vinculado à sua conta."
      title="Alunos"
    />

    <Field
      autoCapitalize="words"
      label="Buscar aluno"
      onChangeText={setSearchInput}
      onSubmitEditing={applySearch}
      placeholder="Nome do aluno"
      returnKeyType="search"
      value={searchInput}
    />
    <AppButton label="Buscar" onPress={applySearch} />
    {searchInput || appliedSearch ? (
      <AppButton label="Limpar busca" onPress={clearSearch} variant="secondary" />
    ) : null}

    {isSearchEmpty ? (
      <StatePanel
        actionLabel="Limpar busca"
        description="Tente outro nome ou volte para a carteira completa."
        onAction={clearSearch}
        title="Nenhum aluno encontrado"
        tone="empty"
      />
    ) : null}

    {isPortfolioEmpty ? (
      <StatePanel
        description="Nenhum aluno vinculado para acompanhar no momento."
        title="Nenhum aluno vinculado"
        tone="empty"
      />
    ) : null}

    {students.map((student) => (
      <StudentListItem
        key={student.id}
        onPress={() => openStudent(student.id)}
        student={student}
      />
    ))}

    {hasRefreshError ? (
      <InlineMessage message="Não foi possível atualizar a lista." tone="error" />
    ) : null}
    {hasPaginationError ? (
      <>
        <InlineMessage message="Não foi possível carregar mais alunos." tone="error" />
        <AppButton
          label="Tentar carregar mais"
          onPress={() => void query.fetchNextPage()}
          variant="secondary"
        />
      </>
    ) : null}

    {query.hasNextPage && !hasPaginationError ? (
      <AppButton
        disabled={query.isFetchingNextPage}
        label={query.isFetchingNextPage ? 'Carregando mais...' : 'Carregar mais'}
        onPress={() => void query.fetchNextPage()}
        variant="secondary"
      />
    ) : null}

    <AppButton
      disabled={query.isRefetching}
      label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
      onPress={() => void query.refetch()}
      variant="secondary"
    />
  </Screen>
);
```

Antes desse `return`, `isInitialLoading` retorna `StatePanel` de loading e `isInitialError` retorna `StatePanel` de erro com `Tentar novamente`; esses estados não montam a lista vazia.

- [x] **Step 6: Navegar para o detalhe**

Definir uma função única usada pelos itens:

```tsx
function openStudent(studentId: string): void {
  router.push({
    pathname: '/trainer/students/[studentId]',
    params: { studentId },
  });
}
```

Não enviar objeto `student` por params; o detalhe sempre revalida autorização e freshness por `/students/:id`.

- [x] **Step 7: Reorganizar a rota da tab Alunos**

Executar na futura implementação:

```powershell
New-Item -ItemType Directory -Force "apps/mobile/app/(trainer)/trainer/students"
git mv "apps/mobile/app/(trainer)/trainer/students.tsx" "apps/mobile/app/(trainer)/trainer/students/index.tsx"
```

Substituir o conteúdo de `students/index.tsx` por:

```tsx
import { TrainerStudentsScreen } from '../../../../src/screens/trainer-students';

export default function TrainerStudentsRoute() {
  return <TrainerStudentsScreen />;
}
```

Criar `students/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function TrainerStudentsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [x] **Step 8: Rodar testes da lista e tabs**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-students.test.tsx src/__tests__/trainer-tabs-layout.test.tsx
```

Expected: PASS e as tabs continuam exatamente `Início`, `Alunos`, `Perfil`.

- [x] **Step 9: Rodar typecheck**

```powershell
pnpm.cmd --dir apps/mobile typecheck
```

Expected: PASS, inclusive para os paths do Expo Router.

- [x] **Step 10: Commitar a unidade na futura execução**

```powershell
git add -- apps/mobile/src/screens/trainer-students.tsx apps/mobile/src/screens/trainer-students.test.tsx apps/mobile/app/'(trainer)'/trainer/students apps/mobile/src/__tests__/trainer-tabs-layout.test.tsx
git commit -m "feat(mobile): implementa lista de alunos do trainer"
```

---

### Task 5: Implementar o detalhe somente leitura do aluno

**Files:**
- Create: `apps/mobile/src/screens/trainer-student-detail.tsx`
- Test: `apps/mobile/src/screens/trainer-student-detail.test.tsx`
- Create: `apps/mobile/app/(trainer)/trainer/students/[studentId].tsx`

**Interfaces:**
- Consumes: `getTrainerStudent`.
- Query key: `['trainer', 'student', studentId]`.
- A rota fornece `studentId` via `useLocalSearchParams`.
- `404` é tratado como “indisponível” sem indicar se o ID existe em outro tenant.
- Não produz mutation, assessment query ou workout query.

- [x] **Step 1: Escrever testes falhando do detalhe**

Montar o teste com param, router, fixture e Query Client explícitos:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrainerStudent } from '../application/trainer/trainer-data';
import { ApiError } from '../lib/api';
import { TrainerStudentDetailScreen } from './trainer-student-detail';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const routerState = vi.hoisted(() => ({ replace: vi.fn() }));
const paramsState = vi.hoisted(() => ({ studentId: 'student-1' as string | undefined }));

vi.mock('../lib/use-api', () => ({ useApiClient: () => apiState }));
vi.mock('expo-router', () => ({
  router: routerState,
  useLocalSearchParams: () => paramsState,
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));

function studentFixture(overrides: Partial<TrainerStudent> = {}): TrainerStudent {
  return {
    id: 'student-1',
    trainerId: 'trainer-1',
    isIndependent: false,
    name: 'Ana Lima',
    email: 'ana@example.com',
    phone: '27999999999',
    birthDate: null,
    gender: null,
    goals: null,
    restrictions: null,
    status: 'active',
    avatarUrl: null,
    expoPushToken: null,
    createdAt: '2026-08-31T12:00:00.000Z',
    ...overrides,
  };
}

function renderTrainerStudentDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TrainerStudentDetailScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiState.request.mockReset();
  routerState.replace.mockReset();
  paramsState.studentId = 'student-1';
});
```

Casos:

```tsx
it('renderiza os dados essenciais do aluno', async () => {
  apiState.request.mockResolvedValueOnce(
    studentFixture({
      id: 'student-1',
      name: 'Ana Lima',
      email: 'ana@example.com',
      phone: '27999999999',
      birthDate: '1994-10-12',
      gender: 'female',
      goals: 'Ganhar força',
      restrictions: 'Evitar impacto no joelho',
      status: 'paused',
    }),
  );

  renderTrainerStudentDetail();

  expect(await screen.findByText('Ana Lima')).toBeTruthy();
  expect(screen.getByText('Pausado')).toBeTruthy();
  expect(screen.getByText('ana@example.com')).toBeTruthy();
  expect(screen.getByText('27999999999')).toBeTruthy();
  expect(screen.getByText('12/10/1994')).toBeTruthy();
  expect(screen.getByText('Feminino')).toBeTruthy();
  expect(screen.getByText('Ganhar força')).toBeTruthy();
  expect(screen.getByText('Evitar impacto no joelho')).toBeTruthy();
});

it('não diferencia aluno ausente de aluno fora do escopo', async () => {
  apiState.request.mockRejectedValueOnce(new ApiError('not found', 404));

  renderTrainerStudentDetail();

  expect(await screen.findByText('Aluno não encontrado')).toBeTruthy();
  expect(
    screen.getByText('Este aluno não está disponível para sua conta.'),
  ).toBeTruthy();
});
```

Cobrir os demais comportamentos com testes concretos:

```tsx
it('mostra loading durante a carga inicial', () => {
  apiState.request.mockReturnValueOnce(new Promise<never>(() => undefined));
  renderTrainerStudentDetail();
  expect(screen.getByText('Carregando aluno')).toBeTruthy();
});

it('permite retry depois de erro genérico', async () => {
  const user = userEvent.setup();
  apiState.request
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(studentFixture());

  renderTrainerStudentDetail();
  await user.press(await screen.findByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Ana Lima')).toBeTruthy();
});

it('renderiza fallbacks sem inventar dados', async () => {
  apiState.request.mockResolvedValueOnce(
    studentFixture({
      email: null,
      phone: null,
      birthDate: null,
      gender: null,
      goals: null,
      restrictions: null,
    }),
  );

  renderTrainerStudentDetail();

  expect(await screen.findByText('Sem contato cadastrado')).toBeTruthy();
  expect(screen.getAllByText('Não informado').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText('Sem objetivo cadastrado')).toBeTruthy();
  expect(screen.getByText('Sem restrições cadastradas')).toBeTruthy();
});

it('atualiza o detalhe mantendo o conteúdo', async () => {
  const user = userEvent.setup();
  apiState.request
    .mockResolvedValueOnce(studentFixture())
    .mockResolvedValueOnce(studentFixture({ status: 'paused' }));

  renderTrainerStudentDetail();
  expect(await screen.findByText('Ativo')).toBeTruthy();
  await user.press(screen.getByRole('button', { name: 'Atualizar' }));
  expect(await screen.findByText('Pausado')).toBeTruthy();
  await waitFor(() => expect(apiState.request).toHaveBeenCalledTimes(2));
});

it('volta para a carteira e não expõe ações de cards posteriores', async () => {
  const user = userEvent.setup();
  apiState.request.mockResolvedValueOnce(studentFixture());

  renderTrainerStudentDetail();
  expect(await screen.findByText('Ana Lima')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Nova avaliação' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Treinos' })).toBeNull();
  expect(apiState.request).toHaveBeenCalledTimes(1);
  expect(apiState.request).toHaveBeenCalledWith('/students/student-1', expect.any(Object));

  await user.press(screen.getByRole('button', { name: 'Voltar para alunos' }));
  expect(routerState.replace).toHaveBeenCalledWith('/trainer/students');
});

it('não chama API quando o parâmetro da rota está ausente', () => {
  paramsState.studentId = undefined;
  renderTrainerStudentDetail();
  expect(screen.getByText('Aluno inválido')).toBeTruthy();
  expect(apiState.request).not.toHaveBeenCalled();
});
```

- [x] **Step 2: Rodar o teste para confirmar a falha**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-student-detail.test.tsx
```

Expected: FAIL porque a screen ainda não existe.

- [x] **Step 3: Implementar helpers puros de apresentação**

Dentro da screen, manter helpers pequenos:

```ts
function formatBirthDate(value: string | null): string {
  if (!value) return 'Não informado';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatGender(value: TrainerStudent['gender']): string {
  if (value === 'male') return 'Masculino';
  if (value === 'female') return 'Feminino';
  if (value === 'other') return 'Outro';
  return 'Não informado';
}
```

Não calcular idade a partir da data, porque isso adiciona regra derivada desnecessária e sensível a data/timezone.

- [x] **Step 4: Implementar a query e estados**

Extrair param:

```tsx
const params = useLocalSearchParams<{ studentId?: string | string[] }>();
const studentId = Array.isArray(params.studentId) ? params.studentId[0] : params.studentId;
```

Se não houver `studentId`, renderizar estado de erro local com `Voltar para alunos` sem chamar API.

Query:

```tsx
const query = useQuery({
  enabled: Boolean(studentId),
  queryKey: ['trainer', 'student', studentId],
  queryFn: ({ signal }) => {
    if (!studentId) throw new Error('Aluno inválido.');
    return getTrainerStudent(api, studentId, signal);
  },
});
```

Tratamento de `404`:

```ts
const isNotFound = query.error instanceof ApiError && query.error.status === 404;
```

Cópias:

- loading: `Carregando aluno`;
- 404: `Aluno não encontrado` / `Este aluno não está disponível para sua conta.`;
- genérico: `Não foi possível carregar o aluno`;
- refetch tardio: `Não foi possível atualizar o aluno.`.

- [x] **Step 5: Implementar o conteúdo**

Ordem:

1. `AppButton` secundário `Voltar para alunos`, usando `router.replace('/trainer/students')` ou `Link`.
2. `ScreenHeader eyebrow="Aluno" title={student.name}`.
3. card de identidade com iniciais e `StudentStatusBadge`.
4. card `Contato`.
5. card `Informações`.
6. card `Objetivo`.
7. card `Restrições`.
8. `InlineMessage` de falha de refetch, quando aplicável.
9. `AppButton` secundário `Atualizar`/`Atualizando...`.

Não renderizar avaliação, treino ou mutation. A composição base deve ser concreta e manter os fallbacks em um só lugar:

```tsx
const hasContact = Boolean(student.email || student.phone);

return (
  <Screen scroll contentContainerStyle={styles.content}>
    <AppButton
      label="Voltar para alunos"
      onPress={() => router.replace('/trainer/students')}
      variant="secondary"
    />
    <ScreenHeader eyebrow="Aluno" title={student.name} />

    <Card>
      <Text style={styles.name}>{student.name}</Text>
      <StudentStatusBadge status={student.status} />
    </Card>

    <Card>
      <Text style={styles.sectionTitle}>Contato</Text>
      {hasContact ? (
        <>
          <Text style={sharedStyles.subtitle}>E-mail: {student.email ?? 'Não informado'}</Text>
          <Text style={sharedStyles.subtitle}>Telefone: {student.phone ?? 'Não informado'}</Text>
        </>
      ) : (
        <Text style={sharedStyles.subtitle}>Sem contato cadastrado</Text>
      )}
    </Card>

    <Card>
      <Text style={styles.sectionTitle}>Informações</Text>
      <Text style={sharedStyles.subtitle}>Nascimento: {formatBirthDate(student.birthDate)}</Text>
      <Text style={sharedStyles.subtitle}>Gênero: {formatGender(student.gender)}</Text>
    </Card>

    <Card>
      <Text style={styles.sectionTitle}>Objetivo</Text>
      <Text style={sharedStyles.subtitle}>{student.goals ?? 'Sem objetivo cadastrado'}</Text>
    </Card>

    <Card>
      <Text style={styles.sectionTitle}>Restrições</Text>
      <Text style={sharedStyles.subtitle}>
        {student.restrictions ?? 'Sem restrições cadastradas'}
      </Text>
    </Card>

    {query.isRefetchError ? (
      <InlineMessage message="Não foi possível atualizar o aluno." tone="error" />
    ) : null}

    <AppButton
      disabled={query.isRefetching}
      label={query.isRefetching ? 'Atualizando...' : 'Atualizar'}
      onPress={() => void query.refetch()}
      variant="secondary"
    />
  </Screen>
);
```

- [x] **Step 6: Criar o entrypoint dinâmico**

`apps/mobile/app/(trainer)/trainer/students/[studentId].tsx`:

```tsx
import { TrainerStudentDetailScreen } from '../../../../src/screens/trainer-student-detail';

export default function TrainerStudentDetailRoute() {
  return <TrainerStudentDetailScreen />;
}
```

A profundidade `../../../../src` é a esperada a partir do diretório `students/`; o entrypoint deve importar somente a screen e retornar o componente.

- [x] **Step 7: Rodar testes do detalhe**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-student-detail.test.tsx
```

Expected: PASS.

- [x] **Step 8: Rodar lista + detalhe juntos**

```powershell
pnpm.cmd --dir apps/mobile test src/screens/trainer-students.test.tsx src/screens/trainer-student-detail.test.tsx
```

Expected: PASS.

- [x] **Step 9: Commitar a unidade na futura execução**

```powershell
git add -- apps/mobile/src/screens/trainer-student-detail.tsx apps/mobile/src/screens/trainer-student-detail.test.tsx apps/mobile/app/'(trainer)'/trainer/students/'[studentId].tsx'
git commit -m "feat(mobile): adiciona detalhe de aluno do trainer"
```

---

### Task 6: Remover placeholders e consolidar regressão da MUV-16

**Files:**
- Delete: `apps/mobile/src/screens/trainer-section.tsx`
- Delete: `apps/mobile/src/screens/trainer-section.test.tsx`
- Modify: `apps/mobile/src/__tests__/trainer-screens.test.tsx`
- Modify: `apps/mobile/vitest.ui-coverage.config.ts`
- Verify: `apps/mobile/src/__tests__/trainer-tabs-layout.test.tsx`
- Verify: `apps/mobile/src/__tests__/role-layouts.test.tsx`
- Verify: `apps/mobile/src/__tests__/root-layout.test.tsx`

**Interfaces:**
- Não muda nenhuma interface pública.
- Apenas remove o componente placeholder que deixa de ter consumidores.
- Perfil do treinador continua usando `ProfileScreen`.
- Guards/tabs permanecem como definidos na MUV-16.
- `test:coverage:ui` passa a medir explicitamente as três novas screens da MUV-17.

- [x] **Step 1: Atualizar o teste legado antes de apagar o placeholder**

Remover imports de `TrainerSectionScreen` ou entrypoints antigos e preservar o caso de Perfil:

```tsx
describe('superfícies trainer', () => {
  it('apresenta o perfil com contexto de treinador', () => {
    render(<TrainerProfileScreen />);

    expect(screen.getAllByText('Treinador')).toHaveLength(2);
    expect(screen.getByText('TR')).toBeTruthy();
    expect(screen.getByText('Acompanhe seus alunos no Muvit.')).toBeTruthy();
  });
});
```

Os comportamentos de home/lista/detalhe já ficam cobertos pelos testes co-locados das Tasks 2, 4 e 5.

- [x] **Step 2: Rodar o teste legado**

```powershell
pnpm.cmd --dir apps/mobile test src/__tests__/trainer-screens.test.tsx
```

Expected: PASS sem depender de `trainer-section.tsx`.

- [x] **Step 3: Remover os placeholders**

```powershell
git rm -- apps/mobile/src/screens/trainer-section.tsx apps/mobile/src/screens/trainer-section.test.tsx
```

- [x] **Step 4: Incluir as screens da MUV-17 na cobertura visual crítica**

Em `apps/mobile/vitest.ui-coverage.config.ts`, preservar os includes existentes e acrescentar exatamente:

```ts
'src/screens/trainer-home.tsx',
'src/screens/trainer-students.tsx',
'src/screens/trainer-student-detail.tsx',
```

Não remover as screens atuais do aluno e não reduzir os thresholds de 85%.

- [x] **Step 5: Rodar regressão de navegação do treinador**

```powershell
pnpm.cmd --dir apps/mobile test src/__tests__/trainer-tabs-layout.test.tsx src/__tests__/role-layouts.test.tsx src/__tests__/root-layout.test.tsx
```

Expected: PASS.

- [x] **Step 6: Rodar regressão de autenticação e shell do aluno**

```powershell
pnpm.cmd --dir apps/mobile test src/__tests__/auth-screens.test.tsx src/__tests__/tabs-layout.test.tsx
```

Expected: PASS.

- [x] **Step 7: Rodar cobertura visual crítica após atualizar o include**

```powershell
pnpm.cmd --dir apps/mobile test:coverage:ui
```

Expected: PASS com statements, branches, functions e lines >= 85%, agora incluindo `trainer-home.tsx`, `trainer-students.tsx` e `trainer-student-detail.tsx`.

- [x] **Step 8: Commitar a limpeza e a cobertura na futura execução**

```powershell
git add -A -- apps/mobile/src/__tests__/trainer-screens.test.tsx apps/mobile/src/screens/trainer-section.tsx apps/mobile/src/screens/trainer-section.test.tsx apps/mobile/vitest.ui-coverage.config.ts
git commit -m "test(mobile): consolida regressao do trainer"
```

---

### Task 7: Validar a feature completa

**Files:**
- Verify only; não criar código novo salvo correções necessárias encontradas pelas verificações.
- Compare implementation against `docs/superpowers/specs/2026-08-31-muv-17-trainer-home-students-design.md`.

**Interfaces:**
- A entrega final deve satisfazer a spec sem adicionar escopo de MUV-18/MUV-19.

- [x] **Step 1: Rodar os testes específicos da MUV-17**

```powershell
pnpm.cmd --dir apps/mobile test src/application/trainer/trainer-data.test.ts src/components/trainer/student-list-item.test.tsx src/screens/trainer-home.test.tsx src/screens/trainer-students.test.tsx src/screens/trainer-student-detail.test.tsx
```

Expected: PASS.

- [x] **Step 2: Rodar a suíte mobile completa**

```powershell
pnpm.cmd --dir apps/mobile test
```

Expected: PASS.

- [x] **Step 3: Verificar cobertura bloqueante do núcleo**

```powershell
pnpm.cmd --dir apps/mobile test:coverage:core
```

Expected: PASS com cobertura >= 85% no núcleo configurado.

- [x] **Step 4: Verificar cobertura visual crítica**

```powershell
pnpm.cmd --dir apps/mobile test:coverage:ui
```

Expected: PASS.

- [x] **Step 5: Rodar typecheck**

```powershell
pnpm.cmd --dir apps/mobile typecheck
```

Expected: PASS.

- [x] **Step 6: Rodar Biome somente no workspace afetado**

```powershell
pnpm.cmd exec biome check apps/mobile
```

Expected: PASS.

- [x] **Step 7: Rodar Expo Doctor**

```powershell
pnpm.cmd --dir apps/mobile doctor
```

Expected: exit 0.

- [x] **Step 8: Verificar whitespace e escapes**

```powershell
git diff --check
git diff --name-only
```

Depois procurar sequências Unicode escapadas indevidas nos arquivos alterados:

```powershell
git diff --name-only --diff-filter=ACMR |
  ForEach-Object {
    if (Test-Path $_) {
      Select-String -Path $_ -Pattern '\\u[0-9A-Fa-f]{4}' -SimpleMatch:$false
    }
  }
```

Expected: nenhuma sequência `\uXXXX` usada para representar texto pt-BR visível.

- [ ] **Step 9: Fazer validação manual em Expo quando houver dispositivo/emulador**

Cenário treinador:

1. autenticar como `trainer`;
2. confirmar entrada em Início;
3. confirmar métricas reais;
4. tocar **Atualizar**;
5. abrir **Ver alunos**;
6. buscar por nome existente;
7. limpar busca;
8. carregar mais quando `total > 25`;
9. abrir aluno;
10. verificar campos longos e nulos;
11. atualizar detalhe;
12. abrir `/trainer/students/<uuid-inexistente>` e confirmar estado genérico sem exposição de tenant;
13. confirmar tab bar com somente Início, Alunos e Perfil.

Cenário aluno:

1. autenticar como `student`;
2. confirmar Hoje/Progresso/Perfil;
3. confirmar que `/trainer` continua bloqueado pelo guard da MUV-16.

Se não houver dispositivo ADB disponível, registrar explicitamente a validação visual como não executada; não afirmar que ela passou.

**Evidência parcial registrada em 2026-09-01:** o emulador `emulator-5554` foi conectado por ADB isolado, com reverse de `3333` e `8081`; foram observados a home, a carteira carregada, a busca explícita sem resultados, a limpeza da busca e a abertura de detalhes. O dispatch Android foi encerrado após ficar apenas em heartbeat, sem confirmação dos cenários restantes.

- [x] **Step 10: Revisar escopo antes do handoff**

Confirmar no diff que não existem:

```text
/apps/api
/packages/db
/packages/validators
/students/:studentId/assessments
/students/:studentId/workout-plans
POST /students
PATCH /students
DELETE /students
AsyncStorage novo para trainer
fila offline/push de student no shell trainer
```

## Critérios de conclusão para o executor

A implementação só está concluída quando:

- `/trainer` deixa de ser placeholder e usa `/trainer/summary`;
- `/trainer/students` lista somente alunos do treinador autenticado;
- busca por nome não dispara a cada tecla;
- paginação não trunca silenciosamente a carteira;
- `/trainer/students/:studentId` revalida o aluno pela API;
- 404 não revela existência de aluno de outro trainer;
- home/lista/detalhe tratam loading, vazio/erro/retry e atualização conforme aplicável;
- nenhuma mutation de aluno existe no mobile;
- nenhuma superfície de avaliações/treinos foi antecipada;
- tabs e guards da MUV-16 continuam passando;
- experiência do aluno permanece sem regressão;
- testes, coverage, typecheck, Biome, Expo Doctor e `git diff --check` fornecem evidência;
- validação manual foi executada ou sua impossibilidade foi registrada com precisão.
