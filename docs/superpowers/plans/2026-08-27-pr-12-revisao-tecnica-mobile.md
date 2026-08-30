# PR 12 Mobile Technical Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os cinco riscos técnicos da PR 12 e tornar a suíte mobile obrigatória na CI sem alterar contratos da API ou do banco.

**Architecture:** A sessão ativa será um registro local versionado com snapshot do treino e relógio acumulado. A conclusão será um journal durável por proprietário, data e treino, avançado por etapas com um requester vinculado a um único cookie Better Auth; a integração consultará ambos antes de permitir retomada ou nova submissão. O inset da tab bar será aplicado no componente `Screen`, enquanto a CI ganhará um job mobile independente.

**Tech Stack:** TypeScript estrito, Expo 54, React Native 0.81, Expo Router 6, Better Auth 1.6, TanStack Query 5, AsyncStorage, Zod 3, Vitest 4, React Native Testing Library, pnpm e GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-27-pr-12-revisao-tecnica-mobile-design.md`

## Global Constraints

- Aplicar primeiro `AGENTS.md` e `apps/mobile/AGENTS.md`.
- Não alterar contratos da API, schema do banco ou validadores compartilhados.
- Não criar endpoint atômico nem chave de idempotência nesta entrega.
- Preservar cache, drafts e operações privadas por `authUserId`; nunca tratar Better Auth `user.id` como `profileId`.
- Usar `authClient.useSession()` como fonte da identidade e o cookie Better Auth como credencial nativa.
- Não usar `any`, non-null assertion, casts desnecessários, marcadores de trabalho pendente, placeholders ou escapes Unicode para textos pt-BR.
- Todo comportamento novo segue RED-GREEN-REFACTOR e mantém cobertura core mínima de 85%.
- Executar comandos da raiz com `corepack.cmd pnpm` quando `pnpm.cmd` não estiver disponível.
- Cada task termina em commit próprio e revisão independente antes da próxima task.

## Scope Check

Sessão, storage, identidade e journal formam um único fluxo de consistência e não podem ser entregues como subprojetos independentes. O inset da tab bar e a CI são tarefas delimitadas, mas permanecem neste plano porque são critérios obrigatórios do mesmo parecer da PR 12 e precisam participar da revisão final integrada do branch.

---

### Task 1: Relógio de tempo ativo da sessão

**Files:**
- Modify: `apps/mobile/src/application/workouts/guided-session.ts`
- Test: `apps/mobile/src/application/workouts/guided-session.test.ts`

**Interfaces:**
- Produces: `GuidedSession` versão 2 com `activeDurationMs: number` e `activeSinceMs: number | null`.
- Produces: `pauseGuidedSession(session, pausedAtMs)` e `resumeGuidedSession(session, resumedAtMs)`.
- Preserves: fases existentes e clamp de `durationMin` entre 1 e 600.

- [ ] **Step 1: Write the failing active-interval test**

Adicionar imports de `pauseGuidedSession` e `resumeGuidedSession` e o teste:

```ts
it('soma somente os intervalos ativos separados por salvar e retomar', () => {
  const created = createGuidedSession(day, 1_000);
  const paused = pauseGuidedSession(created, 61_000);
  const resumed = resumeGuidedSession(paused, 3_661_000);

  expect(paused).toMatchObject({
    phase: 'set',
    activeDurationMs: 60_000,
    activeSinceMs: null,
  });
  expect(resumed).toMatchObject({
    phase: 'set',
    activeDurationMs: 60_000,
    activeSinceMs: 3_661_000,
  });
  expect(buildSessionSummary(resumed, 3_721_000).durationMin).toBe(2);
});
```

- [ ] **Step 2: Run RED**

Run: `corepack.cmd pnpm --dir apps/mobile test src/application/workouts/guided-session.test.ts`

Expected: FAIL porque os campos e as funções de pausa/retomada não existem.

- [ ] **Step 3: Implement the minimal clock state**

Adicionar os campos e funções com estes contratos:

```ts
export type GuidedSession = {
  version: 2;
  workoutDayId: string;
  startedAtMs: number;
  updatedAtMs: number;
  activeDurationMs: number;
  activeSinceMs: number | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  phase: GuidedSessionPhase;
  restEndsAtMs: number | null;
  sets: WorkoutSetState[];
};

