# MUV-8 — Experiência do Aluno no Expo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar no Expo a experiência de aluno aprovada no Pencil, incluindo sessão guiada com retomada local, sem alterar os contratos atuais da API.

**Architecture:** Componentes visuais pequenos traduzem o sistema Pencil para React Native; regras e transições do treino permanecem em `src/application`, independentes da plataforma. Um adaptador de AsyncStorage persiste rascunhos particionados por usuário e treino, enquanto a conclusão continua usando a API e a fila offline existentes.

**Tech Stack:** Expo 54, React Native 0.81, Expo Router 6, React Query 5, AsyncStorage, Zod, Vitest e React Native Testing Library.

## Global Constraints

- Fonte visual primária: `assets/design/pencil_design.pen` e os node IDs registrados na spec da MUV-7.
- Escopo exclusivo de aluno; telas e navegação de treinador permanecem fora da MUV-8.
- Não alterar rotas, schemas, tabelas ou regras de autorização da API.
- Persistir o rascunho em `muvit_workout_session:<authUserId>:<workoutDayId>` e nunca armazenar credenciais.
- “Salvar e sair” mantém o rascunho; “Encerrar treino” remove o rascunho; concluir remove o rascunho após envio ou enfileiramento bem-sucedido.
- Preservar cache do treino, fila offline, avaliação com foto, autenticação Better Auth e limpeza do query client no logout.
- Texto visível, testes, comentários e documentação em pt-BR com caracteres UTF-8 literais.
- Não adicionar biblioteca de estado ou kit de UI; as únicas dependências novas são as fontes Inter e Space Grotesk compatíveis com Expo.
- Cada comportamento novo deve passar pelo ciclo RED → GREEN → REFACTOR.

---

## Estrutura de arquivos

### Arquivos novos

- `apps/mobile/src/components/ui/brand.tsx`: marca compacta do Muvit.
- `apps/mobile/src/components/ui/button.tsx`: botões primário e secundário.
- `apps/mobile/src/components/ui/card.tsx`: superfície reutilizável sem regra de domínio.
- `apps/mobile/src/components/ui/field.tsx`: label, input, unidade e mensagem de erro.
- `apps/mobile/src/components/ui/screen.tsx`: Safe Area, conteúdo rolável e cabeçalhos.
- `apps/mobile/src/components/ui/state-panel.tsx`: estados de carregamento, vazio e erro.
- `apps/mobile/src/components/ui/ui.test.tsx`: contrato semântico e interativo dos componentes.
- `apps/mobile/src/application/workouts/guided-session.ts`: estado e transições puras da sessão.
- `apps/mobile/src/application/workouts/guided-session.test.ts`: cobertura do fluxo guiado.
- `apps/mobile/src/lib/workout-session-storage.ts`: validação e persistência do rascunho.
- `apps/mobile/src/lib/workout-session-storage.test.ts`: isolamento, restauração e corrupção.
- `apps/mobile/src/lib/use-guided-workout-session.ts`: orquestra query, estado, persistência e finalização.
- `apps/mobile/src/screens/workout-overview.tsx`: visão geral anterior à sessão.
- `apps/mobile/src/screens/workout-overview.test.tsx`: conteúdo, início e retomada.
- `apps/mobile/app/session/[dayId].tsx`: rota da sessão guiada.

### Arquivos modificados

- `apps/mobile/package.json` e `pnpm-lock.yaml`: fontes aprovadas.
- `apps/mobile/src/lib/styles.ts`: tokens, tipografia e estilos compartilhados.
- `apps/mobile/app/_layout.tsx` e `apps/mobile/app/_layout.test.tsx`: carregamento das fontes.
- `apps/mobile/app/(auth)/login.tsx`, `signup.tsx` e `auth-screens.test.tsx`: redesign da autenticação.
- `apps/mobile/app/(tabs)/_layout.tsx`: tabs flutuantes e ícones.
- `apps/mobile/src/screens/today-workout.tsx` e seu teste: estados do Pencil e retomada.
- `apps/mobile/app/log/[dayId].tsx`: rota da visão geral.
- `apps/mobile/src/screens/log-workout.tsx` e seu teste: sessão guiada e saída segura.
- `apps/mobile/src/application/workouts/today-workout.ts` e seu teste: resultado discriminado para estados vazios.
- `apps/mobile/src/application/workouts/workout-log.ts` e seu teste: duração real no payload.
- `apps/mobile/src/screens/progress.tsx`, `new-assessment.tsx`, `profile.tsx` e respectivos testes: redesign e estados completos.
- `apps/mobile/app/new-assessment.tsx`: mantém a rota apontando para a tela redesenhada.
- `apps/mobile/vitest.ui-coverage.config.ts`: inclui os novos componentes e telas críticas quando necessário.

---

### Task 1: Fundação visual e componentes compartilhados

