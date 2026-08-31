# MUV-16 — Acesso e navegação do professor no mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar estruturalmente as experiências mobile de aluno e treinador por role, habilitando o shell do treinador sem montar efeitos ou rotas exclusivas do aluno.

**Architecture:** Uma política pura em `src/application/navigation` resolverá role, área da rota, destino inicial e decisão de acesso. O `app/_layout.tsx` será a autoridade única de autenticação, deep links e redirecionamentos; layouts `(student)` e `(trainer)` serão boundaries estruturais que apenas montam seus stacks e providers. `QueueDrain` e `PushTokenRegistration` ficarão exclusivamente no layout do aluno. O treinador usará o namespace visível `/trainer`, com tabs `Início`, `Alunos` e `Perfil`, telas de navegação mínimas e primitives visuais compartilhados.

**Tech Stack:** Expo Router 6, Expo 54, React Native 0.81, TypeScript estrito, Vitest, React Native Testing Library, Better Auth, TanStack Query, Biome e tokens de `apps/mobile/src/lib/styles.ts`.

**Spec:** `docs/superpowers/specs/2026-08-31-muv-16-role-navigation-design.md`

## Global Constraints

- A sessão Better Auth continua sendo a única fonte de identidade, role e cookie; não criar store, token ou seletor manual de role.
- Não haverá mudança no backend, schema, validators, contratos, payloads ou dependências.
- As URLs externas existentes do aluno permanecem estáveis; o namespace visível do treinador será `/trainer`.
- A role `student` mantém Hoje, Progresso e Perfil; a role `trainer` recebe Início, Alunos e Perfil.
- `QueueDrain`, `PushTokenRegistration`, cache persistido específico do domínio do aluno, journal, fila offline, workout session storage, queries de treino/aluno e rotas `/students/me/*` permanecem exclusivos da experiência do aluno.
- O `QueryClientProvider` pode permanecer global como infraestrutura compartilhada; ele não equivale a cache persistido de domínio do aluno.
- O treinador não receberá busca, CRUD, avaliações, gestão de treinos, gestão de exercícios ou queries de domínio antecipadas da MUV-17.
- Papel ausente ou desconhecido em sessão existente nunca será assumido como aluno ou treinador; a árvore protegida permanece bloqueada e oferece encerramento seguro.
- Reutilizar `Screen`, `ScreenHeader`, `StatePanel`, `InlineMessage`, `AppButton`, `Card`, `src/lib/styles.ts` e os componentes existentes antes de criar primitives equivalentes.
- Todo texto novo será pt-BR com acentuação UTF-8 literal; não inserir sequências `\\u` para representar texto visível.
- Módulos em `src/application` não importarão React Native, Expo Router, screens ou componentes.
- Executar comandos a partir da raiz do repositório usando `pnpm.cmd` quando o comando for do workspace mobile.

## Mapa de arquivos e responsabilidades

