# MUV-16 — Acesso e navegação do professor no mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar estruturalmente as experiências mobile de aluno e treinador por role, habilitando o shell do treinador sem montar efeitos ou rotas exclusivas do aluno.

**Architecture:** Uma política pura em `src/application/navigation` resolverá role, área da rota, destino inicial e decisão de acesso. O root layout protegerá a árvore inteira, enquanto layouts `(student)` e `(trainer)` reforçarão o boundary antes de montar seus shells; `QueueDrain` e `PushTokenRegistration` ficarão exclusivamente no layout do aluno. O treinador usará o namespace visível `/trainer`, com tabs `Início`, `Alunos` e `Perfil`, telas de navegação mínimas e primitives visuais compartilhados.

**Tech Stack:** Expo Router 6, Expo 54, React Native 0.81, TypeScript estrito, Vitest, React Native Testing Library, Better Auth, TanStack Query, Biome e tokens de `apps/mobile/src/lib/styles.ts`.

**Spec:** `docs/superpowers/specs/2026-08-31-muv-16-role-navigation-design.md`

## Global Constraints

- A sessão Better Auth continua sendo a única fonte de identidade, role e cookie; não criar store, token ou seletor manual de role.
- Não haverá mudança no backend, schema, validators, contratos, payloads ou dependências.
- As URLs externas existentes do aluno permanecem estáveis; o namespace visível do treinador será `/trainer`.
- A role `student` mantém Hoje, Progresso e Perfil; a role `trainer` recebe Início, Alunos e Perfil.
- `QueueDrain`, `PushTokenRegistration`, cache, journal, queries e rotas `/students/me/*` permanecem exclusivos da experiência do aluno.
- O treinador não receberá busca, CRUD, avaliações, gestão de treinos, gestão de exercícios ou dados de negócio antecipados da MUV-17.
- Papel ausente ou desconhecido em sessão existente nunca será assumido como aluno ou treinador; a árvore protegida permanece bloqueada e oferece encerramento seguro.
- Reutilizar `Screen`, `ScreenHeader`, `StatePanel`, `InlineMessage`, `AppButton`, `Card`, `src/lib/styles.ts` e os componentes existentes antes de criar primitives equivalentes.
- Todo texto novo será pt-BR com acentuação UTF-8 literal; não inserir sequências `\\u` para representar texto visível.
- Módulos em `src/application` não importarão React Native, Expo Router, screens ou componentes.
- Executar comandos a partir da raiz do repositório usando `pnpm.cmd` quando o comando for do workspace mobile.

## Mapa de arquivos e responsabilidades

- Criar `apps/mobile/src/application/navigation/role-navigation.ts`: política pura de role, área da rota, destinos canônicos e decisões de acesso.
- Criar `apps/mobile/src/application/navigation/role-navigation.test.ts`: testes unitários da política sem React Native ou Expo Router.
- Criar `apps/mobile/src/components/navigation/role-guard.tsx`: integração da política com `authClient.useSession()` e `Redirect` para layouts protegidos.
- Criar `apps/mobile/src/components/navigation/unsupported-role-boundary.tsx`: bloqueio explícito e logout recuperável para role desconhecida.
- Criar `apps/mobile/src/components/navigation/role-guard.test.tsx` e `unsupported-role-boundary.test.tsx`: testes isolados dos boundaries.
- Criar `apps/mobile/src/components/navigation/app-tabs.tsx`: shell de tabs parametrizado, com tokens e comportamento visual já consolidado.
- Criar `apps/mobile/src/components/navigation/app-tabs.test.tsx`: teste do shell compartilhado, labels, ícones, estilo e acessibilidade.
- Criar `apps/mobile/src/screens/trainer-section.tsx`: tela mínima reutilizável para Início e Alunos, sem dados ou efeitos de negócio.
- Criar `apps/mobile/src/screens/trainer-section.test.tsx`: teste das superfícies mínimas do treinador.
- Modificar `apps/mobile/app/_layout.tsx`: deixar apenas infraestrutura global, resolução de acesso e `Slot`; remover imports de efeitos do aluno.
- Criar `apps/mobile/app/(student)/_layout.tsx`: guard do aluno, `Stack` do aluno e montagem de fila offline/push.
- Criar `apps/mobile/app/(student)/(tabs)/_layout.tsx`, `index.tsx`, `progress.tsx` e `profile.tsx`: rotas atuais do aluno sob o boundary estrutural.
- Criar `apps/mobile/app/(student)/log/[dayId].tsx`, `session/[dayId].tsx` e `new-assessment.tsx`: rotas de treino do aluno sob o mesmo boundary.
- Criar `apps/mobile/app/(trainer)/_layout.tsx`: guard estrutural do treinador.
- Criar `apps/mobile/app/(trainer)/trainer/_layout.tsx`, `index.tsx`, `students.tsx` e `profile.tsx`: shell e destinos visíveis do treinador.
- Modificar `apps/mobile/app/(auth)/login.tsx` e `signup.tsx`: encaminhamento por destino resolvido, mantendo cadastro somente de aluno.
- Modificar `apps/mobile/src/screens/profile.tsx`: tornar o conteúdo de conta configurável sem duplicar o logout.
- Modificar `apps/mobile/src/screens/log-workout.tsx`: usar o destino canônico do shell de aluno nos retornos.
- Modificar `apps/mobile/src/__tests__/root-layout.test.tsx`, `auth-screens.test.tsx`, `tabs-layout.test.tsx` e `screens/log-workout.test.tsx`: atualizar destinos e cobrir role/isolamento.
- Criar `apps/mobile/src/__tests__/trainer-tabs-layout.test.tsx` e `trainer-screens.test.tsx`: cobrir o shell e superfícies do treinador.