export function pauseGuidedSession(session: GuidedSession, pausedAtMs: number): GuidedSession {
  if (session.activeSinceMs === null) return session;
  return {
    ...session,
    activeDurationMs:
      session.activeDurationMs + Math.max(0, pausedAtMs - session.activeSinceMs),
    activeSinceMs: null,
    updatedAtMs: pausedAtMs,
  };
}

export function resumeGuidedSession(session: GuidedSession, resumedAtMs: number): GuidedSession {
  if (session.activeSinceMs !== null || session.phase === 'summary') return session;
  return { ...session, activeSinceMs: resumedAtMs, updatedAtMs: resumedAtMs };
}
```

Inicializar `activeDurationMs: 0` e `activeSinceMs: startedAtMs`. Calcular o resumo com `activeDurationMs + max(0, finishedAtMs - activeSinceMs)`.

- [ ] **Step 4: Run GREEN and the domain suite**

Run: `corepack.cmd pnpm --dir apps/mobile test src/application/workouts/guided-session.test.ts`

Expected: PASS, incluindo os testes existentes atualizados para `version: 2`.

- [ ] **Step 5: Commit**

```powershell
git add -- apps/mobile/src/application/workouts/guided-session.ts apps/mobile/src/application/workouts/guided-session.test.ts
git commit -m "fix(mobile): contabiliza somente tempo ativo do treino"
```

---

### Task 2: Registro versionado com snapshot e migração legada

**Files:**
- Modify: `apps/mobile/src/application/workouts/today-workout.ts`
- Modify: `apps/mobile/src/lib/workout-session-storage.ts`
- Test: `apps/mobile/src/lib/workout-session-storage.test.ts`

**Interfaces:**
- Consumes: `GuidedSession` versão 2 da Task 1.
- Produces: export de `WorkoutDay` em `today-workout.ts`.
- Produces: `StoredWorkoutSession` discriminado por `kind: 'active' | 'legacy'`.
- Produces: `save(authUserId, day, session)` e `load(authUserId, workoutDayId)`.

- [ ] **Step 1: Write failing storage and migration tests**

Usar um `day` válido derivado do contrato já usado em `today-workout.test.ts` e adicionar:

```ts
it('salva e restaura sessão ativa com proprietário e snapshot validado', async () => {
  const storage = memoryStorage();
  const adapter = createWorkoutSessionStorage(storage);

  await adapter.save('user-a', day, sessionV2);

  await expect(adapter.load('user-a', 'day-a')).resolves.toEqual({
    kind: 'active',
    version: 2,
    ownerAuthUserId: 'user-a',
    day,
    session: sessionV2,
  });
});

it('normaliza o relógio de um rascunho legado sem apagar seu progresso', async () => {
  const key = workoutSessionKey('user-a', 'day-a');
  const storage = memoryStorage({ [key]: JSON.stringify(legacySessionV1) });
  const adapter = createWorkoutSessionStorage(storage);

  await expect(adapter.load('user-a', 'day-a')).resolves.toMatchObject({
    kind: 'legacy',
    session: {
      version: 2,
      activeDurationMs: 1_000,
      activeSinceMs: null,
      sets: legacySessionV1.sets,
    },
  });
  expect(storage.removeItem).not.toHaveBeenCalled();
});
```

Também adicionar casos que rejeitam owner diferente, snapshot cujo `id` difere da sessão, `activeDurationMs` negativo e `activeSinceMs` inválido.

- [ ] **Step 2: Run RED**

Run: `corepack.cmd pnpm --dir apps/mobile test src/lib/workout-session-storage.test.ts`

Expected: FAIL porque o envelope, a migração e a nova assinatura de `save` não existem.

- [ ] **Step 3: Implement schemas and adapter**

Exportar `WorkoutDay` e implementar os contratos:

```ts
export type StoredWorkoutSession =
  | {
      kind: 'active';
      version: 2;
      ownerAuthUserId: string;
      day: WorkoutDay;
      session: GuidedSession;
    }
  | {
      kind: 'legacy';
      version: 1;
      session: GuidedSession;
    };