- Criar `apps/mobile/src/application/navigation/role-navigation.ts`: política pura de role, área da rota, destinos canônicos e decisões de acesso.
- Criar `apps/mobile/src/application/navigation/role-navigation.test.ts`: testes unitários da política sem React Native ou Expo Router.
- Criar `apps/mobile/src/components/navigation/unsupported-role-boundary.tsx`: bloqueio explícito e logout recuperável para role desconhecida.
- Criar `apps/mobile/src/components/navigation/unsupported-role-boundary.test.tsx`: teste isolado do boundary de role desconhecida.
- Criar `apps/mobile/src/components/navigation/app-tabs.tsx`: shell de tabs parametrizado, com tokens e comportamento visual já consolidado.
- Criar `apps/mobile/src/components/navigation/app-tabs.test.tsx`: teste do shell compartilhado, labels, ícones, destinos, seleção e acessibilidade.
- Criar `apps/mobile/src/screens/trainer-section.tsx`: tela mínima reutilizável para Início e Alunos, sem dados ou efeitos de negócio.
- Criar `apps/mobile/src/screens/trainer-section.test.tsx`: teste das superfícies mínimas do treinador.
- Modificar `apps/mobile/app/_layout.tsx`: deixar apenas infraestrutura global, resolução de acesso e `Slot`; remover imports de efeitos do aluno.
- Criar `apps/mobile/app/(student)/_layout.tsx`: boundary estrutural do aluno, `Stack` do aluno e montagem de fila offline/push.
- Mover `apps/mobile/app/(tabs)/_layout.tsx` para `apps/mobile/app/(student)/(tabs)/_layout.tsx`, preservando a composição e ajustando somente imports necessários para reutilizar o shell compartilhado.
- Mover `apps/mobile/app/(tabs)/index.tsx`, `progress.tsx` e `profile.tsx` para `apps/mobile/app/(student)/(tabs)/`, preservando conteúdo, exports e destinos existentes.
- Mover `apps/mobile/app/log/[dayId].tsx`, `session/[dayId].tsx` e `new-assessment.tsx` para `apps/mobile/app/(student)/`, preservando conteúdo, exports e destinos existentes; em especial, manter o named export `LogWorkoutScreen` de `session/[dayId].tsx` junto do `default export`.
- Criar `apps/mobile/app/(trainer)/_layout.tsx`: boundary estrutural do treinador e `Stack` do treinador.
- Criar `apps/mobile/app/(trainer)/trainer/_layout.tsx`, `index.tsx`, `students.tsx` e `profile.tsx`: shell e destinos visíveis do treinador.
- Modificar `apps/mobile/app/(auth)/login.tsx` e `signup.tsx`: encaminhamento por destino resolvido, mantendo cadastro somente de aluno.
- Modificar `apps/mobile/src/screens/profile.tsx` e `profile.test.tsx`: tornar o conteúdo de conta configurável sem duplicar o logout.
- Modificar `apps/mobile/src/screens/log-workout.tsx`: usar o destino canônico do shell de aluno nos retornos.
- Modificar `apps/mobile/src/__tests__/root-layout.test.tsx`, `auth-screens.test.tsx`, `tabs-layout.test.tsx` e `screens/log-workout.test.tsx`: atualizar destinos e cobrir role/isolamento.
- Criar `apps/mobile/src/__tests__/role-layouts.test.tsx`, `trainer-tabs-layout.test.tsx` e `trainer-screens.test.tsx`: cobrir boundaries estruturais, shell e superfícies do treinador.

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

### Task 2: Criar boundary para papel desconhecido

**Files:**
- Create: `apps/mobile/src/components/navigation/unsupported-role-boundary.tsx`
- Test: `apps/mobile/src/components/navigation/unsupported-role-boundary.test.tsx`

**Interfaces:**
- `UnsupportedRoleBoundary` nunca renderiza conteúdo protegido; oferece `Sair e voltar ao login`, executa `authClient.signOut()` e limpa `queryClient` ao finalizar.
- O boundary não usa `useSegments`, não decide área de rota e não chama `router.replace`. Depois de `signOut`, o `app/_layout.tsx` observa a sessão ausente e executa o redirecionamento único para `mobileRoutes.login`.

- [ ] **Step 1: Escrever o teste falhando do boundary**

O teste deve mockar `authClient`, `queryClient` e os components de UI. Não deve precisar mockar `expo-router`, porque o boundary não navega diretamente. Fixar estes comportamentos:

```tsx
it('bloqueia role desconhecida, encerra a sessão e não expõe conteúdo protegido', async () => {
  authState.signOut.mockResolvedValueOnce(undefined);

  render(<UnsupportedRoleBoundary />);

  expect(screen.getByText('Perfil não reconhecido')).toBeTruthy();
  expect(screen.queryByText('conteúdo protegido')).toBeNull();

  await user.press(screen.getByRole('button', { name: 'Sair e voltar ao login' }));

  await waitFor(() => {
    expect(authState.signOut).toHaveBeenCalledOnce();
    expect(queryState.clear).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: `pnpm.cmd --dir apps/mobile test src/components/navigation/unsupported-role-boundary.test.tsx`

Expected: FAIL por module ausente do boundary.

- [ ] **Step 3: Implementar `UnsupportedRoleBoundary`**

O componente deve renderizar `Screen`, `StatePanel` e `InlineMessage`, com a ação de logout protegida contra segundo toque:

```tsx
async function logoutUnsupportedSession(): Promise<void> {
  if (loggingOut) return;
  setLoggingOut(true);
  setError(undefined);
  try {
    await authClient.signOut();
  } catch {
    setError('Não foi possível encerrar esta sessão. Tente novamente.');
  } finally {
    queryClient.clear();
    setLoggingOut(false);
  }
}
```

O painel usará `title="Perfil não reconhecido"`, descrição informando que o perfil não pode acessar o app mobile e `actionLabel` com `Sair e voltar ao login`/`Saindo...`. Nenhum conteúdo de role será exibido durante falha de logout. O componente não importará `expo-router`.

- [ ] **Step 4: Rodar o teste do boundary**

Run: `pnpm.cmd --dir apps/mobile test src/components/navigation/unsupported-role-boundary.test.tsx`

Expected: o papel desconhecido permanece bloqueado; o logout bem-sucedido chama `authClient.signOut()` e sempre limpa o cache de queries em memória compartilhado, sem executar navegação direta.

- [ ] **Step 5: Commitar o boundary**

```powershell
git add -- apps/mobile/src/components/navigation/unsupported-role-boundary.tsx apps/mobile/src/components/navigation/unsupported-role-boundary.test.tsx
git commit -m "feat(mobile): adiciona boundary para role desconhecida"
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
- `AppTabsLayout` preserva a composição atual usando os tokens de `colors`, `controlSizes`, `radii`, `spacing` e `fontFamilies`, além de `PlatformPressable`; seus testes não fixarão números de estilo.
- `TrainerSectionScreenProps = { title: string; subtitle: string; stateTitle: string; stateDescription: string }`.
- `TrainerSectionScreen` renderiza apenas `Screen`, `ScreenHeader` e `StatePanel`; não importa API, query client, storage, journal, push ou hooks de treino.

- [ ] **Step 1: Escrever testes falhando do shell compartilhado e da tela mínima**

O teste do shell deve renderizar três itens e verificar labels, nomes de ícones, destinos, papel acessível `tab` e estado selecionado. Não verificar `transform`, `borderRadius`, `backgroundColor`, `marginHorizontal` ou outras constantes visuais. O teste da tela deve verificar que uma seção do treinador mostra sua hierarquia e mensagem sem montar query:

```tsx
it('renderiza uma seção de treinador sem dependências de domínio', () => {
  render(
    <TrainerSectionScreen
      stateDescription="Consulte seus alunos por aqui."
      stateTitle="Acompanhamento"
      subtitle="Sua operação no Muvit."
      title="Alunos"
    />,
  );

  expect(screen.getByRole('header', { name: 'Alunos' })).toBeTruthy();
  expect(screen.getByText('Acompanhamento')).toBeTruthy();
  expect(screen.getByText('Consulte seus alunos por aqui.')).toBeTruthy();
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

Expected: o shell mantém labels, destinos, acessibilidade e seleção; a tela mínima usa somente a foundation compartilhada. Nenhum teste fixa valores numéricos de estilo.

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
- Modify: `apps/mobile/src/screens/profile.tsx`
- Modify: `apps/mobile/src/screens/profile.test.tsx`
- Create: `apps/mobile/src/__tests__/role-layouts.test.tsx`
- Create: `apps/mobile/src/__tests__/trainer-tabs-layout.test.tsx`
- Create: `apps/mobile/src/__tests__/trainer-screens.test.tsx`
- Create: `apps/mobile/app/(student)/_layout.tsx`
- Move: `apps/mobile/app/(tabs)/_layout.tsx` -> `apps/mobile/app/(student)/(tabs)/_layout.tsx`
- Move: `apps/mobile/app/(tabs)/index.tsx` -> `apps/mobile/app/(student)/(tabs)/index.tsx`
- Move: `apps/mobile/app/(tabs)/progress.tsx` -> `apps/mobile/app/(student)/(tabs)/progress.tsx`
- Move: `apps/mobile/app/(tabs)/profile.tsx` -> `apps/mobile/app/(student)/(tabs)/profile.tsx`
- Move: `apps/mobile/app/log/[dayId].tsx` -> `apps/mobile/app/(student)/log/[dayId].tsx`
- Move: `apps/mobile/app/session/[dayId].tsx` -> `apps/mobile/app/(student)/session/[dayId].tsx`
- Move: `apps/mobile/app/new-assessment.tsx` -> `apps/mobile/app/(student)/new-assessment.tsx`
- Create: `apps/mobile/app/(trainer)/_layout.tsx`
- Create: `apps/mobile/app/(trainer)/trainer/_layout.tsx`
- Create: `apps/mobile/app/(trainer)/trainer/index.tsx`
- Create: `apps/mobile/app/(trainer)/trainer/students.tsx`
- Create: `apps/mobile/app/(trainer)/trainer/profile.tsx`

**Interfaces:**
- O `app/_layout.tsx` consumirá `resolveRouteArea`, `resolveRouteAccess` e `UnsupportedRoleBoundary`, sem importar `QueueDrain` ou `PushTokenRegistration`. Ele continuará montando o `QueryClientProvider` global como infraestrutura compartilhada, mas só montará `Slot` quando a decisão for `allow`.
- `(student)/_layout.tsx` será somente boundary estrutural: montará `QueueDrain`, `PushTokenRegistration` e `Stack`, sem `useSession`, `useSegments`, `Redirect`, política de role ou guard adicional.
- `(trainer)/_layout.tsx` será somente boundary estrutural: montará seu `Stack`, sem importar componente, provider ou efeito específico do aluno.
- `(student)/(tabs)/_layout.tsx` e `(trainer)/trainer/_layout.tsx` usarão `AppTabsLayout` com, respectivamente, `index/Hoje/calendar-outline`, `progress/Progresso/stats-chart-outline`, `profile/Perfil/person-outline` e `index/Início/home-outline`, `students/Alunos/people-outline`, `profile/Perfil/person-outline`.
- `ProfileScreen` aceitará contexto de conta com defaults de aluno; `app/(trainer)/trainer/profile.tsx` passará contexto de treinador sem repetir logout ou política de role.
- Os entrypoints movidos continuarão encaminhando para as mesmas screens e destinos. A movimentação não poderá apagar named exports, incluindo `LogWorkoutScreen` em `session/[dayId].tsx`.

- [ ] **Step 1: Escrever os testes falhando de root, shells e isolamento**

Atualizar `root-layout.test.tsx` para usar `mobileRoutes` e cobrir a autoridade única do root:

```tsx
it('encaminha trainer autenticado para o shell trainer', () => {
  authState.session.data = { user: { id: 'auth-user-id', role: 'trainer' } };
  routerState.segments = ['(auth)'];

  render(<RootLayout />);

  expect(screen.getByText(`redirect:${mobileRoutes.trainerHome}`)).toBeTruthy();
});

it('protege deep links cruzados antes de montar o Slot', () => {
  authState.session.data = { user: { id: 'auth-user-id', role: 'student' } };
  routerState.segments = ['(trainer)', 'trainer', 'students'];

  const studentAttempt = render(<RootLayout />);

  expect(screen.getByText(`redirect:${mobileRoutes.studentHome}`)).toBeTruthy();
  expect(screen.queryByTestId('router-slot')).toBeNull();
  studentAttempt.unmount();

  authState.session.data = { user: { id: 'auth-user-id', role: 'trainer' } };
  routerState.segments = ['(student)', '(tabs)'];

  render(<RootLayout />);

  expect(screen.getByText(`redirect:${mobileRoutes.trainerHome}`)).toBeTruthy();
  expect(screen.queryByTestId('router-slot')).toBeNull();
});

it('mantém a infraestrutura de query global sem montar efeitos do aluno para trainer', () => {
  authState.session.data = { user: { id: 'auth-user-id', role: 'trainer' } };
  routerState.segments = ['(trainer)', 'trainer', 'students'];

  render(<RootLayout />);

  expect(screen.getByTestId('query-client-provider')).toBeTruthy();
  expect(screen.getByTestId('router-slot')).toBeTruthy();
  expect(screen.queryByText('queue-drain')).toBeNull();
  expect(screen.queryByText('push-registration')).toBeNull();
});