---

### Task 1: Implementar a política pura de role e navegação

**Files:**
- Create: `apps/mobile/src/application/navigation/role-navigation.ts`
- Test: `apps/mobile/src/application/navigation/role-navigation.test.ts`

**Interfaces:**
- Produces `MobileRole`, `RouteArea`, `mobileRoutes`, `resolveMobileRole(value: unknown): MobileRole | null`, `resolveInitialRoute(role: unknown): string | null`, `resolveRouteArea(segments: readonly string[]): RouteArea` e `resolveRouteAccess(input: RouteAccessInput): RouteAccessDecision`.
- `mobileRoutes` terá `login: '/(auth)/login'`, `studentHome: '/(student)/(tabs)'` e `trainerHome: '/(trainer)/trainer'`.
- `RouteAccessDecision` será `{ kind: 'allow' }`, `{ kind: 'redirect'; href: string; reason: 'unauthenticated' | 'wrong-role' }` ou `{ kind: 'unsupported-role'; href: '/(auth)/login' }`.

- [ ] **Step 1: Escrever os testes falhando da política**

Adicionar testes sem imports de UI que fixem os casos abaixo:

```ts
import { describe, expect, it } from 'vitest';
import {
  mobileRoutes,
  resolveInitialRoute,
  resolveMobileRole,
  resolveRouteAccess,
  resolveRouteArea,
} from './role-navigation';

describe('política de navegação por role', () => {
  it('aceita somente student e trainer', () => {
    expect(resolveMobileRole('student')).toBe('student');
    expect(resolveMobileRole('trainer')).toBe('trainer');
    expect(resolveMobileRole('admin')).toBeNull();
    expect(resolveMobileRole(undefined)).toBeNull();
  });

  it('resolve as áreas a partir dos grupos do Expo Router', () => {
    expect(resolveRouteArea(['(auth)', 'login'])).toBe('auth');
    expect(resolveRouteArea(['(student)', '(tabs)', 'index'])).toBe('student');
    expect(resolveRouteArea(['(trainer)', 'trainer', '(tabs)'])).toBe('trainer');
    expect(resolveRouteArea(['outside'])).toBe('unknown');
  });

  it('retorna o início correto de cada role', () => {
    expect(resolveInitialRoute('student')).toBe(mobileRoutes.studentHome);
    expect(resolveInitialRoute('trainer')).toBe(mobileRoutes.trainerHome);
    expect(resolveInitialRoute('legacy')).toBeNull();
  });

  it('protege visitante, troca a role oposta e bloqueia papel desconhecido', () => {
    expect(resolveRouteAccess({ isAuthenticated: false, role: undefined, area: 'student' })).toEqual({
      kind: 'redirect',
      href: mobileRoutes.login,
      reason: 'unauthenticated',
    });
    expect(resolveRouteAccess({ isAuthenticated: true, role: 'student', area: 'trainer' })).toEqual({
      kind: 'redirect',
      href: mobileRoutes.studentHome,
      reason: 'wrong-role',
    });
    expect(resolveRouteAccess({ isAuthenticated: true, role: 'trainer', area: 'student' })).toEqual({
      kind: 'redirect',
      href: mobileRoutes.trainerHome,
      reason: 'wrong-role',
    });
    expect(resolveRouteAccess({ isAuthenticated: true, role: 'unknown', area: 'student' })).toEqual({
      kind: 'unsupported-role',
      href: mobileRoutes.login,
    });
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: `pnpm.cmd --dir apps/mobile test src/application/navigation/role-navigation.test.ts`

Expected: FAIL por módulo ausente `./role-navigation`.

- [ ] **Step 3: Implementar a política mínima**

Criar o módulo sem dependências de framework:

```ts
export type MobileRole = 'student' | 'trainer';
export type RouteArea = 'auth' | 'student' | 'trainer' | 'unknown';

export const mobileRoutes = {
  login: '/(auth)/login',
  studentHome: '/(student)/(tabs)',
  trainerHome: '/(trainer)/trainer',
} as const;

export type RouteAccessInput = {
  isAuthenticated: boolean;
  role: unknown;
  area: RouteArea;
};

export type RouteAccessDecision =
  | { kind: 'allow' }
  | { kind: 'redirect'; href: string; reason: 'unauthenticated' | 'wrong-role' }
  | { kind: 'unsupported-role'; href: typeof mobileRoutes.login };