**Files:**
- Create: `apps/mobile/src/components/ui/brand.tsx`
- Create: `apps/mobile/src/components/ui/button.tsx`
- Create: `apps/mobile/src/components/ui/card.tsx`
- Create: `apps/mobile/src/components/ui/field.tsx`
- Create: `apps/mobile/src/components/ui/screen.tsx`
- Create: `apps/mobile/src/components/ui/state-panel.tsx`
- Create: `apps/mobile/src/components/ui/ui.test.tsx`
- Modify: `apps/mobile/src/lib/styles.ts`
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `AppButton`, `Brand`, `Card`, `Field`, `Screen`, `ScreenHeader` e `StatePanel`.
- Produces: `colors`, `spacing`, `radii`, `fontFamilies` e `sharedStyles` alinhados ao Pencil.
- Consumes: callbacks e conteúdo por propriedades; nenhum componente acessa API, storage ou router.

- [x] **Step 1: Escrever o teste falhando dos componentes semânticos**

Criar `ui.test.tsx` com contratos explícitos:

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { AppButton } from './button';
import { Field } from './field';
import { StatePanel } from './state-panel';

describe('componentes visuais mobile', () => {
  it('expõe label, estado e ação de forma acessível', async () => {
    const retry = vi.fn();
    const user = userEvent.setup();

    render(
      <>
        <Field label="Email" onChangeText={() => undefined} value="" />
        <StatePanel
          actionLabel="Tentar novamente"
          description="Não foi possível carregar seus dados."
          onAction={retry}
          title="Algo deu errado"
          tone="error"
        />
      </>,
    );

    expect(screen.getByLabelText('Email')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('impede toque duplicado durante submissão', async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    render(<AppButton disabled label="Entrando..." onPress={submit} />);

    await user.press(screen.getByRole('button', { name: 'Entrando...' }));
    expect(submit).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Rodar o teste e confirmar a falha correta**

Run: `corepack pnpm --dir apps/mobile test src/components/ui/ui.test.tsx`

Expected: FAIL porque `button`, `field` e `state-panel` ainda não existem.

- [x] **Step 3: Instalar fontes e implementar os componentes mínimos**

Run: `corepack pnpm --dir apps/mobile exec expo install expo-font @expo-google-fonts/inter @expo-google-fonts/space-grotesk`

Definir os tokens em `styles.ts`:

```ts
export const colors = {
  background: '#F5F3EF',
  surface: '#FFFFFF',
  ink: '#1A1A1A',
  muted: '#666666',
  line: '#D1CCC4',
  primary: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  primarySoft: '#E9F9F0',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const radii = { sm: 6, md: 10, lg: 14, pill: 999 };
export const fontFamilies = { body: 'Inter_400Regular', bodyStrong: 'Inter_600SemiBold', heading: 'SpaceGrotesk_600SemiBold' };
```

Implementar `AppButton` com propriedades `{ label: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' }`, `accessibilityRole="button"`, `accessibilityLabel={label}`, altura mínima de 48 e texto interno. Implementar `Field` com `TextInput accessibilityLabel={label}`, label visível, unidade opcional e erro visível. Implementar `StatePanel` com `tone: 'loading' | 'empty' | 'error'`, título, descrição e ação opcional. `Screen` deve aplicar Safe Area, fundo e ScrollView opcional; `ScreenHeader` deve aceitar eyebrow, título e subtítulo.

- [x] **Step 4: Rodar teste e verificação estática focada**

Run: `corepack pnpm --dir apps/mobile test src/components/ui/ui.test.tsx`

Expected: PASS com 2 testes.

Run: `corepack pnpm exec biome check apps/mobile/src/components/ui apps/mobile/src/lib/styles.ts`

Expected: PASS sem warnings.

- [x] **Step 5: Commitar a fundação visual**

```powershell
git add apps/mobile/package.json pnpm-lock.yaml apps/mobile/src/lib/styles.ts apps/mobile/src/components/ui
git diff --cached --check
git commit -m "feat(mobile): cria sistema visual do aluno"
```

### Task 2: Modelo puro da sessão guiada

**Files:**
- Create: `apps/mobile/src/application/workouts/guided-session.ts`
- Create: `apps/mobile/src/application/workouts/guided-session.test.ts`
- Modify: `apps/mobile/src/application/workouts/workout-log.ts`
- Modify: `apps/mobile/src/application/workouts/workout-log.test.ts`

**Interfaces:**
- Consumes: `WorkoutSetState` e os dados de exercício já retornados pelo plano.
- Produces: `GuidedSession`, `createGuidedSession`, `updateCurrentSet`, `completeCurrentSet`, `extendRest`, `skipRest`, `continueAfterExercise`, `markSessionFinished`, `getCurrentSet` e `buildSessionSummary`.
- Produces: `buildFinishWorkoutLogInput(sets, durationMin)` sem duração fixa.

- [ ] **Step 1: Escrever testes falhando para o percurso completo**

```ts
import { describe, expect, it } from 'vitest';
import {
  completeCurrentSet,
  continueAfterExercise,
  createGuidedSession,
  extendRest,
  getCurrentSet,
  skipRest,
  updateCurrentSet,
} from './guided-session';

const day = {
  id: 'day-id',
  exercises: [
    { id: 'exercise-a', sets: 2, reps: '10', loadKg: 20, restSeconds: 60 },
    { id: 'exercise-b', sets: 1, reps: '12', loadKg: null, restSeconds: 45 },
  ],
};

describe('sessão guiada', () => {
  it('avança de série para descanso e depois para a próxima série', () => {
    const created = createGuidedSession(day, 1_000);
    const edited = updateCurrentSet(created, { loadKg: '22', repsDone: '10' });
    const resting = completeCurrentSet(edited, day, 2_000);

    expect(resting.phase).toBe('rest');
    expect(resting.restEndsAtMs).toBe(62_000);
    expect(getCurrentSet(resting)).toMatchObject({ completed: true, loadKg: '22', repsDone: '10' });

    expect(extendRest(resting).restEndsAtMs).toBe(77_000);
    expect(skipRest(resting, day)).toMatchObject({ phase: 'set', currentSetIndex: 1 });
  });

  it('exige confirmação entre exercícios e sinaliza a finalização', () => {
    let session = createGuidedSession(day, 1_000);
    session = completeCurrentSet(updateCurrentSet(session, { repsDone: '10' }), day, 2_000);
    session = skipRest(session, day);
    session = completeCurrentSet(updateCurrentSet(session, { repsDone: '10' }), day, 3_000);

    expect(session.phase).toBe('exercise-complete');
    session = continueAfterExercise(session, day);
    session = completeCurrentSet(updateCurrentSet(session, { repsDone: '12' }), day, 4_000);
    expect(session.phase).toBe('ready-to-finish');
  });
});
```

Atualizar `workout-log.test.ts` para esperar `durationMin` calculado:

```ts
expect(buildFinishWorkoutLogInput(sets, 18)).toMatchObject({ durationMin: 18, completed: true });
```

- [ ] **Step 2: Rodar os testes e confirmar falhas de símbolo ausente e duração fixa**

Run: `corepack pnpm --dir apps/mobile test src/application/workouts/guided-session.test.ts src/application/workouts/workout-log.test.ts`

Expected: FAIL por módulo ausente e pela assinatura antiga de `buildFinishWorkoutLogInput`.

- [ ] **Step 3: Implementar estado, transições e resumo**

Usar estes tipos sem dependência de plataforma:

```ts
export type GuidedSessionPhase = 'set' | 'rest' | 'exercise-complete' | 'ready-to-finish' | 'summary';

export type GuidedSession = {
  version: 1;
  workoutDayId: string;
  startedAtMs: number;
  updatedAtMs: number;
  currentExerciseIndex: number;
  currentSetIndex: number;
  phase: GuidedSessionPhase;
  restEndsAtMs: number | null;
  sets: WorkoutSetState[];
};

export type GuidedSessionSummary = {
  durationMin: number;
  exerciseCount: number;
  completedSetCount: number;
  volumeKg: number;
};
```

`completeCurrentSet` deve marcar somente a série corrente; usar `rest` entre séries, `exercise-complete` entre exercícios e `ready-to-finish` após a última série do último exercício. `markSessionFinished` aceita apenas `ready-to-finish` e retorna `summary`. Calcular duração com `Math.max(1, Math.ceil((finishedAtMs - startedAtMs) / 60_000))`.

Alterar `buildFinishWorkoutLogInput` e `finishWorkoutWithOfflineFallback` para receber `durationMin` explicitamente, mantendo o mesmo schema e a mesma fila.

- [ ] **Step 4: Rodar testes do núcleo e cobertura core**

Run: `corepack pnpm --dir apps/mobile test src/application/workouts/guided-session.test.ts src/application/workouts/workout-log.test.ts`

Expected: PASS.

Run: `corepack pnpm --dir apps/mobile test:coverage:core`

Expected: PASS com o piso global de 85% preservado.

- [ ] **Step 5: Commitar o núcleo guiado**

```powershell
git add apps/mobile/src/application/workouts/guided-session.ts apps/mobile/src/application/workouts/guided-session.test.ts apps/mobile/src/application/workouts/workout-log.ts apps/mobile/src/application/workouts/workout-log.test.ts
git diff --cached --check
git commit -m "feat(mobile): modela sessao guiada de treino"
```

### Task 3: Persistência segura do rascunho

**Files:**
- Create: `apps/mobile/src/lib/workout-session-storage.ts`
- Create: `apps/mobile/src/lib/workout-session-storage.test.ts`

**Interfaces:**
- Consumes: `GuidedSession`.
- Produces: `WorkoutSessionStorage` com `load`, `save` e `remove`.
- Produces: `createWorkoutSessionStorage(storage)` e `workoutSessionKey(authUserId, workoutDayId)`.

- [ ] **Step 1: Escrever testes falhando de isolamento e corrupção**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createWorkoutSessionStorage, workoutSessionKey } from './workout-session-storage';

const session = {
  version: 1 as const,
  workoutDayId: 'day-a',
  startedAtMs: 1_000,
  updatedAtMs: 2_000,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  phase: 'set' as const,
  restEndsAtMs: null,
  sets: [],
};

describe('workoutSessionStorage', () => {
  it('isola e restaura o rascunho por usuário e treino', async () => {
    const values = new Map<string, string>();
    const storage = createWorkoutSessionStorage({
      getItem: async (key) => values.get(key) ?? null,
      removeItem: async (key) => void values.delete(key),
      setItem: async (key, value) => void values.set(key, value),
    });

    await storage.save('user-a', session);

    await expect(storage.load('user-a', 'day-a')).resolves.toEqual(session);
    await expect(storage.load('user-b', 'day-a')).resolves.toBeNull();
    expect(workoutSessionKey('user-a', 'day-a')).toBe('muvit_workout_session:user-a:day-a');
  });

  it('remove payload inválido sem expor erro de parse', async () => {
    const removeItem = vi.fn().mockResolvedValue(undefined);
    const storage = createWorkoutSessionStorage({
      getItem: vi.fn().mockResolvedValue('{inválido'),
      removeItem,
      setItem: vi.fn(),
    });

    await expect(storage.load('user-a', 'day-a')).resolves.toBeNull();
    expect(removeItem).toHaveBeenCalledWith('muvit_workout_session:user-a:day-a');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar módulo ausente**

Run: `corepack pnpm --dir apps/mobile test src/lib/workout-session-storage.test.ts`

Expected: FAIL porque `workout-session-storage.ts` ainda não existe.

- [ ] **Step 3: Implementar validação e adaptador**

Definir a porta concreta:

```ts
export type SessionStorageDriver = {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type WorkoutSessionStorage = {
  load: (authUserId: string, workoutDayId: string) => Promise<GuidedSession | null>;
  remove: (authUserId: string, workoutDayId: string) => Promise<void>;
  save: (authUserId: string, session: GuidedSession) => Promise<void>;
};
```

Validar `version`, IDs, timestamps, índices, fase, descanso e todas as séries com Zod local. Em qualquer falha de parse, remover somente a chave exata e retornar `null`. Propagar falha de `setItem` para que a interface possa informar que o progresso não foi salvo.

- [ ] **Step 4: Rodar teste e Biome**

Run: `corepack pnpm --dir apps/mobile test src/lib/workout-session-storage.test.ts`

Expected: PASS.

Run: `corepack pnpm exec biome check apps/mobile/src/lib/workout-session-storage.ts apps/mobile/src/lib/workout-session-storage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commitar a persistência**

```powershell
git add apps/mobile/src/lib/workout-session-storage.ts apps/mobile/src/lib/workout-session-storage.test.ts
git diff --cached --check
git commit -m "feat(mobile): persiste rascunho do treino"
```

### Task 4: Autenticação, fontes e navegação principal

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/_layout.test.tsx`
- Modify: `apps/mobile/app/(auth)/login.tsx`
- Modify: `apps/mobile/app/(auth)/signup.tsx`
- Modify: `apps/mobile/app/(auth)/auth-screens.test.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: componentes visuais da Task 1 e `authClient` existente.
- Produces: fontes carregadas antes da navegação, autenticação alinhada a `OII7y`, `P9kNT`, `J6jZMI`, `W7qGN` e tabs alinhadas ao Pencil.

- [ ] **Step 1: Adicionar testes falhando para labels, submissão e fontes**

Em `auth-screens.test.tsx`, trocar seletores duplicados por papéis acessíveis e adicionar:

```tsx
expect(screen.getByLabelText('Email')).toBeTruthy();
expect(screen.getByLabelText('Senha')).toBeTruthy();
await user.press(screen.getByRole('button', { name: 'Entrar' }));
expect(await screen.findByText('Credenciais inválidas. Verifique os dados e tente novamente.')).toBeTruthy();
```

Em `_layout.test.tsx`, mockar `useFonts` e provar que a árvore autenticada só monta após as duas famílias carregarem:

```tsx
const fontState = vi.hoisted(() => ({ loaded: true }));

vi.mock('expo-font', () => ({
  useFonts: () => [fontState.loaded],
}));

vi.mock('@expo-google-fonts/inter', () => ({
  Inter_400Regular: 'Inter_400Regular',
  Inter_600SemiBold: 'Inter_600SemiBold',
}));

vi.mock('@expo-google-fonts/space-grotesk', () => ({
  SpaceGrotesk_600SemiBold: 'SpaceGrotesk_600SemiBold',
}));

fontState.loaded = false;
render(<RootLayout />);
expect(screen.getByLabelText('Carregando aplicativo')).toBeTruthy();

fontState.loaded = true;
render(<RootLayout />);
expect(screen.getByTestId('router-slot')).toBeTruthy();
```

- [ ] **Step 2: Rodar testes e confirmar as falhas visuais/semânticas**

Run: `corepack pnpm --dir apps/mobile test app/_layout.test.tsx 'app/(auth)/auth-screens.test.tsx'`

Expected: FAIL porque as fontes e labels acessíveis ainda não estão conectadas.

- [ ] **Step 3: Implementar fontes, autenticação e tabs**

No root layout, carregar exatamente:

```tsx
const [fontsLoaded] = useFonts({
  Inter_400Regular,
  Inter_600SemiBold,
  SpaceGrotesk_600SemiBold,
});
```

Antes de avaliar sessão e segmentos, renderizar `ActivityIndicator` com `accessibilityLabel="Carregando aplicativo"` quando `fontsLoaded` for falso. Preservar os guards de role e os componentes `QueueDrain` e `PushTokenRegistration`.

Reconstruir login e cadastro com `Screen`, `Brand`, `Field` e `AppButton`, mantendo os mesmos payloads Better Auth. Configurar tabs com `headerShown: false`, ícones `calendar-outline`, `stats-chart-outline` e `person-outline`, labels Hoje, Progresso e Perfil e estilos de cápsula flutuante.

- [ ] **Step 4: Rodar testes de autenticação e layout**

Run: `corepack pnpm --dir apps/mobile test app/_layout.test.tsx 'app/(auth)/auth-screens.test.tsx'`

Expected: PASS sem alterar o comportamento de role.

Run: `corepack pnpm --dir apps/mobile typecheck`

Expected: PASS.

- [ ] **Step 5: Commitar autenticação e navegação**

```powershell
git add apps/mobile/app/_layout.tsx apps/mobile/app/_layout.test.tsx 'apps/mobile/app/(auth)' 'apps/mobile/app/(tabs)/_layout.tsx'
git diff --cached --check
git commit -m "feat(mobile): redesenha autenticacao e navegacao"
```

### Task 5: Hoje, estados discriminados e visão geral

**Files:**
- Modify: `apps/mobile/src/application/workouts/today-workout.ts`
- Modify: `apps/mobile/src/application/workouts/today-workout.test.ts`
- Modify: `apps/mobile/src/screens/today-workout.tsx`
- Modify: `apps/mobile/src/screens/today-workout.test.tsx`
- Create: `apps/mobile/src/screens/workout-overview.tsx`
- Create: `apps/mobile/src/screens/workout-overview.test.tsx`
- Modify: `apps/mobile/app/log/[dayId].tsx`

**Interfaces:**
- Produces: `TodayWorkoutResult = { status: 'available'; plan; day } | { status: 'no-active-plan' } | { status: 'no-workout-today'; plan }`.
- Consumes: `WorkoutSessionStorage` para detectar rascunho do dia selecionado.
- Produces: links `/log/<dayId>` e `/session/<dayId>` sem mudar a API.

- [ ] **Step 1: Escrever testes falhando dos três estados e da retomada**

Em `today-workout.test.ts`, substituir expectativas `null` por discriminantes:

```ts
const noActivePlanApi = {
  request: vi.fn().mockResolvedValueOnce({ items: [{ id: 'draft-id', status: 'draft' }] }),
};
await expect(loadTodayWorkout({ api: noActivePlanApi })).resolves.toEqual({ status: 'no-active-plan' });

const emptyActivePlanApi = {
  request: vi
    .fn()
    .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
    .mockResolvedValueOnce({ id: 'plan-id', name: 'Plano', days: [] })
    .mockResolvedValueOnce({ items: [] }),
};
await expect(loadTodayWorkout({ api: emptyActivePlanApi })).resolves.toMatchObject({ status: 'no-workout-today' });

const availableApi = {
  request: vi
    .fn()
    .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
    .mockResolvedValueOnce({
      id: 'plan-id',
      name: 'Plano',
      days: [{ id: 'day-b', label: 'Treino B', exercises: [] }],
    })
    .mockResolvedValueOnce({ items: [] }),
};
await expect(loadTodayWorkout({ api: availableApi })).resolves.toMatchObject({ status: 'available', day: { id: 'day-b' } });
```

Em `today-workout.test.tsx`, cobrir retry e rascunho:

```tsx
const savedSession = {
  version: 1,
  workoutDayId: 'day-id',
  startedAtMs: 1_000,
  updatedAtMs: 2_000,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  phase: 'set',
  restEndsAtMs: null,
  sets: [],
};

expect(await screen.findByText('Não foi possível carregar seu treino')).toBeTruthy();
await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
expect(apiState.request).toHaveBeenCalled();

storageState.getItem.mockResolvedValueOnce(JSON.stringify(savedSession));
expect(await screen.findByText('Continuar treino')).toBeTruthy();
```

Em `workout-overview.test.tsx`, provar conteúdo e destino:

```tsx
expect(await screen.findByText('Treino A')).toBeTruthy();
expect(screen.getByText('Supino')).toBeTruthy();
expect(screen.getByRole('button', { name: 'Iniciar treino' })).toBeTruthy();
```

- [ ] **Step 2: Rodar os testes e confirmar falhas de contrato e módulo**

Run: `corepack pnpm --dir apps/mobile test src/application/workouts/today-workout.test.ts src/screens/today-workout.test.tsx src/screens/workout-overview.test.tsx`

Expected: FAIL por retorno antigo, UI antiga e tela ausente.

- [ ] **Step 3: Implementar os estados e a visão geral**

Fazer `loadTodayWorkout` retornar `no-active-plan` antes de buscar detalhes; retornar `no-workout-today` quando o plano ativo não tiver um dia selecionável; manter `available` com plano e dia.

Em Hoje, mapear:

- loading → `StatePanel` sem ação;
- erro → título “Não foi possível carregar seu treino” e retry via `query.refetch`;
- no-active-plan → “Sem plano ativo”;
- no-workout-today → “Hoje é dia de recuperação”;
- available sem rascunho → “Iniciar treino”;
- available com rascunho → “Continuar treino”.

`WorkoutOverviewScreen` usa `loadWorkoutDay`, lista exercícios e abre `/session/<dayId>`. A rota existente `app/log/[dayId].tsx` passa a exportar essa tela. O modal de exercício mantém nome, grupo muscular, séries, repetições, descanso e notas.

- [ ] **Step 4: Rodar testes de Hoje e visão geral**

Run: `corepack pnpm --dir apps/mobile test src/application/workouts/today-workout.test.ts src/screens/today-workout.test.tsx src/screens/workout-overview.test.tsx`

Expected: PASS para carregando, erro, vazios, treino disponível, offline e retomada.

- [ ] **Step 5: Commitar Hoje e visão geral**

```powershell
git add apps/mobile/src/application/workouts/today-workout.ts apps/mobile/src/application/workouts/today-workout.test.ts apps/mobile/src/screens/today-workout.tsx apps/mobile/src/screens/today-workout.test.tsx apps/mobile/src/screens/workout-overview.tsx apps/mobile/src/screens/workout-overview.test.tsx 'apps/mobile/app/log/[dayId].tsx'
git diff --cached --check
git commit -m "feat(mobile): redesenha treino do dia"
```

### Task 6: Sessão guiada, descanso, saída segura e resumo

**Files:**
- Create: `apps/mobile/src/lib/use-guided-workout-session.ts`
- Modify: `apps/mobile/src/screens/log-workout.tsx`
- Modify: `apps/mobile/src/screens/log-workout.test.tsx`
- Create: `apps/mobile/app/session/[dayId].tsx`

**Interfaces:**
- Consumes: `GuidedSession`, `WorkoutSessionStorage`, `loadWorkoutDay`, `finishWorkoutWithOfflineFallback`, usuário autenticado e `dayId`.
- Produces: estado de tela `loading | error | ready`, ações persistentes e resultado final `queued: boolean`.
- Remove o rascunho somente depois de conclusão enviada ou enfileirada.

- [ ] **Step 1: Escrever testes falhando do fluxo observável**

Substituir o teste de formulário em lote por um fluxo guiado:

```tsx
const workoutPlan = {
  id: 'plan-id',
  days: [
    {
      id: 'day-id',
      label: 'Treino A',
      exercises: [
        {
          id: 'exercise-a',
          sets: 2,
          reps: '10',
          loadKg: 20,
          restSeconds: 60,
          exercise: { name: 'Supino', muscleGroup: 'Peito' },
        },
      ],
    },
  ],
};

it('registra séries, atravessa descanso e conclui o treino', async () => {
  const user = userEvent.setup();
  apiState.request
    .mockResolvedValueOnce({ items: [{ id: 'plan-id', status: 'active' }] })
    .mockResolvedValueOnce(workoutPlan)
    .mockResolvedValueOnce({ id: 'log-id' })
    .mockResolvedValueOnce(undefined);

  renderWithQueryClient();

  expect(await screen.findByText('Série 1 de 2')).toBeTruthy();
  await user.type(screen.getByLabelText('Repetições realizadas'), '10');
  await user.press(screen.getByRole('button', { name: 'Concluir série' }));
  expect(screen.getByText('Descanso')).toBeTruthy();
  await user.press(screen.getByRole('button', { name: 'Pular descanso' }));
  await user.press(screen.getByRole('button', { name: 'Concluir série' }));
  await user.press(screen.getByRole('button', { name: 'Voltar ao início' }));

  await waitFor(() => expect(storageState.removeItem).toHaveBeenCalled());
});
```

Adicionar testes separados para:

```tsx
expect(await screen.findByText('Treino indisponível')).toBeTruthy();
expect(await screen.findByText('Treino em andamento')).toBeTruthy();
await user.press(screen.getByRole('button', { name: 'Salvar e sair' }));
expect(routerState.replace).toHaveBeenCalledWith('/(tabs)');

await user.press(screen.getByRole('button', { name: 'Encerrar treino' }));
expect(storageState.removeItem).toHaveBeenCalledWith('muvit_workout_session:auth-user-id:day-id');
```

- [ ] **Step 2: Rodar o teste e confirmar falha contra a tela em lote**

Run: `corepack pnpm --dir apps/mobile test src/screens/log-workout.test.tsx`

Expected: FAIL porque a tela atual exibe todas as séries e não possui descanso, rascunho ou saída segura.

- [ ] **Step 3: Implementar hook e estados visuais da sessão**

O hook deve expor:

```ts
export type GuidedWorkoutController = {
  day: WorkoutDay;
  session: GuidedSession;
  storageError: string | null;
  queued: boolean;
  updateSet: (values: { loadKg?: string; repsDone?: string }) => Promise<void>;
  completeSet: () => Promise<void>;
  addRestTime: () => Promise<void>;
  skipRest: () => Promise<void>;
  continueAfterExercise: () => Promise<void>;
  finishWorkout: () => Promise<void>;
  discard: () => Promise<void>;
};
```

No hook, definir `type WorkoutDay = z.infer<typeof workoutPlanFullSchema>['days'][number]` para manter o contrato idêntico ao validator compartilhado.

O hook carrega dia e rascunho, cria sessão quando necessário, persiste após cada transição e usa `finishWorkoutWithOfflineFallback` com duração calculada. Se API e fila falharem, mantém rascunho e expõe erro. A UI renderiza exatamente uma fase por vez e calcula o contador a partir de `restEndsAtMs`.

Usar `usePreventRemove` com rascunho ativo. Guardar a ação de navegação interceptada; “Salvar e sair” persiste e despacha essa ação, “Encerrar treino” remove e despacha, e “Continuar treinando” apenas fecha a confirmação. A rota `app/session/[dayId].tsx` exporta `LogWorkoutScreen`.

- [ ] **Step 4: Rodar teste da sessão e regressão do núcleo**

Run: `corepack pnpm --dir apps/mobile test src/screens/log-workout.test.tsx src/application/workouts/guided-session.test.ts src/lib/workout-session-storage.test.ts`

Expected: PASS cobrindo exercício atual, descanso, conclusão, resumo, retomada e saída.

Run: `corepack pnpm --dir apps/mobile typecheck`

Expected: PASS.

- [ ] **Step 5: Commitar a sessão guiada**

```powershell
git add apps/mobile/src/lib/use-guided-workout-session.ts apps/mobile/src/screens/log-workout.tsx apps/mobile/src/screens/log-workout.test.tsx 'apps/mobile/app/session/[dayId].tsx'
git diff --cached --check
git commit -m "feat(mobile): implementa sessao guiada"
```

### Task 7: Progresso, nova avaliação e perfil

**Files:**
- Modify: `apps/mobile/src/screens/progress.tsx`
- Modify: `apps/mobile/src/screens/progress.test.tsx`
- Modify: `apps/mobile/src/screens/new-assessment.tsx`
- Modify: `apps/mobile/src/screens/new-assessment.test.tsx`
- Modify: `apps/mobile/src/screens/profile.tsx`
- Modify: `apps/mobile/src/screens/profile.test.tsx`

**Interfaces:**
- Consumes: componentes visuais da Task 1, API e mutações existentes.
- Produces: estados Pencil `nBQZW`, `U09sO`, `I2gzs`, `CsaiW` e `q7wg2L` sem mudar payloads.

- [ ] **Step 1: Escrever testes falhando de erro, retry e sucesso**

Em `progress.test.tsx`:

```tsx
const user = userEvent.setup();
apiState.request.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ items: [], total: 0 });
renderWithQueryClient();
expect(await screen.findByText('Não foi possível carregar seu progresso')).toBeTruthy();
await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
expect(await screen.findByText('Nenhuma avaliação registrada')).toBeTruthy();
```

Em `new-assessment.test.tsx`:

```tsx
const user = userEvent.setup();
apiState.request.mockRejectedValueOnce(new Error('falha'));
await user.press(screen.getByRole('button', { name: 'Salvar avaliação' }));
expect(await screen.findByText('Não foi possível salvar sua avaliação.')).toBeTruthy();
expect(routerState.back).not.toHaveBeenCalled();
```

Em `profile.test.tsx`:

```tsx
expect(await screen.findByText('Aluno independente')).toBeTruthy();
expect(screen.getByText('Treinos e evolução')).toBeTruthy();
expect(screen.getByText('MC')).toBeTruthy();
```

- [ ] **Step 2: Rodar testes e confirmar ausência dos estados aprovados**

Run: `corepack pnpm --dir apps/mobile test src/screens/progress.test.tsx src/screens/new-assessment.test.tsx src/screens/profile.test.tsx`

Expected: FAIL porque a UI atual não oferece retry, feedback persistente de erro nem os dados visuais do perfil.

- [ ] **Step 3: Implementar as três telas com componentes compartilhados**

Progresso deve formatar datas em pt-BR, renderizar peso e gordura no mesmo card, mostrar ganho/perda quando houver avaliação anterior e oferecer retry. Nova avaliação deve usar labels visíveis, `AppButton`, estado de envio, mensagem de erro e confirmação de sucesso antes de voltar. Perfil deve derivar iniciais das duas primeiras partes do nome e manter logout com `queryClient.clear()` em `finally`.

Não alterar `submitAssessment`, upload de foto, query key `['assessments', 'me']` ou payload Better Auth.

- [ ] **Step 4: Rodar testes das telas e cobertura de UI**

Run: `corepack pnpm --dir apps/mobile test src/screens/progress.test.tsx src/screens/new-assessment.test.tsx src/screens/profile.test.tsx`

Expected: PASS.

Run: `corepack pnpm --dir apps/mobile test:coverage:ui`

Expected: PASS com o gate configurado.

- [ ] **Step 5: Commitar progresso, avaliação e perfil**

```powershell
git add apps/mobile/src/screens/progress.tsx apps/mobile/src/screens/progress.test.tsx apps/mobile/src/screens/new-assessment.tsx apps/mobile/src/screens/new-assessment.test.tsx apps/mobile/src/screens/profile.tsx apps/mobile/src/screens/profile.test.tsx
git diff --cached --check
git commit -m "feat(mobile): redesenha progresso e perfil"
```

### Task 8: Verificação integrada e handoff da MUV-8

**Files:**
- Modify if needed: `apps/mobile/vitest.ui-coverage.config.ts`
- Modify if needed: arquivos alterados nas Tasks 1–7 somente para correções encontradas pela verificação.
- External: issue Linear MUV-8.

**Interfaces:**
- Consumes: toda a implementação e os node IDs do Pencil.
- Produces: evidência local de testes, qualidade estática, Expo Doctor e verificação visual.

- [ ] **Step 1: Executar a suíte mobile completa**

Run: `corepack pnpm --dir apps/mobile test`

Expected: todos os testes PASS, sem warnings inesperados.

Run: `corepack pnpm --dir apps/mobile test:coverage:core`

Expected: PASS com cobertura mínima de 85% do núcleo.

Run: `corepack pnpm --dir apps/mobile test:coverage:ui`

Expected: PASS com todas as telas críticas incluídas.

- [ ] **Step 2: Executar verificações estáticas e de ambiente**

Run: `corepack pnpm --dir apps/mobile typecheck`

Expected: PASS.

Run: `corepack pnpm exec biome check apps/mobile`

Expected: PASS.

Run: `corepack pnpm --dir apps/mobile doctor`

Expected: todos os checks do Expo Doctor PASS.

- [ ] **Step 3: Verificar UTF-8 e o diff final**

```powershell
$changed = git diff --name-only origin/develop...HEAD
Select-String -Path $changed -Pattern '\\u[0-9a-fA-F]{4}'
git diff --check origin/develop...HEAD
git status --short
```

Expected: busca Unicode vazia, diff check vazio e worktree sem arquivos externos ao escopo.

- [ ] **Step 4: Fazer verificação visual em uma plataforma Expo disponível**

Sem iniciar ou reiniciar servidor automaticamente, usar a instância Expo fornecida pelo usuário para verificar em largura de 390 px e em uma largura menor:

- login default e erro;
- Hoje disponível, em andamento, vazio e erro;
- visão geral e detalhe de exercício;
- série atual, descanso, exercício concluído, saída e resumo;
- Progresso carregado, vazio e erro;
- nova avaliação default, envio e erro;
- Perfil e tabs.

Comparar diretamente com `OII7y`, `uJLDm`, `OVuJm`, `jYzas`, `nerHC`, `IRuyd`, `VoY8I`, `I1EuxI`, `jwmjt`, `p4oS1`, `nBQZW`, `U09sO`, `I2gzs`, `CsaiW` e `q7wg2L`. Corrigir clipping, contraste, desalinhamento e áreas tocáveis antes de continuar.

- [ ] **Step 5: Registrar evidência no Linear sem encerrar prematuramente**

Adicionar comentário na MUV-8 com:

- branch `feat/muv-8-aluno-mobile`;
- resumo dos fluxos implementados;
- comandos executados e resultados numéricos;
- plataforma usada na verificação visual ou motivo objetivo caso ela não esteja disponível;
- riscos ou gaps restantes, se houver.

Manter a issue em `In Progress` enquanto a mudança estiver apenas local. Mover para o status de revisão somente após publicação da branch e abertura de PR autorizadas pelo usuário.

- [ ] **Step 6: Criar commit final somente se a verificação exigiu correções**

Inspecionar `git status --short`, formar `$correctionFiles` somente com os caminhos corrigidos nas Tasks 1–7 e executar:

```powershell
git add -- $correctionFiles
git diff --cached --check
git commit -m "fix(mobile): ajusta verificacao visual da MUV-8"
```

Se não houver correções após a verificação, não criar commit vazio.