it('bloqueia role desconhecida sem montar Slot', () => {
  authState.session.data = { user: { id: 'auth-user-id', role: 'legacy' } };
  routerState.segments = ['(student)', '(tabs)'];

  render(<RootLayout />);

  expect(screen.getByText('Perfil não reconhecido')).toBeTruthy();
  expect(screen.queryByTestId('router-slot')).toBeNull();
});
```

Criar `role-layouts.test.tsx` para renderizar diretamente os boundaries estruturais com componentes mockados: o layout student deve montar `QueueDrain`, `PushTokenRegistration` e `Stack`; o layout trainer deve montar somente `Stack`. Atualizar `tabs-layout.test.tsx` para importar o entrypoint movido de `app/(student)/(tabs)/_layout.tsx`, preservando asserts de labels, destinos, acessibilidade e seleção. Remover asserts numéricos de `transform`, `borderRadius`, `backgroundColor`, `marginHorizontal` e equivalentes; eles pertencem à foundation da MUV-20, não ao contrato desta entrega.

- [ ] **Step 2: Rodar os testes para confirmar as falhas**

Run: `pnpm.cmd --dir apps/mobile test src/__tests__/root-layout.test.tsx src/__tests__/role-layouts.test.tsx src/__tests__/tabs-layout.test.tsx src/__tests__/trainer-tabs-layout.test.tsx src/__tests__/trainer-screens.test.tsx`

Expected: FAIL nos destinos, boundaries e arquivos novos antes da migração da árvore.

- [ ] **Step 3: Mover as rotas atuais para `(student)` preservando os entrypoints**

Criar apenas os diretórios de destino e mover os arquivos existentes com `git mv`:

```powershell
New-Item -ItemType Directory -Force -Path `
  'apps/mobile/app/(student)/(tabs)', `
  'apps/mobile/app/(student)/log', `
  'apps/mobile/app/(student)/session' | Out-Null

git mv -- 'apps/mobile/app/(tabs)/_layout.tsx' 'apps/mobile/app/(student)/(tabs)/_layout.tsx'
git mv -- 'apps/mobile/app/(tabs)/index.tsx' 'apps/mobile/app/(student)/(tabs)/index.tsx'
git mv -- 'apps/mobile/app/(tabs)/progress.tsx' 'apps/mobile/app/(student)/(tabs)/progress.tsx'
git mv -- 'apps/mobile/app/(tabs)/profile.tsx' 'apps/mobile/app/(student)/(tabs)/profile.tsx'
git mv -- 'apps/mobile/app/log/[dayId].tsx' 'apps/mobile/app/(student)/log/[dayId].tsx'
git mv -- 'apps/mobile/app/session/[dayId].tsx' 'apps/mobile/app/(student)/session/[dayId].tsx'
git mv -- 'apps/mobile/app/new-assessment.tsx' 'apps/mobile/app/(student)/new-assessment.tsx'
```

Depois da movimentação, ajustar somente imports relativos cuja profundidade mudou (por exemplo, `../../src` para `../../../src` nos entrypoints dentro de `(student)/(tabs)`, `log` e `session`). Preservar o conteúdo e todos os exports dos arquivos movidos; em especial, `session/[dayId].tsx` continuará contendo o named export `LogWorkoutScreen` e o `default export`, alterando apenas o caminho relativo se necessário. Não recriar wrappers, não copiar lógica de screens e não substituir um entrypoint por um novo `default export`.

Usar `git diff --find-renames -- apps/mobile/app` para conferir que a migração foi registrada como movimentação e comparar os destinos públicos antes e depois.

- [ ] **Step 4: Implementar o root, os boundaries estruturais e o shell trainer**

O root deve substituir o booleano de aluno por uma decisão única, preservando o estado de carregamento e a infraestrutura global existentes:

```tsx
const decision = resolveRouteAccess({
  area: resolveRouteArea(segments),
  isAuthenticated: Boolean(session.data),
  role: session.data?.user.role,
});

return (
  <QueryClientProvider client={queryClient}>
    <StatusBar style="dark" />
    {decision.kind === 'unsupported-role' ? <UnsupportedRoleBoundary /> : null}
    {decision.kind === 'redirect' ? <Redirect href={decision.href} /> : null}
    {decision.kind === 'allow' ? <Slot /> : null}
  </QueryClientProvider>
);
```

O código real deverá manter o tratamento de sessão pendente antes da decisão e evitar renderizar mais de uma dessas três saídas. O root não importará nem montará efeitos do aluno. O layout student será estrutural e montará diretamente `QueueDrain`, `PushTokenRegistration` e `Stack`; o layout trainer montará diretamente somente seu `Stack`. Nenhum desses layouts repetirá a política de autorização.

O layout aninhado `trainer/_layout.tsx` renderizará `AppTabsLayout` com `Início`, `Alunos` e `Perfil`. As telas `index.tsx` e `students.tsx` usarão `TrainerSectionScreen` com copy neutra, como `Acompanhe seus alunos por aqui.` e `Consulte seus alunos por aqui.`. A rota `profile.tsx` chamará `ProfileScreen` com `accountType="Treinador"`, fallback `Treinador`/`TR` e descrição `Acompanhe seus alunos no Muvit.`. Não adicionar role checks, queries, CRUD, storage, listeners ou efeitos de negócio às telas trainer.

Generalizar `ProfileScreen` sem duplicar o fluxo atual:

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
  // preservar authClient.useSession(), logout, queryClient.clear() e estados atuais
}
```

O perfil student continuará usando os defaults atuais; o trainer apenas fornecerá contexto de apresentação e compartilhará logout.

- [ ] **Step 5: Rodar os testes de navegação, migração e isolamento**

Run: `pnpm.cmd --dir apps/mobile test src/__tests__/root-layout.test.tsx src/__tests__/role-layouts.test.tsx src/__tests__/tabs-layout.test.tsx src/__tests__/trainer-tabs-layout.test.tsx src/__tests__/trainer-screens.test.tsx src/screens/profile.test.tsx`

Expected: visitante vai para login; aluno e treinador são encaminhados aos shells próprios; deep links cruzados são redirecionados pelo root antes do `Slot`; o `QueryClientProvider` global permanece disponível; efeitos do aluno aparecem somente no layout student; tabs student preservam labels/destinos; tabs trainer expõem exatamente `Início`, `Alunos` e `Perfil`; o perfil mostra o contexto correto. Nenhum teste depende de valores numéricos da foundation.

Conferir também `git diff --find-renames -- apps/mobile/app` para garantir que os entrypoints antigos foram movidos, não recriados, e que `session/[dayId].tsx` manteve seus exports.

- [ ] **Step 6: Commitar a árvore de rotas e os shells**

```powershell
git add -- apps/mobile/app apps/mobile/src/screens/profile.tsx apps/mobile/src/screens/profile.test.tsx apps/mobile/src/__tests__/root-layout.test.tsx apps/mobile/src/__tests__/role-layouts.test.tsx apps/mobile/src/__tests__/tabs-layout.test.tsx apps/mobile/src/__tests__/trainer-tabs-layout.test.tsx apps/mobile/src/__tests__/trainer-screens.test.tsx
git commit -m "feat(mobile): separa shells de aluno e treinador"
```

### Task 5: Encaminhar login por role e preservar o fluxo do aluno

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx`
- Modify: `apps/mobile/app/(auth)/signup.tsx`
- Modify: `apps/mobile/src/screens/log-workout.tsx`
- Modify: `apps/mobile/src/__tests__/auth-screens.test.tsx`
- Modify: `apps/mobile/src/screens/log-workout.test.tsx`