export function resolveMobileRole(value: unknown): MobileRole | null {
  if (value === 'student' || value === 'trainer') return value;
  return null;
}

export function resolveInitialRoute(role: unknown): string | null {
  const resolvedRole = resolveMobileRole(role);
  if (resolvedRole === 'student') return mobileRoutes.studentHome;
  if (resolvedRole === 'trainer') return mobileRoutes.trainerHome;
  return null;
}

export function resolveRouteArea(segments: readonly string[]): RouteArea {
  if (segments.includes('(auth)')) return 'auth';
  if (segments.includes('(student)')) return 'student';
  if (segments.includes('(trainer)')) return 'trainer';
  return 'unknown';
}

export function resolveRouteAccess(input: RouteAccessInput): RouteAccessDecision {
  if (!input.isAuthenticated) {
    return input.area === 'auth'
      ? { kind: 'allow' }
      : { kind: 'redirect', href: mobileRoutes.login, reason: 'unauthenticated' };
  }

  const role = resolveMobileRole(input.role);
  if (!role) return { kind: 'unsupported-role', href: mobileRoutes.login };
  if (input.area === 'auth') {
    return {
      kind: 'redirect',
      href: role === 'student' ? mobileRoutes.studentHome : mobileRoutes.trainerHome,
      reason: 'wrong-role',
    };
  }

  const expectedArea = role === 'student' ? 'student' : 'trainer';
  if (input.area === expectedArea) return { kind: 'allow' };

  return {
    kind: 'redirect',
    href: role === 'student' ? mobileRoutes.studentHome : mobileRoutes.trainerHome,
    reason: 'wrong-role',
  };
}
```

- [ ] **Step 4: Rodar a suíte direcionada**

Run: `pnpm.cmd --dir apps/mobile test src/application/navigation/role-navigation.test.ts`

Expected: todos os testes da política passam.

- [ ] **Step 5: Commitar a unidade**

```powershell
git add -- apps/mobile/src/application/navigation/role-navigation.ts apps/mobile/src/application/navigation/role-navigation.test.ts
git commit -m "feat(mobile): centraliza politica de navegacao por role"
```

### Task 2: Criar guards e boundary para papel desconhecido

**Files:**
- Create: `apps/mobile/src/components/navigation/role-guard.tsx`
- Create: `apps/mobile/src/components/navigation/unsupported-role-boundary.tsx`
- Test: `apps/mobile/src/components/navigation/role-guard.test.tsx`
- Test: `apps/mobile/src/components/navigation/unsupported-role-boundary.test.tsx`

**Interfaces:**
- `RoleGuardProps = { expectedRole: Extract<MobileRole, 'student' | 'trainer'>; children: ReactNode }`.
- `RoleGuard` lê `authClient.useSession()`, exibe `Carregando sessão` enquanto pendente, chama `resolveRouteAccess` com a área esperada e renderiza children somente para a role correta.
- `UnsupportedRoleBoundary` nunca renderiza children protegidos; oferece `Sair e voltar ao login`, executa `authClient.signOut()`, limpa `queryClient` e navega para `mobileRoutes.login` somente no sucesso.

- [ ] **Step 1: Escrever os testes falhando dos boundaries**

Os testes devem mockar `expo-router`, `authClient`, `queryClient` e os components de UI. Fixar estes comportamentos:

```ts
it('permite o conteúdo quando a sessão corresponde ao layout', () => {
  authState.session = { data: { user: { role: 'student' } }, isPending: false };

  render(
    <RoleGuard expectedRole="student">
      <Text>conteúdo do aluno</Text>
    </RoleGuard>,
  );

  expect(screen.getByText('conteúdo do aluno')).toBeTruthy();
  expect(screen.queryByText('redirect:/(auth)/login')).toBeNull();
});

it('redireciona trainer para o próprio início ao abrir o layout de aluno', () => {
  authState.session = { data: { user: { role: 'trainer' } }, isPending: false };

  render(
    <RoleGuard expectedRole="student">
      <Text>conteúdo do aluno</Text>
    </RoleGuard>,
  );

  expect(screen.getByText(`redirect:${mobileRoutes.trainerHome}`)).toBeTruthy();
  expect(screen.queryByText('conteúdo do aluno')).toBeNull();
});