export type WorkoutSessionStorage = {
  load: (authUserId: string, workoutDayId: string) => Promise<StoredWorkoutSession | null>;
  remove: (authUserId: string, workoutDayId: string) => Promise<void>;
  save: (authUserId: string, day: WorkoutDay, session: GuidedSession) => Promise<void>;
};
```

O schema v2 deve validar `workoutDayFullSchema`, owner, correspondência dos IDs e todos os campos do relógio. O schema v1 deve aceitar somente o formato antigo estrito e normalizar para sessão v2 sem chamar `removeItem`.

- [ ] **Step 4: Run GREEN and affected domain tests**

Run: `corepack.cmd pnpm --dir apps/mobile test src/lib/workout-session-storage.test.ts src/application/workouts/today-workout.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- apps/mobile/src/application/workouts/today-workout.ts apps/mobile/src/lib/workout-session-storage.ts apps/mobile/src/lib/workout-session-storage.test.ts
git commit -m "fix(mobile): persiste snapshot validado da sessao"
```

---

### Task 3: Requester vinculado ao cookie Better Auth

**Files:**
- Modify: `apps/mobile/src/lib/api.ts`
- Test: `apps/mobile/src/lib/api.test.ts`

**Interfaces:**
- Produces: `ApiRequester` com a assinatura atual de `request`.
- Produces: `ApiClient.bindCurrentSession(): ApiRequester`.
- Preserves: `ApiClient.request()` dinâmico para as chamadas comuns.

- [ ] **Step 1: Write failing cookie-binding tests**

Alterar o helper de teste para aceitar `getCookie` mutável e adicionar:

```ts
it('mantém o cookie capturado em todas as requests vinculadas', async () => {
  let cookie = 'session=A';
  const fetcher = vi
    .fn<Fetcher>()
    .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  const client = createClient({ fetcher, getCookie: () => cookie });
  const bound = client.bindCurrentSession();

  await bound.request('/workout-logs', { method: 'POST' });
  cookie = 'session=B';
  await bound.request('/workout-logs/log-a/finish', { method: 'PATCH' });

  expect(fetcher.mock.calls.map(([, init]) => (init?.headers as Headers).get('cookie'))).toEqual([
    'session=A',
    'session=A',
  ]);
});