**Interfaces:**
- Login consumirá `resolveInitialRoute(role)` e, para role desconhecida, chamará `authClient.signOut()` e mostrará mensagem sem navegar para nenhum shell.
- Signup continuará enviando literalmente `role: 'student'` e usará `mobileRoutes.studentHome` após sucesso; não haverá opção visual ou payload de cadastro de treinador.
- Retornos da sessão guiada usarão `mobileRoutes.studentHome`, preservando as URLs públicas de sessão e log do aluno.
- A autorização de uma rota já montada continuará pertencendo ao `app/_layout.tsx`; login apenas resolve o destino após autenticação e não substitui o guard global.

- [ ] **Step 1: Atualizar os testes de autenticação e regressão do aluno antes da implementação**

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

Manter os testes existentes de erro de login, cadastro e logout do aluno; eles devem verificar destinos e contratos funcionais, não estilos da foundation.

- [ ] **Step 2: Rodar os testes para confirmar as falhas**

Run: `pnpm.cmd --dir apps/mobile test src/__tests__/auth-screens.test.tsx src/screens/log-workout.test.tsx`

Expected: FAIL no destino trainer, na role desconhecida e nos retornos que ainda usam o caminho antigo `/(tabs)`.

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

No cadastro, manter `role: 'student'` e trocar somente o destino para `mobileRoutes.studentHome`. Não adicionar opção visual, payload ou fluxo de cadastro de treinador.

- [ ] **Step 4: Atualizar os retornos do treino sem mudar suas URLs**

Trocar os quatro `router.replace('/(tabs)')` de `log-workout.tsx` por `router.replace(mobileRoutes.studentHome)`. Não alterar os caminhos `/session/:dayId` e `/log/:dayId`, nem mover lógica de treino para as telas trainer.

- [ ] **Step 5: Rodar os testes de autenticação e regressão do aluno**

Run: `pnpm.cmd --dir apps/mobile test src/__tests__/auth-screens.test.tsx src/screens/log-workout.test.tsx`

Expected: login de student continua em `mobileRoutes.studentHome`, trainer vai para `mobileRoutes.trainerHome`, role desconhecida encerra sessão com mensagem, signup continua student e logout/navegação do aluno permanecem funcionais.

- [ ] **Step 6: Commitar autenticação e retornos do aluno**

```powershell
git add -- 'apps/mobile/app/(auth)/login.tsx' 'apps/mobile/app/(auth)/signup.tsx' apps/mobile/src/screens/log-workout.tsx apps/mobile/src/__tests__/auth-screens.test.tsx apps/mobile/src/screens/log-workout.test.tsx
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

Verificar que `app/(student)/` contém todas as rotas de treino/avaliação do aluno, `app/(trainer)/trainer/` contém somente Início/Alunos/Perfil e nenhum arquivo trainer importa `useQuery`, `AsyncStorage`, `log-queue`, `workout-session-storage`, `use-guided-workout-session`, `QueueDrain` ou `PushTokenRegistration`. Confirmar também que o `QueryClientProvider` continua global, mas nenhum efeito de aluno é montado antes da decisão de acesso do root.

- [ ] **Step 6: Fazer inspeção visual nativa quando houver dispositivo disponível**

Consultar `adb devices` sem iniciar ou encerrar processos preexistentes. Se houver um emulador já disponível, abrir o app e verificar pelo menos login, shell student e shell trainer, incluindo labels `Hoje/Progresso/Perfil` e `Início/Alunos/Perfil`; registrar a ausência de validação visual se não houver dispositivo ou servidor disponível. Não modificar o Pencil.

- [ ] **Step 7: Procurar escapes Unicode somente nos arquivos alterados**

Executar:

```powershell
git diff --name-only --diff-filter=ACMRTUXB | ForEach-Object { rg -n '\\u[0-9a-fA-F]{4}' -- $_ }
```

Esperado: nenhuma ocorrência usada para representar caracteres visíveis; textos pt-BR permanecem como UTF-8 literal.

- [ ] **Step 8: Revisar critérios de aceite e preparar o handoff**

Revisar a especificação linha a linha contra o diff e os resultados dos comandos. Informar arquitetura, arquivos, proteção de rotas, isolamento, testes, comandos e resultados observados. Listar como decisão para MUV-17 que `/trainer` e o destino `Alunos` já estão reservados, mas a consulta e gestão de alunos continuam fora desta entrega.