it('bloqueia role desconhecida com ação de logout', async () => {
  authState.session = { data: { user: { role: 'legacy' } }, isPending: false };

  render(
    <RoleGuard expectedRole="student">
      <Text>conteúdo protegido</Text>
    </RoleGuard>,
  );

  expect(screen.getByText('Perfil não reconhecido')).toBeTruthy();
  expect(screen.queryByText('conteúdo protegido')).toBeNull();
});
```

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: `pnpm.cmd --dir apps/mobile test src/components/navigation/role-guard.test.tsx src/components/navigation/unsupported-role-boundary.test.tsx`

Expected: FAIL por modules ausentes dos boundaries.

- [ ] **Step 3: Implementar `RoleGuard` e `UnsupportedRoleBoundary`**

`RoleGuard` deve seguir esta forma, mantendo a política fora do componente:

```tsx
export function RoleGuard({ children, expectedRole }: RoleGuardProps) {
  const session = authClient.useSession();

  if (session.isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator accessibilityLabel="Carregando sessão" color={colors.primary} />
      </View>
    );
  }

  const decision = resolveRouteAccess({
    area: expectedRole,
    isAuthenticated: Boolean(session.data),
    role: session.data?.user.role,
  });

  if (decision.kind === 'unsupported-role') return <UnsupportedRoleBoundary />;
  if (decision.kind === 'redirect') return <Redirect href={decision.href} />;
  return <>{children}</>;
}
```

`UnsupportedRoleBoundary` deve renderizar `Screen`, `StatePanel` e `InlineMessage`, com a ação de logout protegida contra segundo toque:

```tsx
async function logoutUnsupportedSession(): Promise<void> {
  if (loggingOut) return;
  setLoggingOut(true);
  setError(undefined);
  try {
    await authClient.signOut();
    router.replace(mobileRoutes.login);
  } catch {
    setError('Não foi possível encerrar esta sessão. Tente novamente.');
  } finally {
    queryClient.clear();
    setLoggingOut(false);
  }
}
```

O painel usará `title="Perfil não reconhecido"`, descrição informando que o perfil não pode acessar o app mobile e `actionLabel` com `Sair e voltar ao login`/`Saindo...`. Nenhum conteúdo de role será exibido durante falha de logout.

- [ ] **Step 4: Rodar os testes dos boundaries**

Run: `pnpm.cmd --dir apps/mobile test src/components/navigation/role-guard.test.tsx src/components/navigation/unsupported-role-boundary.test.tsx`

Expected: visitantes, role correta, role oposta, loading e role desconhecida passam; o logout bem-sucedido navega para `mobileRoutes.login` e sempre limpa o cache.

- [ ] **Step 5: Commitar os boundaries**

```powershell
git add -- apps/mobile/src/components/navigation/role-guard.tsx apps/mobile/src/components/navigation/unsupported-role-boundary.tsx apps/mobile/src/components/navigation/role-guard.test.tsx apps/mobile/src/components/navigation/unsupported-role-boundary.test.tsx
git commit -m "feat(mobile): adiciona guards de acesso por role"
```

### Task 3: Consolidar o shell de tabs e as superfícies mínimas do treinador

**Files:**
- Create: `apps/mobile/src/components/navigation/app-tabs.tsx`
- Test: `apps/mobile/src/components/navigation/app-tabs.test.tsx`
- Create: `apps/mobile/src/screens/trainer-section.tsx`
- Test: `apps/mobile/src/screens/trainer-section.test.tsx`

**Interfaces:**
- `AppTab = { name: string; title: string; icon: ComponentProps<typeof Ionicons>['name'] }`.
- `AppTabsLayoutProps = { tabs: readonly AppTab[] }`.
- `AppTabsLayout` preserva o estilo atual: pill, `colors.primarySoft` ativo, `colors.muted` inativo, `controlSizes.tabBar`, `spacing.lg` horizontal, transformação vertical e `PlatformPressable`.
- `TrainerSectionScreenProps = { title: string; subtitle: string; stateTitle: string; stateDescription: string }`.
- `TrainerSectionScreen` renderiza apenas `Screen`, `ScreenHeader` e `StatePanel`; não importa API, query client, storage, journal, push ou hooks de treino.

- [ ] **Step 1: Escrever testes falhando do shell compartilhado e da tela mínima**

O teste do shell deve renderizar três itens e verificar labels, nomes de ícones, fundo ativo, recorte pill, posição e acessibilidade. O teste da tela deve verificar que uma seção do treinador mostra sua hierarquia e mensagem sem montar query:

```tsx
it('renderiza uma seção de treinador sem dependências de domínio', () => {
  render(
    <TrainerSectionScreen
      stateDescription="A consulta de alunos será adicionada nas próximas etapas."
      stateTitle="Lista de alunos"
      subtitle="Seus alunos vinculados."
      title="Alunos"
    />,
  );

  expect(screen.getByRole('header', { name: 'Alunos' })).toBeTruthy();
  expect(screen.getByText('Lista de alunos')).toBeTruthy();
  expect(screen.getByText('A consulta de alunos será adicionada nas próximas etapas.')).toBeTruthy();
});
```

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: `pnpm.cmd --dir apps/mobile test src/components/navigation/app-tabs.test.tsx src/screens/trainer-section.test.tsx`

Expected: FAIL por modules ausentes.

- [ ] **Step 3: Implementar o shell com a foundation existente**

O componente deve concentrar somente a composição já usada pelo aluno:

```tsx
export function AppTabsLayout({ tabs }: AppTabsLayoutProps) {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primaryText,
      tabBarActiveBackgroundColor: colors.primarySoft,
      tabBarInactiveTintColor: colors.muted,
      tabBarItemStyle: { borderRadius: radii.pill },
      tabBarButton: (props) => (
        <PlatformPressable {...props} style={[props.style, { borderRadius: radii.pill }]} />
      ),
      tabBarLabelStyle: { fontFamily: fontFamilies.bodyStrong, fontSize: 12 },
      tabBarStyle: {
        position: 'absolute',
        marginHorizontal: spacing.lg,
        transform: [{ translateY: -spacing.lg }],
        height: controlSizes.tabBar,
        borderRadius: radii.pill,
        borderTopWidth: 0,
        backgroundColor: colors.surfaceTranslucent,
        paddingBottom: spacing.sm,
        paddingTop: spacing.sm,
      },
    }}>
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarLabel: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons color={color} name={tab.icon} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
```

`TrainerSectionScreen` usará `Screen scroll`, `ScreenHeader` e `StatePanel tone="empty"`, sem inventar dados, ações administrativas ou estados de API.

- [ ] **Step 4: Rodar os testes direcionados**

Run: `pnpm.cmd --dir apps/mobile test src/components/navigation/app-tabs.test.tsx src/screens/trainer-section.test.tsx`

Expected: o shell mantém a composição visual atual e a tela mínima usa somente a foundation compartilhada.

- [ ] **Step 5: Commitar os primitives e superfícies**

```powershell
git add -- apps/mobile/src/components/navigation/app-tabs.tsx apps/mobile/src/components/navigation/app-tabs.test.tsx apps/mobile/src/screens/trainer-section.tsx apps/mobile/src/screens/trainer-section.test.tsx
git commit -m "feat(mobile): cria shell compartilhado do treinador"
```

### Task 4: Separar a árvore de rotas e montar os shells protegidos

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/src/__tests__/root-layout.test.tsx`
- Modify: `apps/mobile/src/__tests__/tabs-layout.test.tsx`
- Create: `apps/mobile/src/__tests__/trainer-tabs-layout.test.tsx`
- Create: `apps/mobile/app/(student)/_layout.tsx`
- Create: `apps/mobile/app/(student)/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(student)/(tabs)/index.tsx`
- Create: `apps/mobile/app/(student)/(tabs)/progress.tsx`
- Create: `apps/mobile/app/(student)/(tabs)/profile.tsx`
- Create: `apps/mobile/app/(student)/log/[dayId].tsx`
- Create: `apps/mobile/app/(student)/session/[dayId].tsx`
- Create: `apps/mobile/app/(student)/new-assessment.tsx`
- Create: `apps/mobile/app/(trainer)/_layout.tsx`
- Create: `apps/mobile/app/(trainer)/trainer/_layout.tsx`
- Create: `apps/mobile/app/(trainer)/trainer/index.tsx`
- Create: `apps/mobile/app/(trainer)/trainer/students.tsx`
- Create: `apps/mobile/app/(trainer)/trainer/profile.tsx`
- Delete: `apps/mobile/app/(tabs)/_layout.tsx`
- Delete: `apps/mobile/app/(tabs)/index.tsx`
- Delete: `apps/mobile/app/(tabs)/progress.tsx`
- Delete: `apps/mobile/app/(tabs)/profile.tsx`
- Delete: `apps/mobile/app/log/[dayId].tsx`
- Delete: `apps/mobile/app/session/[dayId].tsx`
- Delete: `apps/mobile/app/new-assessment.tsx`