it('não encerra B quando um requester capturado de A recebe 401 tardio', async () => {
  let cookie = 'session=A';
  const onUnauthorized = vi.fn();
  const fetcher = vi.fn<Fetcher>().mockResolvedValue(
    new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
  );
  const client = createClient({ fetcher, getCookie: () => cookie, onUnauthorized });
  const bound = client.bindCurrentSession();
  cookie = 'session=B';

  await expect(bound.request('/workout-logs/log-a/finish')).rejects.toBeInstanceOf(ApiError);
  expect(onUnauthorized).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run RED**

Run: `corepack.cmd pnpm --dir apps/mobile test src/lib/api.test.ts`

Expected: FAIL porque `bindCurrentSession` não existe.

- [ ] **Step 3: Implement the bound requester**

Adicionar:

```ts
export type ApiRequester = Pick<ApiClient, 'request'>;

bindCurrentSession(): ApiRequester {
  const capturedCookie = this.getCookie().trim();
  if (!capturedCookie) throw new ApiError('unauthorized', 401);
  return {
    request: <T>(path: string, init: RequestInit = {}, options: ApiRequestOptions = {}) =>
      this.requestWithCookie<T>(path, init, options, capturedCookie),
  };
}
```

Extrair a implementação HTTP para `requestWithCookie`. Em resposta 401, chamar `notifyUnauthorized()` somente quando `this.getCookie().trim() === capturedCookie`; a request comum continua capturando o cookie a cada chamada.

- [ ] **Step 4: Run GREEN**

Run: `corepack.cmd pnpm --dir apps/mobile test src/lib/api.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- apps/mobile/src/lib/api.ts apps/mobile/src/lib/api.test.ts
git commit -m "fix(mobile): vincula conclusao a uma sessao auth"
```

---

### Task 4: Journal durável e isolado de conclusão

**Files:**
- Modify: `apps/mobile/src/lib/log-queue.ts`
- Modify: `apps/mobile/src/application/workouts/workout-log.ts`
- Modify: `apps/mobile/src/components/queue-drain.tsx`
- Test: `apps/mobile/src/lib/log-queue.test.ts`
- Test: `apps/mobile/src/application/workouts/workout-log.test.ts`

**Interfaces:**
- Consumes: `ApiClient.bindCurrentSession()` da Task 3.
- Produces: `WorkoutLogOperation` com etapas `create`, `finish` e `terminal`.
- Produces: `createWorkoutLogJournal(storage)` com `ensure`, `get`, `hasForDay`, `drain` e `pruneTerminalsBefore`.
- Changes: `finishWorkoutWithOfflineFallback` persiste antes da rede e recebe owner/requester.

- [ ] **Step 1: Write failing journal transition tests**

Substituir expectativas da fila antiga por testes comportamentais:

```ts
it('persiste create antes do POST e finish antes do PATCH', async () => {
  const storage = memoryStorage();
  const journal = createWorkoutLogJournal(storage);
  const requester = {
    request: vi
      .fn()
      .mockResolvedValueOnce({ id: 'log-a' })
      .mockResolvedValueOnce(null),
  };
  const operation = workoutLogOperation({ ownerAuthUserId: 'user-a' });

  await journal.ensure(operation);
  await journal.drain('user-a', () => requester);

  expect(storage.setItem.mock.calls.map(([, value]) => value)).toEqual([
    expect.stringContaining('"kind":"create"'),
    expect.stringContaining('"kind":"finish"'),
    expect.stringContaining('"kind":"terminal"'),
  ]);
  expect(requester.request).toHaveBeenCalledTimes(2);
});

it('retoma finish executando somente PATCH e nunca processa operação de outro usuário', async () => {
  const operation = workoutLogOperation({
    ownerAuthUserId: 'user-a',
    stage: { kind: 'finish', workoutLogId: 'log-a' },
  });
  const storage = memoryStorage({ muvit_workout_log_journal: JSON.stringify([operation]) });
  const journal = createWorkoutLogJournal(storage);
  const requester = { request: vi.fn().mockResolvedValue(null) };

  await journal.drain('user-b', () => requester);
  expect(requester.request).not.toHaveBeenCalled();
  await journal.drain('user-a', () => requester);
  expect(requester.request).toHaveBeenCalledWith('/workout-logs/log-a/finish', expect.anything());
});
```

Adicionar teste de `hasForDay` por owner/data/dia e serialização de duas chamadas concorrentes de `ensure`/`drain`.

- [ ] **Step 2: Run journal RED**

Run: `corepack.cmd pnpm --dir apps/mobile test src/lib/log-queue.test.ts`

Expected: FAIL porque o journal e as etapas não existem.

- [ ] **Step 3: Implement journal schemas and serialized writes**

Implementar:

```ts
export type WorkoutLogOperation = {
  version: 1;
  operationId: string;
  ownerAuthUserId: string;
  workoutDayId: string;
  date: string;
  finish: FinishWorkoutLogInput;
  stage:
    | { kind: 'create' }
    | { kind: 'finish'; workoutLogId: string }
    | { kind: 'terminal' };
};

export type WorkoutLogJournal = {
  ensure: (operation: WorkoutLogOperation) => Promise<WorkoutLogOperation>;
  get: (operationId: string) => Promise<WorkoutLogOperation | null>;
  hasForDay: (ownerAuthUserId: string, date: string, workoutDayId: string) => Promise<boolean>;
  drain: (ownerAuthUserId: string, bindRequester: () => ApiRequester) => Promise<void>;
  pruneTerminalsBefore: (ownerAuthUserId: string, date: string) => Promise<void>;
};
```

Usar uma cadeia de promises privada por instância para serializar todas as operações read-modify-write. Validar JSON com Zod antes de usar. `ensure` deve ser idempotente por `operationId`.

- [ ] **Step 4: Write RED for persistence-before-network**

Adicionar a `workout-log.test.ts`:

```ts
it('não inicia request quando o journal falha ao persistir', async () => {
  const journal = {
    ensure: vi.fn().mockRejectedValue(new Error('storage indisponível')),
    drain: vi.fn(),
  };
  const bindRequester = vi.fn();

  await expect(
    finishWorkoutWithOfflineFallback({
      ownerAuthUserId: 'user-a',
      journal,
      bindRequester,
      workoutDayId: 'day-a',
      date: '2026-08-27',
      durationMin: 45,
      sets,
    }),
  ).rejects.toThrow('storage indisponível');
  expect(bindRequester).not.toHaveBeenCalled();
});
```

- [ ] **Step 5: Implement application integration and QueueDrain**

`finishWorkoutWithOfflineFallback` deve construir `operationId` determinístico `${ownerAuthUserId}:${date}:${workoutDayId}`, chamar `journal.ensure` antes de `journal.drain` e retornar `{ queued: operation.stage.kind !== 'terminal' }` após reler a operação. `QueueDrain` deve obter `authUserId` via `authClient.useSession()`, podar terminais anteriores à data corrente e drenar somente esse proprietário com `api.bindCurrentSession()`.

- [ ] **Step 6: Run GREEN**

Run: `corepack.cmd pnpm --dir apps/mobile test src/lib/log-queue.test.ts src/application/workouts/workout-log.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- apps/mobile/src/lib/log-queue.ts apps/mobile/src/lib/log-queue.test.ts apps/mobile/src/application/workouts/workout-log.ts apps/mobile/src/application/workouts/workout-log.test.ts apps/mobile/src/components/queue-drain.tsx
git commit -m "fix(mobile): torna conclusao duravel e isolada por usuario"
```

---

### Task 5: Integração offline, tombstone e remount

**Files:**
- Modify: `apps/mobile/src/lib/use-guided-workout-session.ts`
- Modify: `apps/mobile/src/screens/today-workout.tsx`
- Modify: `apps/mobile/src/screens/log-workout.tsx`
- Test: `apps/mobile/src/screens/today-workout.test.tsx`
- Test: `apps/mobile/src/screens/log-workout.test.tsx`

**Interfaces:**
- Consumes: storage versionado da Task 2.
- Consumes: relógio da Task 1 e journal da Task 4.
- Produces: retomada local sem API, pausa no save, bloqueio por operação e conclusão sem duplicação.

- [ ] **Step 1: Write RED for offline resume**

Adicionar ao teste da tela de sessão um registro v2 com snapshot, fazer a API rejeitar com `ApiTransportError` e afirmar:

```ts
expect(await screen.findByText('Treino em andamento')).toBeTruthy();
expect(api.request).not.toHaveBeenCalled();
expect(screen.getByText(day.exercises[0].exercise.name)).toBeTruthy();
```

- [ ] **Step 2: Run offline RED**

Run: `corepack.cmd pnpm --dir apps/mobile test src/screens/log-workout.test.tsx -t "retoma offline"`

Expected: FAIL porque o hook ainda consulta `loadWorkoutDay()` antes do storage.

- [ ] **Step 3: Load storage before network and migrate legacy records**

Na query do hook:

```ts
const stored = await sessionStorage.load(authUserId, dayId);
if (stored?.kind === 'active') {
  const resumed = resumeGuidedSession(stored.session, nowRef.current());
  await sessionStorage.save(authUserId, stored.day, resumed);
  return { day: stored.day, session: resumed, ...capturedLifecycle };
}
```

Para `kind: 'legacy'`, procurar primeiro `today-workout:${authUserId}` com `normalizeCachedTodayWorkout`; se o cache contiver o dia compatível, salvar o envelope v2. Consultar `loadWorkoutDay` somente quando não houver snapshot local utilizável.

- [ ] **Step 4: Write RED for paused duration through remount**

No teste com relógio controlado: salvar aos 60 segundos, remontar uma hora depois, finalizar após mais 60 segundos e verificar que o PATCH contém `durationMin: 2`.

- [ ] **Step 5: Pause on save and persist every transition with day**

Dentro da fila de persistência de `saveDraft`, derivar `paused = pauseGuidedSession(current, nowRef.current())`, persistir `paused` com `dayRef.current`, e somente então atualizar refs/cache. Todos os demais `sessionStorage.save` devem receber o `day` validado correspondente.

- [ ] **Step 6: Write RED for failed draft removal and remount**

Adicionar teste completo:

```ts
expect(postRequests).toHaveLength(1);
expect(screen.queryByRole('button', { name: 'Concluir e finalizar treino' })).toBeNull();
expect(screen.queryByRole('button', { name: 'Continuar treino' })).toBeNull();
```

O arranjo deve concluir, fazer `removeItem` rejeitar para a chave do draft, desmontar, criar novo `QueryClient`, remontar Hoje e tentar abrir novamente.

- [ ] **Step 7: Integrate journal guards and completion**

Antes de restaurar/criar sessão, chamar `journal.hasForDay(authUserId, todayIsoDate(), dayId)`. Se houver operação, não expor sessão finalizável. Em Hoje, representar esse caso como treino concluído localmente e não renderizar botões “Continuar treino” ou “Iniciar treino”. Na conclusão, usar o journal da Task 4; a falha de `remove` mantém apenas o aviso, pois a operação durável bloqueia nova submissão.

- [ ] **Step 8: Run GREEN and core coverage**

Run: `corepack.cmd pnpm --dir apps/mobile test src/screens/today-workout.test.tsx src/screens/log-workout.test.tsx`

Run: `corepack.cmd pnpm --dir apps/mobile test:coverage:core`

Expected: PASS e cobertura core mínima de 85%.

- [ ] **Step 9: Commit**

```powershell
git add -- apps/mobile/src/lib/use-guided-workout-session.ts apps/mobile/src/screens/today-workout.tsx apps/mobile/src/screens/today-workout.test.tsx apps/mobile/src/screens/log-workout.tsx apps/mobile/src/screens/log-workout.test.tsx
git commit -m "fix(mobile): restaura e conclui treino com seguranca offline"
```

---

### Task 6: Inset da tab bar flutuante

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/mobile/src/components/ui/screen.tsx`
- Test: `apps/mobile/src/components/ui/ui.test.tsx`

**Interfaces:**
- Produces: `Screen` aplica `tabBarHeight + spacing.lg` somente quando `BottomTabBarHeightContext` existe.
- Preserves: estilos fornecidos pelo chamador e comportamento fora de `(tabs)`.

- [ ] **Step 1: Add the direct dependency**

Run: `corepack.cmd pnpm --dir apps/mobile add @react-navigation/bottom-tabs@7.16.0`

Expected: `apps/mobile/package.json` e `pnpm-lock.yaml` registram a dependência já usada transitivamente pelo Expo Router.

- [ ] **Step 2: Write failing Screen inset tests**

Adicionar imports de `BottomTabBarHeightContext`, `Screen` e `spacing`:

```tsx
it('reserva espaço para a tab bar absoluta somente dentro das tabs', () => {
  const withTabs = render(
    <BottomTabBarHeightContext.Provider value={64}>
      <Screen scroll>Conteúdo</Screen>
    </BottomTabBarHeightContext.Provider>,
  );
  expect(withTabs.UNSAFE_getByType(ScrollView).props.contentContainerStyle).toEqual(
    expect.arrayContaining([expect.objectContaining({ paddingBottom: 64 + spacing.lg })]),
  );

  const outsideTabs = render(<Screen scroll>Conteúdo</Screen>);
  expect(outsideTabs.UNSAFE_getByType(ScrollView).props.contentContainerStyle).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ paddingBottom: 64 + spacing.lg })]),
  );
});
```

- [ ] **Step 3: Run RED**

Run: `corepack.cmd pnpm --dir apps/mobile test src/components/ui/ui.test.tsx`

Expected: FAIL porque `Screen` não consome o contexto.

- [ ] **Step 4: Implement contextual padding**

Usar `useContext(BottomTabBarHeightContext)` e adicionar por último ao array de `contentContainerStyle`:

```tsx
const tabBarHeight = useContext(BottomTabBarHeightContext);
const tabBarInset =
  typeof tabBarHeight === 'number' ? { paddingBottom: tabBarHeight + spacing.lg } : undefined;