**Interfaces:**
- O root layout consumirá `resolveRouteArea`, `resolveRouteAccess` e `UnsupportedRoleBoundary`, sem importar `QueueDrain` ou `PushTokenRegistration`.
- `(student)/_layout.tsx` consumirá `RoleGuard expectedRole="student"`, `QueueDrain`, `PushTokenRegistration` e `Stack`.
- `(trainer)/_layout.tsx` consumirá `RoleGuard expectedRole="trainer"` e `Stack`, sem importar nenhum componente específico do aluno.
- O shell student usará itens `index/Hoje/calendar-outline`, `progress/Progresso/stats-chart-outline`, `profile/Perfil/person-outline`.
- O shell trainer usará itens `index/Início/home-outline`, `students/Alunos/people-outline`, `profile/Perfil/person-outline`.

- [ ] **Step 1: Escrever os testes falhando de root, shells e isolamento**

Atualizar `root-layout.test.tsx` para substituir o destino antigo por `mobileRoutes.studentHome` e adicionar os casos:

```tsx
it('encaminha trainer autenticado para o shell trainer', () => {
  authState.session.data = { user: { id: 'auth-user-id', role: 'trainer' } };
  routerState.segments = ['(auth)'];

  render(<RootLayout />);

  expect(screen.getByText(`redirect:${mobileRoutes.trainerHome}`)).toBeTruthy();
});

it('bloqueia aluno em rota trainer e trainer em rota student', () => {
  authState.session.data = { user: { id: 'auth-user-id', role: 'student' } };
  routerState.segments = ['(trainer)', 'trainer', '(tabs)'];
  const studentAttempt = render(<RootLayout />);
  expect(screen.getByText(`redirect:${mobileRoutes.studentHome}`)).toBeTruthy();
  studentAttempt.unmount();

  authState.session.data = { user: { id: 'auth-user-id', role: 'trainer' } };
  routerState.segments = ['(student)', '(tabs)'];
  render(<RootLayout />);
  expect(screen.getByText(`redirect:${mobileRoutes.trainerHome}`)).toBeTruthy();
});

it('não monta efeitos do aluno no root para sessão trainer', () => {
  authState.session.data = { user: { id: 'auth-user-id', role: 'trainer' } };
  routerState.segments = ['(trainer)', 'trainer', '(tabs)'];

  render(<RootLayout />);

  expect(screen.getByTestId('router-slot')).toBeTruthy();
  expect(screen.queryByText('queue-drain')).toBeNull();
  expect(screen.queryByText('push-registration')).toBeNull();
});

it('bloqueia role desconhecida sem montar Slot', () => {
  authState.session.data = { user: { id: 'auth-user-id', role: 'legacy' } };

  render(<RootLayout />);

  expect(screen.getByText('Perfil não reconhecido')).toBeTruthy();
  expect(screen.queryByTestId('router-slot')).toBeNull();
});
```

Adicionar teste do layout student que verifica a presença de `QueueDrain` e `PushTokenRegistration` somente dentro dele, e teste do layout trainer que renderiza o `Stack` sem esses providers. Atualizar `tabs-layout.test.tsx` para importar `app/(student)/(tabs)/_layout.tsx` e preservar todos os asserts de estilo e acessibilidade.

- [ ] **Step 2: Rodar os testes para confirmar as falhas**

Run: `pnpm.cmd --dir apps/mobile test src/__tests__/root-layout.test.tsx src/__tests__/tabs-layout.test.tsx src/__tests__/trainer-tabs-layout.test.tsx`

Expected: FAIL nos destinos e arquivos novos antes da migração da árvore.

- [ ] **Step 3: Mover as rotas atuais para `(student)` sem alterar telas de domínio**

Criar os wrappers mantendo os imports das telas atuais e apenas ajustando a profundidade relativa:

```tsx
// app/(student)/(tabs)/index.tsx
import { TodayWorkoutScreen } from '../../../src/screens/today-workout';

export default TodayWorkoutScreen;
```

Aplicar o mesmo padrão para `ProgressScreen`, `ProfileScreen`, `WorkoutOverviewScreen`, `LogWorkoutScreen` e `NewAssessmentScreen`. Não copiar lógica das telas para a árvore `app/`; os arquivos continuarão sendo apenas entrypoints.

- [ ] **Step 4: Implementar o root e os layouts protegidos**

O root deve substituir o booleano de aluno por uma decisão única:

```tsx
const decision = resolveRouteAccess({
  area: resolveRouteArea(segments),
  isAuthenticated: Boolean(session.data),
  role: session.data?.user.role,
});

if (decision.kind === 'unsupported-role') return <UnsupportedRoleBoundary />;
if (decision.kind === 'redirect') return <Redirect href={decision.href} />;

return (
  <QueryClientProvider client={queryClient}>
    <StatusBar style="dark" />
    <Slot />
  </QueryClientProvider>
);
```

O layout do aluno deve montar os efeitos somente depois do `RoleGuard` permitir:

```tsx
export default function StudentLayout() {
  return (
    <RoleGuard expectedRole="student">
      <QueueDrain />
      <PushTokenRegistration />
      <Stack screenOptions={{ headerShown: false }} />
    </RoleGuard>
  );
}
```

O layout do treinador deve conter somente `RoleGuard expectedRole="trainer"` e seu `Stack`. O layout aninhado `trainer/_layout.tsx` renderizará `AppTabsLayout` com `Início`, `Alunos` e `Perfil`. As telas de `index.tsx` e `students.tsx` usarão `TrainerSectionScreen`; `profile.tsx` será conectado na Task 5.

- [ ] **Step 5: Rodar os testes de navegação e isolamento**

Run: `pnpm.cmd --dir apps/mobile test src/__tests__/root-layout.test.tsx src/__tests__/tabs-layout.test.tsx src/__tests__/trainer-tabs-layout.test.tsx`

Expected: visitante vai para login; aluno e treinador são encaminhados aos shells próprios; deep links cruzados são redirecionados; root não monta efeitos do aluno; tabs student permanecem iguais; tabs trainer expõem exatamente `Início`, `Alunos` e `Perfil`.

- [ ] **Step 6: Commitar a árvore de rotas**

```powershell
git add -- apps/mobile/app apps/mobile/src/__tests__/root-layout.test.tsx apps/mobile/src/__tests__/tabs-layout.test.tsx apps/mobile/src/__tests__/trainer-tabs-layout.test.tsx
git commit -m "feat(mobile): separa shells de aluno e treinador"
```