contentContainerStyle={[
  { gap: spacing.lg, padding: spacing.xxl },
  contentContainerStyle,
  tabBarInset,
]}
```

- [ ] **Step 5: Run GREEN and affected screen tests**

Run: `corepack.cmd pnpm --dir apps/mobile test src/components/ui/ui.test.tsx src/screens/today-workout.test.tsx src/screens/progress.test.tsx src/screens/profile.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- apps/mobile/package.json pnpm-lock.yaml apps/mobile/src/components/ui/screen.tsx apps/mobile/src/components/ui/ui.test.tsx
git commit -m "fix(mobile): reserva espaco para tab bar flutuante"
```

---

### Task 7: Suíte mobile obrigatória na CI

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: job `test-mobile` executando a suíte Vitest mobile em pull requests.
- Preserves: jobs `check`, `build` e `typecheck` existentes.

- [ ] **Step 1: Add the CI job**

Adicionar após `check`:

```yaml
  test-mobile:
    name: Test (Mobile)
    runs-on: ubuntu-latest
    needs: check
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run mobile tests
        run: pnpm --dir apps/mobile test
```

Alterar `build.needs` para `[check, test-mobile]`, impedindo build após falha da suíte.

- [ ] **Step 2: Validate workflow and repository lint**

Run: `corepack.cmd pnpm lint`

Expected: PASS.

Run: `git diff --check -- .github/workflows/ci.yml`

Expected: sem saída e exit code 0.

- [ ] **Step 3: Commit**

```powershell
git add -- .github/workflows/ci.yml
git commit -m "ci: executa testes mobile em pull requests"
```

---

### Task 8: Verificação integrada e documentação operacional

**Files:**
- Modify only if required by an implemented recurring contract: `apps/mobile/AGENTS.md`
- Verify: all files changed since `cad4636`

**Interfaces:**
- Consumes: Tasks 1–7.
- Produces: evidência reproduzível e documentação local somente se uma nova regra operacional recorrente foi criada.

- [ ] **Step 1: Run the complete mobile suite**

Run: `corepack.cmd pnpm --dir apps/mobile test`

Expected: todos os arquivos e testes passam, sem warnings novos.

- [ ] **Step 2: Run coverage, typecheck and doctor**

Run: `corepack.cmd pnpm --dir apps/mobile test:coverage:core`

Expected: PASS com cobertura mínima de 85%.

Run: `corepack.cmd pnpm --dir apps/mobile typecheck`

Expected: PASS.

Run: `corepack.cmd pnpm --dir apps/mobile doctor`

Expected: PASS; se houver falha externa do check de versões Expo, registrar comando, código e saída sem afirmar sucesso.

- [ ] **Step 3: Run repository checks**

Run: `corepack.cmd pnpm lint`

Run: `git diff --check cad4636..HEAD`

Run: `git diff --name-only cad4636..HEAD | ForEach-Object { Select-String -Path $_ -Pattern '\\u[0-9A-Fa-f]{4}' }`

Expected: lint passa, diff check sem saída e nenhuma sequência Unicode usada para acentuação.

- [ ] **Step 4: Inspect the Expo flow when a target is available**

Run: `corepack.cmd pnpm --dir apps/mobile start`

Verificar em uma plataforma alvo: retomada offline, salvar/sair/retomar, conclusão, rolagem final de Hoje/Progresso/Perfil e ações acima da tab bar. Se simulador ou dispositivo não estiver disponível, registrar essa limitação e não substituir por uma afirmação visual.

- [ ] **Step 5: Commit operational documentation only when changed**

Se os contratos recorrentes exigirem atualização do manual:

```powershell
git add -- apps/mobile/AGENTS.md
git commit -m "docs(mobile): registra invariantes de sessao offline"
```

Se `apps/mobile/AGENTS.md` já cobrir as regras sem ambiguidade, não criar commit vazio.