### Task 5: Encaminhar login por role e generalizar o perfil sem duplicar logout

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx`
- Modify: `apps/mobile/app/(auth)/signup.tsx`
- Modify: `apps/mobile/src/screens/profile.tsx`
- Modify: `apps/mobile/src/screens/log-workout.tsx`
- Modify: `apps/mobile/src/__tests__/auth-screens.test.tsx`
- Modify: `apps/mobile/src/screens/profile.test.tsx`
- Modify: `apps/mobile/src/screens/log-workout.test.tsx`
- Create: `apps/mobile/src/__tests__/trainer-screens.test.tsx`

**Interfaces:**
- Login consumirá `resolveInitialRoute(role)` e, para role desconhecida, chamará `authClient.signOut()` e mostrará mensagem sem navegar para nenhum shell.
- Signup continuará enviando literalmente `role: 'student'` e usará `mobileRoutes.studentHome` após sucesso.
- `ProfileScreenProps` aceitará `accountType`, `fallbackName`, `fallbackInitials` e `journeyDescription`, todos com defaults de aluno para manter os consumidores existentes.
- A rota `app/(trainer)/trainer/profile.tsx` chamará `ProfileScreen` com `accountType="Treinador"`, fallback `Treinador`/`TR` e descrição de acompanhamento, sem role check dentro da tela.
- Retornos da sessão guiada usarão `mobileRoutes.studentHome`, preservando as URLs de sessão e log do aluno.

- [ ] **Step 1: Atualizar os testes de autenticação e perfil antes da implementação**

Trocar os asserts antigos de `/(tabs)` por `mobileRoutes.studentHome` e substituir o teste que rejeitava treinador por:

```tsx
it('encaminha login de treinador para o shell do treinador sem logout', async () => {
  const user = userEvent.setup();
  authState.signInEmail.mockResolvedValueOnce({
    data: { user: { role: 'trainer' } },
    error: null,
  });

  render(<LoginScreen />);
  await user.type(screen.getByLabelText('Email'), 'treinador@example.com');
  await user.type(screen.getByLabelText('Senha'), 'senha-segura');
  await user.press(screen.getByRole('button', { name: 'Entrar' }));

  await waitFor(() => {
    expect(authState.signOut).not.toHaveBeenCalled();
    expect(routerState.replace).toHaveBeenCalledWith(mobileRoutes.trainerHome);
  });
});

it('encerra sessão e informa role desconhecida recebida no login', async () => {
  const user = userEvent.setup();
  authState.signInEmail.mockResolvedValueOnce({
    data: { user: { role: 'legacy' } },
    error: null,
  });
  authState.signOut.mockResolvedValueOnce(undefined);

  render(<LoginScreen />);
  await user.type(screen.getByLabelText('Email'), 'legado@example.com');
  await user.type(screen.getByLabelText('Senha'), 'senha-segura');
  await user.press(screen.getByRole('button', { name: 'Entrar' }));

  expect(await screen.findByText('Não foi possível identificar o perfil desta conta.')).toBeTruthy();
  expect(authState.signOut).toHaveBeenCalledOnce();
  expect(routerState.replace).not.toHaveBeenCalled();
});
```

Adicionar ao teste de perfil a renderização com `accountType="Treinador"` e verificar que o texto não é `Aluno independente`, mantendo os testes atuais de logout e falha de logout.

- [ ] **Step 2: Rodar os testes para confirmar as falhas**

Run: `pnpm.cmd --dir apps/mobile test src/__tests__/auth-screens.test.tsx src/screens/profile.test.tsx src/screens/log-workout.test.tsx`

Expected: FAIL nos novos destinos, na ausência do contexto de perfil e no comportamento antigo que ainda encerra treinador.

- [ ] **Step 3: Implementar o encaminhamento de login e cadastro**

No login, após uma resposta sem erro:

```tsx
const destination = resolveInitialRoute(result.data.user.role);
if (!destination) {
  await authClient.signOut();
  setError('Não foi possível identificar o perfil desta conta.');
  return;
}

router.replace(destination);
```

No cadastro, manter `role: 'student'` e trocar somente o destino para `mobileRoutes.studentHome`. Não adicionar opção visual ou payload de cadastro de treinador.

- [ ] **Step 4: Generalizar o perfil e atualizar retornos do treino**

Alterar `ProfileScreen` para usar defaults de aluno:

```tsx
type ProfileScreenProps = {
  accountType?: string;
  fallbackName?: string;
  fallbackInitials?: string;
  journeyDescription?: string;
};

export function ProfileScreen({
  accountType = 'Aluno independente',
  fallbackInitials = 'AL',
  fallbackName = 'Aluno',
  journeyDescription = 'Seus treinos e avaliações aparecem aqui conforme você avança.',
}: ProfileScreenProps = {}) {
  // manter authClient.useSession(), logout, queryClient.clear() e estados atuais
  const displayName = user?.name?.trim() || fallbackName;
  const initials = getInitials(user?.name) || fallbackInitials;
  // renderizar accountType e journeyDescription nos pontos hoje fixos para aluno
}
```

A função `getInitials` deverá retornar apenas as iniciais calculadas ou uma string vazia quando não houver nome; o fallback recebido por `ProfileScreen` será a única fonte para o estado sem nome.

Criar a rota de perfil trainer com esse contexto e trocar os quatro `router.replace('/(tabs)')` de `log-workout.tsx` por `router.replace(mobileRoutes.studentHome)`. Não alterar os caminhos `/session/:dayId` e `/log/:dayId`.

- [ ] **Step 5: Rodar os testes de autenticação e regressão do aluno**

Run: `pnpm.cmd --dir apps/mobile test src/__tests__/auth-screens.test.tsx src/screens/profile.test.tsx src/screens/log-workout.test.tsx`

Expected: login de student continua em `mobileRoutes.studentHome`, trainer vai para `mobileRoutes.trainerHome`, role desconhecida encerra sessão com mensagem, signup continua student, perfil de ambos exibe contexto correto e logout do aluno permanece funcional.

- [ ] **Step 6: Commitar autenticação e perfil**

```powershell
git add -- 'apps/mobile/app/(auth)/login.tsx' 'apps/mobile/app/(auth)/signup.tsx' apps/mobile/src/screens/profile.tsx apps/mobile/src/screens/log-workout.tsx apps/mobile/src/__tests__/auth-screens.test.tsx apps/mobile/src/screens/profile.test.tsx apps/mobile/src/screens/log-workout.test.tsx apps/mobile/src/__tests__/trainer-screens.test.tsx
git commit -m "feat(mobile): encaminha autenticacao para o shell da role"
```

### Task 6: Executar regressão completa, lint, typecheck e validação final

**Files:**
- Verify: `apps/mobile/app` e `apps/mobile/src`
- Verify: `apps/mobile/src/application/navigation/role-navigation.ts`
- Verify: `apps/mobile/src/components/navigation`
- Verify: `docs/superpowers/specs/2026-08-31-muv-16-role-navigation-design.md`

**Interfaces:**
- Consumes o diff final, a especificação aprovada e os testes das Tasks 1–5.
- Produces evidência local de todos os critérios de aceite, sem afirmar estado de CI, PR, Linear ou runtime externo não verificado.

- [ ] **Step 1: Rodar todos os testes mobile**

Run: `pnpm.cmd --dir apps/mobile test`

Expected: exit code `0`, sem testes falhando; registrar a contagem observada no handoff.

- [ ] **Step 2: Rodar typecheck e lint**

Run: `pnpm.cmd --dir apps/mobile typecheck`

Run: `pnpm.cmd exec biome check apps/mobile`

Expected: exit code `0` nos dois comandos, sem suprimir erro de TypeScript ou Biome.

- [ ] **Step 3: Rodar o doctor do Expo e separar avisos conhecidos**

Run: `pnpm.cmd --dir apps/mobile doctor`

Expected: registrar separadamente falhas e avisos já conhecidos do ambiente Expo; não tratar warning como sucesso de typecheck/lint.

- [ ] **Step 4: Auditar rotas, imports e role checks**

Executar:

```powershell
rg -n -S "QueueDrain|PushTokenRegistration" apps/mobile/app apps/mobile/src
rg -n -S "role === 'student'|role !== 'student'|role === 'trainer'|role !== 'trainer'" apps/mobile --glob '*.ts' --glob '*.tsx'
rg -n -F "'/(tabs)'" apps/mobile
git diff --check
```

Esperado:

- imports de `QueueDrain` e `PushTokenRegistration` aparecem no layout do aluno e nos testes, nunca no root ou trainer;
- comparações de role ficam centralizadas na política, sem bloqueio ad hoc em screens;
- nenhum destino de produção continua apontando para `/(tabs)`;
- `git diff --check` não reporta erro.

- [ ] **Step 5: Conferir isolamento e árvore de arquivos**

Verificar que `app/(student)/` contém todas as rotas de treino/avaliação do aluno, `app/(trainer)/trainer/` contém somente Início/Alunos/Perfil e nenhum arquivo trainer importa `useQuery`, `AsyncStorage`, `log-queue`, `workout-session-storage`, `use-guided-workout-session`, `QueueDrain` ou `PushTokenRegistration`. Confirmar também que o `QueryClientProvider` continua global, mas nenhum efeito de aluno é montado antes do guard.

- [ ] **Step 6: Fazer inspeção visual nativa quando houver dispositivo disponível**

Consultar `adb devices` sem iniciar ou encerrar processos preexistentes. Se houver um emulador já disponível, abrir o app e verificar pelo menos login, shell student e shell trainer, incluindo labels `Hoje/Progresso/Perfil` e `Início/Alunos/Perfil`; registrar a ausência de validação visual se não houver dispositivo ou servidor disponível. Não modificar o Pencil.

- [ ] **Step 7: Procurar escapes Unicode somente nos arquivos alterados**

Executar:

```powershell
git diff --name-only --diff-filter=ACMRTUXB | ForEach-Object { rg -n '\\u[0-9a-fA-F]{4}' -- $_ }
```

Esperado: nenhuma ocorrência usada para representar caracteres visíveis; textos pt-BR permanecem como UTF-8 literal.

- [ ] **Step 8: Revisar critérios de aceite e preparar o handoff**

Revisar a especificação linha a linha contra o diff e os resultados dos comandos. Informar arquitetura, arquivos, guards, isolamento, testes, comandos e resultados observados. Listar como decisão para MUV-17 que `/trainer` e o destino `Alunos` já estão reservados, mas a consulta e gestão de alunos continuam fora desta entrega.
