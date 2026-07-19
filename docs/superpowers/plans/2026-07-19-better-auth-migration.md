# Migração para Better Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir integralmente a autenticação própria do Muvit pelo Better Auth, com sessão por cookie na web e no Expo, sem preservar usuários ou credenciais existentes.

**Architecture:** O Better Auth ficará restrito à infraestrutura da API Fastify e será a fonte de identidade, senha, sessão e cookies. Um resolvedor converterá a sessão em `RequestIdentity { authUserId, profileId, role }`, mantendo casos de uso e regras de propriedade dependentes somente dos IDs de domínio. Treinadores e alunos independentes terão identidade; alunos gerenciados continuarão sem login.

**Tech Stack:** Better Auth `1.6.23`, `@better-auth/drizzle-adapter` `1.6.23`, `@better-auth/expo` `1.6.23`, Fastify 5, Drizzle ORM/PostgreSQL, Next.js 16, Expo 54, Vitest, Biome e pnpm.

**Documentação consultada:** Context7, biblioteca `/better-auth/better-auth/v1.6.23`, especificamente integração Fastify com `fromNodeHeaders`, adapter Drizzle com schema explícito e transações, hooks globais, campos adicionais do usuário, cliente Expo com SecureStore e encaminhamento de cookie via `authClient.getCookie()`.

## Restrições globais

- Não manter compatibilidade com JWTs, endpoints `/auth/*`, cookies `muvit_access`/`muvit_refresh`, hashes ou usuários existentes.
- Não iniciar, parar ou reiniciar servidores de desenvolvimento. Quando a geração OpenAPI depender da API em execução, pausar e pedir ao usuário para disponibilizá-la.
- Aplicar TDD: teste falhando, implementação mínima, teste passando, depois refatoração.
- Não expor Better Auth aos casos de uso de negócio; estes recebem `RequestIdentity` ou IDs de perfil.
- Não registrar senha, hash, cookie, token de sessão, secret ou headers sensíveis.
- Preservar pt-BR como UTF-8 literal e não introduzir `\uXXXX` para acentuação.
- Usar `apply_patch` para edições manuais e commits pequenos ao fim de cada tarefa.
- A migration pressupõe banco de autenticação descartável. Validá-la primeiro no banco de teste limpo; antes de apagar ou recriar o banco local de desenvolvimento, pedir autorização explícita e resolver o alvo exato.

## Task 1: Criar o schema Better Auth e os vínculos de domínio

**Files:**

- Create: `packages/db/src/schema/auth.ts`
- Create: `packages/db/src/schema/auth.test.ts`
- Modify: `packages/db/src/schema/trainers.ts`
- Modify: `packages/db/src/schema/students.ts`
- Modify: `packages/db/src/schema/relations.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/src/index.ts`
- Create: `packages/db/drizzle/0003_better_auth.sql`
- Modify: `packages/db/drizzle/meta/_journal.json`
- Create: `packages/db/drizzle/meta/0003_snapshot.json`

- [ ] **Step 1: Escrever o teste de contrato do schema**

Em `packages/db/src/schema/auth.test.ts`, testar os nomes físicos das quatro tabelas, a unicidade global de e-mail/token e os vínculos de perfil:

```ts
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { authAccounts, authSessions, authUsers, authVerifications } from './auth.js';
import { students } from './students.js';
import { trainers } from './trainers.js';

describe('schema Better Auth', () => {
  it('expõe as tabelas físicas esperadas', () => {
    expect(getTableConfig(authUsers).name).toBe('auth_users');
    expect(getTableConfig(authAccounts).name).toBe('auth_accounts');
    expect(getTableConfig(authSessions).name).toBe('auth_sessions');
    expect(getTableConfig(authVerifications).name).toBe('auth_verifications');
  });

  it('liga perfis à identidade sem autenticar aluno gerenciado', () => {
    expect(trainers.authUserId.notNull).toBe(true);
    expect(students.authUserId.notNull).toBe(false);
  });
});
```

- [ ] **Step 2: Executar o teste e confirmar a falha esperada**

Run: `pnpm.cmd --filter @muvit/db test -- src/schema/auth.test.ts`

Expected: FAIL porque `./auth.js` e `authUserId` ainda não existem.

- [ ] **Step 3: Implementar as tabelas do Better Auth**

Em `packages/db/src/schema/auth.ts`, declarar somente tabelas e índices; manter relações centralizadas em `relations.ts`:

```ts
import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const authRoleEnum = pgEnum('auth_role', ['trainer', 'student']);

export const authUsers = pgTable(
  'auth_users',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    role: authRoleEnum('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('auth_users_email_unique').on(table.email)],
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey(),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('auth_sessions_token_unique').on(table.token), index('auth_sessions_user_id_idx').on(table.userId)],
);

export const authAccounts = pgTable(
  'auth_accounts',
  {
    id: uuid('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('auth_accounts_provider_account_unique').on(table.providerId, table.accountId),
    index('auth_accounts_user_id_idx').on(table.userId),
  ],
);

export const authVerifications = pgTable(
  'auth_verifications',
  {
    id: uuid('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('auth_verifications_identifier_idx').on(table.identifier)],
);
```

Adicionar `trainers.authUserId` obrigatório/único com `onDelete: 'cascade'`; adicionar `students.authUserId` opcional/único com `onDelete: 'cascade'`; remover `passwordHash` de ambos. Exportar as tabelas em `schema/index.ts` e adicionar as relações em `relations.ts` sem duplicá-las em `auth.ts`.

- [ ] **Step 4: Executar testes e typecheck do pacote**

Run: `pnpm.cmd --filter @muvit/db test -- src/schema/auth.test.ts`

Expected: PASS.

Run: `pnpm.cmd --filter @muvit/db typecheck`

Expected: PASS após ajustar factories e testes que ainda constroem registros com `passwordHash`; esses ajustes devem apenas acompanhar o novo shape, sem iniciar a migração da API.

- [ ] **Step 5: Gerar e revisar a migration**

Run: `pnpm.cmd --filter @muvit/db generate`

Expected: criar `0003_better_auth.sql` e metadados, contendo as quatro tabelas, enum, FKs/índices, remoção dos hashes e adição dos vínculos.

Inspecionar manualmente o SQL. Como `trainers.auth_user_id` passa a ser obrigatório e não há preservação de dados, a migration deve falhar de forma clara em banco populado em vez de inventar identidades. Não apagar o banco local nesta etapa.

- [ ] **Step 6: Validar em banco de teste limpo**

Run: `pnpm.cmd --filter @muvit/db migrate:test`

Expected: PASS em banco de teste descartável sem dados anteriores. Se houver dados e a migration falhar, identificar o banco pelo `DATABASE_URL` de `.env.test` sem imprimir credenciais, pedir autorização antes de recriá-lo e repetir.

- [ ] **Step 7: Commit**

```powershell
git add packages/db/src/schema packages/db/drizzle
git commit -m "feat(db): adiciona schema do Better Auth"
```

## Task 2: Configurar Better Auth e expor o handler Fastify

**Files:**

- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/api/src/env.ts`
- Create: `apps/api/src/lib/auth.ts`
- Create: `apps/api/src/modules/auth/profile-provisioner.ts`
- Create: `apps/api/src/modules/auth/drizzle-profile-provisioner.ts`
- Create: `apps/api/src/routes/better-auth.ts`
- Create: `apps/api/src/routes/better-auth.test.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/test/helpers/db.ts`
- Create: `apps/api/test/helpers/auth.ts`

- [ ] **Step 1: Instalar dependências oficiais fixadas**

Run: `pnpm.cmd --filter @muvit/api add better-auth@1.6.23 @better-auth/drizzle-adapter@1.6.23 @better-auth/expo@1.6.23`

Expected: `package.json` e lockfile atualizados. Não remover JWT/bcrypt ainda; isso ocorre depois que as rotas de negócio usam sessão.

- [ ] **Step 2: Escrever testes HTTP nativos do Better Auth**

Em `better-auth.test.ts`, cobrir por `app.inject()`:

1. `POST /api/auth/sign-up/email` com `{ name, email, password, role: 'trainer' }` retorna sucesso, `Set-Cookie` e exatamente um trainer ligado ao `authUserId`.
2. O mesmo para `role: 'student'` cria aluno independente.
3. O mesmo e-mail com papel diferente é rejeitado.
4. Ausência ou valor inválido de `role` é rejeitado.
5. `POST /api/auth/update-user` não permite trocar `role`.
6. Falha injetada no provisioner remove a identidade e não deixa account/session órfãs.
7. `GET /api/auth/get-session` com o cookie devolve a sessão; `POST /api/auth/sign-out` expira a sessão.

Criar `apps/api/test/helpers/auth.ts` com parser de `set-cookie` que preserva somente pares `nome=valor` e uma função `signUpWithSession(app, input)` reutilizável pelos testes seguintes.

- [ ] **Step 3: Executar o teste e confirmar a falha**

Run: `pnpm.cmd --filter @muvit/api test -- src/routes/better-auth.test.ts`

Expected: FAIL porque o handler e a configuração ainda não existem.

- [ ] **Step 4: Implementar o provisionador de perfil**

Definir uma porta sem imports do Better Auth:

```ts
export type AuthRole = 'trainer' | 'student';

export type ProvisionProfileInput = {
  authUserId: string;
  name: string;
  email: string;
  role: AuthRole;
};

export interface ProfileProvisioner {
  provision(input: ProvisionProfileInput): Promise<void>;
  removeIdentity(authUserId: string): Promise<void>;
}
```

A implementação Drizzle cria trainer ou student independente em transação, rejeita papel inválido e remove `auth_users` em compensação. Nunca escrever senha/hash nas tabelas de domínio.

- [ ] **Step 5: Implementar `createMuvitAuth` com hooks seguros**

Em `apps/api/src/lib/auth.ts`, exportar uma factory testável que recebe banco e provisioner. Configuração mínima:

```ts
import { expo } from '@better-auth/expo';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { betterAuth } from 'better-auth';
import * as schema from '@muvit/db/schema';

const THIRTY_DAYS = 60 * 60 * 24 * 30;
const ONE_DAY = 60 * 60 * 24;

function isAuthRole(value: unknown): value is 'trainer' | 'student' {
  return value === 'trainer' || value === 'student';
}

function readRole(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || !('role' in body)) return undefined;
  return body.role;
}

export function createMuvitAuth(deps: AuthDependencies) {
  return betterAuth({
    database: drizzleAdapter(deps.db, {
      provider: 'pg',
      schema: {
        user: schema.authUsers,
        session: schema.authSessions,
        account: schema.authAccounts,
        verification: schema.authVerifications,
      },
      transaction: true,
    }),
    secret: deps.secret,
    baseURL: deps.baseURL,
    emailAndPassword: { enabled: true },
    advanced: {
      database: { generateId: 'uuid' },
      cookiePrefix: 'muvit',
    },
    session: { expiresIn: THIRTY_DAYS, updateAge: ONE_DAY },
    user: {
      additionalFields: {
        role: { type: 'string', required: true, input: true },
      },
    },
    trustedOrigins: deps.trustedOrigins,
    plugins: [expo()],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const requestedRole = readRole(ctx.body);
        if (ctx.path === '/sign-up/email' && !isAuthRole(requestedRole)) {
          throw new APIError('BAD_REQUEST', { message: 'invalid role' });
        }
        if (ctx.path === '/update-user' && requestedRole !== undefined) {
          throw new APIError('BAD_REQUEST', { message: 'role cannot be changed' });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/sign-up/email') return;
        const user = ctx.context.newSession?.user;
        if (!user || !isAuthRole(user.role)) {
          throw new APIError('INTERNAL_SERVER_ERROR', { message: 'invalid provisioned identity' });
        }
        try {
          await deps.profileProvisioner.provision({
            authUserId: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          });
        } catch {
          await deps.profileProvisioner.removeIdentity(user.id);
          throw new APIError('INTERNAL_SERVER_ERROR', { message: 'unable to provision profile' });
        }
      }),
    },
  });
}
```

Manter o mapeamento explícito dos quatro exports físicos no adapter. O `transaction: true` cobre as escritas internas do Better Auth; o provisionamento de domínio ocorre no hook posterior e usa compensação testada, pois não se deve assumir que um hook externo compartilhe a transação interna.

- [ ] **Step 6: Montar o handler Fastify**

Em `apps/api/src/routes/better-auth.ts`, importar `env` explicitamente e adaptar Web Request/Response:

```ts
import { fromNodeHeaders } from 'better-auth/node';
import { env } from '../env.js';

app.route({
  method: ['GET', 'POST'],
  url: '/api/auth/*',
  async handler(request, reply) {
    const url = new URL(request.url, env.BETTER_AUTH_URL);
    const response = await app.auth.handler(
      new Request(url, {
        method: request.method,
        headers: fromNodeHeaders(request.headers),
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      }),
    );

    reply.status(response.status);
    for (const [name, value] of response.headers.entries()) {
      if (name !== 'set-cookie') reply.header(name, value);
    }
    const setCookies = response.headers.getSetCookie();
    if (setCookies.length > 0) reply.header('set-cookie', setCookies);
    return reply.send(response.body ? await response.text() : null);
  },
});
```

Preservar múltiplos `Set-Cookie`. Ajustar `content-type`/body conforme o comportamento observado no teste. Decorar `app.auth` com tipo derivado da factory e registrar a rota antes das rotas protegidas.

- [ ] **Step 7: Validar ambiente e política HTTP**

Adicionar `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, origens web e schemes Expo ao schema de `env.ts`. Configurar CORS com `credentials: true` apenas para origens permitidas e rate limit explícito nos caminhos de login/cadastro, sem wildcard de produção.

- [ ] **Step 8: Executar testes e typecheck**

Run: `pnpm.cmd --filter @muvit/api test -- src/routes/better-auth.test.ts`

Expected: PASS para cadastro, perfil, sessão, logout, papel imutável e compensação.

Run: `pnpm.cmd --filter @muvit/api typecheck`

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add apps/api/package.json pnpm-lock.yaml apps/api/src/env.ts apps/api/src/lib/auth.ts apps/api/src/modules/auth/profile-provisioner.ts apps/api/src/modules/auth/drizzle-profile-provisioner.ts apps/api/src/routes/better-auth.ts apps/api/src/routes/better-auth.test.ts apps/api/src/app.ts apps/api/test/helpers
git commit -m "feat(api): integra Better Auth ao Fastify"
```

## Task 3: Resolver sessão em identidade de aplicação

**Files:**

- Create: `apps/api/src/shared/request-identity.ts`
- Create: `apps/api/src/modules/auth/profile-resolver.ts`
- Create: `apps/api/src/modules/auth/drizzle-profile-resolver.ts`
- Modify: `apps/api/src/plugins/auth.ts`
- Modify: `apps/api/src/plugins/auth.test.ts`

- [ ] **Step 1: Escrever testes do middleware com cookie real**

Atualizar `plugins/auth.test.ts` para criar identidades via `signUpWithSession` e verificar:

- sem cookie: `401`;
- cookie inválido/revogado: `401`;
- sessão trainer: `request.identity` contém `authUserId`, o ID do trainer e `role: 'trainer'`;
- sessão student: contém o ID do aluno independente e `role: 'student'`;
- `requireRole` errado: `403`;
- sessão válida sem perfil: `401`, sem expor IDs ou cookie na resposta.

- [ ] **Step 2: Confirmar que o teste falha contra o plugin JWT**

Run: `pnpm.cmd --filter @muvit/api test -- src/plugins/auth.test.ts`

Expected: FAIL porque o plugin espera Bearer e popula `request.user`.

- [ ] **Step 3: Criar o contrato de identidade**

```ts
export type RequestIdentity = {
  authUserId: string;
  profileId: string;
  role: 'trainer' | 'student';
};
```

Declarar `request.identity` no módulo Fastify. A porta `ProfileResolver` recebe `{ authUserId, role }` e retorna `profileId | null`; a implementação Drizzle consulta somente a tabela correspondente e rejeita divergência de papel.

- [ ] **Step 4: Trocar a validação JWT por `auth.api.getSession`**

No `requireAuth`, encaminhar `fromNodeHeaders(request.headers)` para `app.auth.api.getSession({ headers })`. Em sessão ausente, responder `401`. Resolver o perfil e preencher `request.identity`; perfil ausente também responde `401` e registra somente uma categoria estável de inconsistência.

Manter temporariamente os nomes `requireAuth` e `requireRole`; remover toda lógica Bearer do arquivo. `requireRole` lê `request.identity.role` e devolve `403` quando necessário.

- [ ] **Step 5: Executar testes**

Run: `pnpm.cmd --filter @muvit/api test -- src/plugins/auth.test.ts`

Expected: PASS.

Run: `pnpm.cmd --filter @muvit/api typecheck`

Expected: pode ainda falhar nas rotas que usam `request.user`; essa falha é a lista de migração da próxima tarefa. Não deixar erros fora desse conjunto.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/src/shared/request-identity.ts apps/api/src/modules/auth/profile-resolver.ts apps/api/src/modules/auth/drizzle-profile-resolver.ts apps/api/src/plugins/auth.ts apps/api/src/plugins/auth.test.ts
git commit -m "refactor(api): resolve sessão em identidade de domínio"
```

## Task 4: Migrar rotas e casos de uso de negócio para `RequestIdentity`

**Files:**

- Modify: `apps/api/src/routes/assessments.ts`
- Modify: `apps/api/src/routes/exercises.ts`
- Modify: `apps/api/src/routes/students.ts`
- Modify: `apps/api/src/routes/trainer-summary.ts`
- Modify: `apps/api/src/routes/uploads.ts`
- Modify: `apps/api/src/routes/workout-logs.ts`
- Modify: `apps/api/src/routes/workouts.ts`
- Modify: `apps/api/src/modules/assessments/use-cases/*.ts`
- Modify: `apps/api/src/modules/exercises/repositories/exercises-repository.ts`
- Modify: `apps/api/src/modules/exercises/use-cases/list-exercises.ts`
- Modify: `apps/api/src/modules/students/use-cases/ensure-student-access.ts`
- Modify: `apps/api/src/modules/students/use-cases/get-student.ts`
- Modify: `apps/api/src/modules/students/use-cases/student-access-policy.ts`
- Modify: `apps/api/src/modules/workout-logs/use-cases/*.ts`
- Modify: `apps/api/src/modules/workouts/use-cases/*.ts`
- Modify: testes correspondentes em `apps/api/src/routes/*.test.ts` e `apps/api/src/modules/**/*.test.ts`

- [ ] **Step 1: Converter helpers de teste para cookie**

Substituir factories de JWT nos testes de rotas por `signUpWithSession`. O helper deve retornar `{ cookie, authUserId, profileId, role }`, permitindo que fixtures usem o ID de domínio correto.

- [ ] **Step 2: Executar um teste representativo e confirmar falha**

Run: `pnpm.cmd --filter @muvit/api test -- src/routes/students.test.ts`

Expected: FAIL onde o teste envia Bearer ou onde a rota ainda acessa `request.user.sub`.

- [ ] **Step 3: Migrar tipos centrais e políticas**

Trocar imports de `AuthUser` por `RequestIdentity`. Onde a lógica atual usa `sub`, usar `profileId`; onde decide autorização, usar `role`. Não substituir mecanicamente `sub` por `authUserId`: relações `trainerId`/`studentId` sempre recebem `profileId`.

Exemplo:

```ts
async execute(identity: RequestIdentity, studentId: string) {
  if (identity.role === 'student' && identity.profileId !== studentId) {
    throw new ForbiddenError();
  }
  return this.repository.findAccessible(identity.profileId, identity.role, studentId);
}
```

- [ ] **Step 4: Migrar todas as rotas protegidas**

Substituir `request.user` por `request.identity` e `request.user.sub` por `request.identity.profileId`. Preservar `requireRole`, códigos HTTP, schemas e regras atuais. Não alterar contratos de payload de negócio.

- [ ] **Step 5: Executar testes por módulo**

Run:

```powershell
pnpm.cmd --filter @muvit/api test -- src/routes/students.test.ts
pnpm.cmd --filter @muvit/api test -- src/routes/exercises.test.ts
pnpm.cmd --filter @muvit/api test -- src/routes/assessments.test.ts
pnpm.cmd --filter @muvit/api test -- src/routes/workouts.test.ts
pnpm.cmd --filter @muvit/api test -- src/routes/workout-logs.test.ts
pnpm.cmd --filter @muvit/api test -- src/routes/uploads.test.ts
```

Expected: PASS em todos.

- [ ] **Step 6: Confirmar que nenhum consumidor de negócio usa a identidade legada**

Run: `rg -n "AuthUser|request\.user|req\.user|\.sub\b" apps/api/src --glob '!modules/auth/**'`

Expected: nenhuma ocorrência de identidade legada. Ocorrências de `.subscribe` ou nomes não relacionados devem ser avaliadas, não removidas cegamente.

Run: `pnpm.cmd --filter @muvit/api typecheck`

Expected: PASS ou apenas falhas confinadas aos arquivos legados que serão excluídos na próxima tarefa.

- [ ] **Step 7: Commit**

```powershell
git add apps/api/src/routes apps/api/src/modules/assessments apps/api/src/modules/exercises apps/api/src/modules/students apps/api/src/modules/workout-logs apps/api/src/modules/workouts
git commit -m "refactor(api): usa identidade Better Auth nas rotas"
```

## Task 5: Remover a autenticação legada e realocar o onboarding

**Files:**

- Create: `apps/api/src/modules/trainers/use-cases/complete-trainer-onboarding.ts`
- Create: `apps/api/src/modules/trainers/repositories/trainers-repository.ts`
- Create: `apps/api/src/modules/trainers/repositories/drizzle-trainers-repository.ts`
- Create: `apps/api/src/modules/trainers/factory.ts`
- Create: `apps/api/src/routes/trainers.ts`
- Create: `apps/api/src/routes/trainers.test.ts`
- Delete: `apps/api/src/routes/auth.ts`
- Delete: `apps/api/src/routes/auth.test.ts`
- Delete: `apps/api/src/modules/auth/factory.ts`
- Delete: `apps/api/src/modules/auth/repositories/auth-repository.ts`
- Delete: `apps/api/src/modules/auth/repositories/drizzle-auth-repository.ts`
- Delete: `apps/api/src/modules/auth/use-cases/auth-types.ts`
- Delete: `apps/api/src/modules/auth/use-cases/complete-trainer-onboarding.ts`
- Delete: `apps/api/src/modules/auth/use-cases/get-current-user.ts`
- Delete: `apps/api/src/modules/auth/use-cases/login.ts`
- Delete: `apps/api/src/modules/auth/use-cases/refresh-token.ts`
- Delete: `apps/api/src/modules/auth/use-cases/signup-student.ts`
- Delete: `apps/api/src/modules/auth/use-cases/signup-trainer.ts`
- Delete: `apps/api/src/modules/auth/use-cases/signup-trainer.test.ts`
- Delete: `apps/api/src/lib/passwords.ts`
- Delete: `apps/api/src/lib/passwords.test.ts`
- Delete: `apps/api/src/lib/tokens.ts`
- Delete: `apps/api/src/lib/tokens.test.ts`
- Delete: `apps/api/src/shared/auth-user.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/env.ts`
- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/api/src/modules/auth/AGENTS.md`
- Delete: `packages/validators/src/auth.ts`
- Delete: `packages/validators/src/auth.test.ts`
- Modify: `packages/validators/src/index.ts`

- [ ] **Step 1: Preservar o único comportamento de domínio que estava na rota de auth**

Escrever `routes/trainers.test.ts` para `POST /trainers/onboarding`: exige sessão trainer, usa `identity.profileId`, marca `onboardedAt`, rejeita student com `403` e mantém o contrato de resposta atualmente consumido pela web.

- [ ] **Step 2: Executar o teste e confirmar falha**

Run: `pnpm.cmd --filter @muvit/api test -- src/routes/trainers.test.ts`

Expected: FAIL porque o novo módulo/rota ainda não existe.

- [ ] **Step 3: Mover onboarding para o módulo de trainers**

Extrair o método necessário para um repositório específico de trainers, reutilizar a lógica existente e registrar a nova rota em `app.ts`. Atualizar o consumidor web/generated SDK na Task 8, não criar alias em `/auth/*`.

- [ ] **Step 4: Excluir todos os endpoints e serviços legados**

Remover os arquivos listados, o registro de `@fastify/jwt`, `JWT_SECRET`, `bcryptjs`, `@types/bcryptjs` e imports relacionados. Manter em `modules/auth` somente a infraestrutura Better Auth criada nas Tasks 2 e 3.

Remover `packages/validators/src/auth.ts`, seus testes e exports. Os formulários web/mobile podem manter schemas locais de credenciais ou um novo contrato compartilhado que não modele tokens/endpoints; preferir local se não houver reutilização real.

- [ ] **Step 5: Atualizar as regras locais de autenticação**

Em `apps/api/src/modules/auth/AGENTS.md`, substituir regras de JWT/bcrypt por regras verificáveis:

- Better Auth é a única fonte de senha, sessão e cookie;
- papéis são imutáveis;
- casos de uso recebem `RequestIdentity`, nunca tipos Better Auth;
- perfil é resolvido via `authUserId`, mas relações de domínio usam `profileId`;
- falha de provisionamento deve compensar a identidade;
- segredos/cookies/tokens não entram em logs.

Manter o arquivo com no máximo 200 linhas.

- [ ] **Step 6: Executar testes e buscas de legado no backend**

Run:

```powershell
pnpm.cmd --filter @muvit/api test -- src/routes/trainers.test.ts
pnpm.cmd --filter @muvit/api test
pnpm.cmd --filter @muvit/validators test
pnpm.cmd --filter @muvit/validators typecheck
pnpm.cmd --filter @muvit/api typecheck
rg -n "JWT_SECRET|@fastify/jwt|bcryptjs|passwordHash|signAccessToken|signRefreshToken|verifyRefreshToken|/auth/(signup|login|refresh|me)|AuthUser" apps/api packages/validators packages/db/src --glob '!**/superpowers/**'
```

Expected: testes/typechecks PASS e busca sem ocorrência de runtime legado. `password` dentro de `auth_accounts` e APIs do Better Auth é esperado; `passwordHash` não é.

- [ ] **Step 7: Commit**

```powershell
git add apps/api packages/validators pnpm-lock.yaml
git commit -m "refactor(auth): remove implementação legada"
```

## Task 6: Adaptar o seed para identidades Better Auth

**Files:**

- Modify: `packages/db/src/seeds/demo.ts`
- Modify: `packages/db/src/seeds/demo.test.ts`
- Modify: `packages/db/src/seed.ts`
- Create: `apps/api/src/seed-demo.ts`
- Modify: `apps/api/src/seed-demo.test.ts`
- Modify: `apps/api/package.json`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Fixar o contrato do seed de domínio**

Atualizar `packages/db/src/seeds/demo.test.ts` para receber IDs de perfis já provisionados e esperar:

- 1 trainer autenticável;
- 10 alunos gerenciados com `authUserId: null`;
- 1 aluno independente autenticável e sem `trainerId`;
- 24 avaliações;
- 11 planos de treino;
- 41 logs;
- rerun sem duplicação.

O pacote DB não deve importar Better Auth nem criar password/account/session.

- [ ] **Step 2: Confirmar a falha do contrato novo**

Run: `pnpm.cmd --filter @muvit/db test -- src/seeds/demo.test.ts`

Expected: FAIL porque o seed atual cria 10 alunos com senha e não recebe os perfis autenticados.

- [ ] **Step 3: Separar domínio e identidade**

Refatorar `seedDemoScenario` para aceitar:

```ts
type DemoIdentities = {
  trainer: { authUserId: string; profileId: string; email: string; name: string };
  independentStudent: { authUserId: string; profileId: string; email: string; name: string };
};
```

Os 10 alunos gerenciados continuam determinísticos, sem `authUserId` e sem senha. O aluno independente recebe dados mínimos coerentes para o mobile e não participa das métricas do trainer.

- [ ] **Step 4: Escrever o teste do orquestrador da API**

Em `apps/api/src/seed-demo.test.ts`, testar duas execuções completas. O orquestrador deve:

1. encontrar identidade demo por e-mail via banco;
2. quando ausente, chamar `auth.api.signUpEmail()` com role apropriado;
3. obter os perfis provisionados por `authUserId`;
4. passar os IDs ao seed de domínio;
5. terminar com 2 auth users, 2 accounts, 1 trainer, 11 students e os totais acima.

Não exigir sessão persistida pelo seed; se `signUpEmail` gerar sessão, revogá-la ou permitir que a limpeza de teste a remova.

- [ ] **Step 5: Implementar o orquestrador e comandos**

Criar `apps/api/src/seed-demo.ts` usando a instância Better Auth da API. Adicionar script `seed` em `@muvit/api` e mudar o `db:seed` raiz para `pnpm --filter @muvit/api seed`. `packages/db/src/seed.ts` deixa de ser o entrypoint público e exporta apenas funções de domínio, ou é removido se ficar sem responsabilidade.

- [ ] **Step 6: Atualizar documentação de credenciais**

Documentar somente:

- trainer demo para dashboard;
- aluno independente demo para mobile.

Não documentar senha para os 10 alunos gerenciados. Explicar que o seed não preserva autenticação anterior e que o comando deve apontar para banco descartável.

- [ ] **Step 7: Verificar seed e idempotência**

Run:

```powershell
pnpm.cmd --filter @muvit/db test -- src/seeds/demo.test.ts
pnpm.cmd --filter @muvit/api test -- src/seed-demo.test.ts
pnpm.cmd --filter @muvit/db typecheck
pnpm.cmd --filter @muvit/api typecheck
```

Expected: PASS e segunda execução sem alterar totais.

- [ ] **Step 8: Commit**

```powershell
git add packages/db/src/seeds packages/db/src/seed.ts apps/api/src/seed-demo.ts apps/api/src/seed-demo.test.ts apps/api/package.json package.json README.md
git commit -m "feat(seed): cria identidades demo com Better Auth"
```

## Task 7: Migrar login, cadastro, sessão e logout da web

**Files:**

- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/src/lib/auth-client.ts`
- Create: `apps/web/src/lib/auth-errors.ts`
- Create: `apps/web/src/lib/auth-client.test.ts`
- Modify: `apps/web/src/app/(auth)/login/page.tsx`
- Modify: `apps/web/src/app/(auth)/signup/page.tsx`
- Delete: `apps/web/src/app/(auth)/login/actions.ts`
- Delete: `apps/web/src/app/(auth)/signup/actions.ts`
- Modify: `apps/web/src/components/sidebar.tsx`
- Modify: testes correspondentes de login, signup e sidebar
- Modify: `apps/web/src/proxy.ts`
- Modify: `apps/web/src/proxy.test.ts`
- Delete: `apps/web/src/app/api/logout/route.ts`

- [ ] **Step 1: Instalar o cliente Better Auth**

Run: `pnpm.cmd --filter @muvit/web add better-auth@1.6.23`

Expected: dependência e lockfile atualizados.

- [ ] **Step 2: Escrever testes das bordas de autenticação**

Cobrir:

- login chama `authClient.signIn.email({ email, password })`, sem seletor de papel;
- signup chama `authClient.signUp.email({ name, email, password, role })`;
- sucesso navega para a área correta;
- erro de credenciais, e-mail duplicado, rate limit e falha inesperada recebem mensagens estáveis em pt-BR;
- logout chama `authClient.signOut()` e redireciona;
- proxy usa `getSessionCookie(request, { cookiePrefix: 'muvit' })` apenas como redirecionamento otimista.

- [ ] **Step 3: Confirmar falhas contra as Server Actions legadas**

Run: `pnpm.cmd --filter @muvit/web test -- src/proxy.test.ts src/components/sidebar.test.tsx`

Expected: FAIL nos novos contratos.

- [ ] **Step 4: Criar cliente e tradutor de erros**

Em `auth-client.ts`, usar `createAuthClient` de `better-auth/react`, baseURL pública da API e inferência do campo adicional `role`. Em `auth-errors.ts`, mapear códigos/status sem revelar se e-mail existe. Não persistir tokens nem criar cookies manualmente.

- [ ] **Step 5: Converter as páginas para chamadas client-side**

Remover as Server Actions. Manter validação e componentes visuais atuais; mudar somente o submit e feedback. O login não apresenta papel. O signup apresenta trainer/student porque ambos podem se cadastrar.

- [ ] **Step 6: Migrar logout e proxy**

O sidebar chama `authClient.signOut`. Excluir a rota Next de logout. No proxy, importar `getSessionCookie` de `better-auth/cookies`; presença de cookie permite o redirecionamento, mas nenhuma página deve tratar isso como autorização real.

- [ ] **Step 7: Executar testes e typecheck**

Run:

```powershell
pnpm.cmd --filter @muvit/web test
pnpm.cmd --filter @muvit/web typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add apps/web/package.json apps/web/src/app apps/web/src/components/sidebar.tsx apps/web/src/lib/auth-client.ts apps/web/src/lib/auth-errors.ts apps/web/src/proxy.ts apps/web/src/proxy.test.ts pnpm-lock.yaml
git commit -m "feat(web): usa sessões do Better Auth"
```

## Task 8: Encaminhar cookie no servidor web e regenerar o SDK

**Files:**

- Modify: `apps/web/src/lib/auth-server.ts`
- Modify: `apps/web/src/lib/api-client.ts`
- Modify: testes correspondentes em `apps/web/src/lib/*.test.ts`
- Delete: `apps/web/src/lib/auth-cookies.ts`
- Modify: `apps/web/src/lib/api/**/*.gen.ts`
- Modify: consumidores do endpoint de onboarding gerado

- [ ] **Step 1: Escrever testes de sessão server-side e forwarding**

Testar que `getCurrentUser()` consulta `/api/auth/get-session` encaminhando o cookie recebido pelo Next e retorna `null` em `401`. Testar que o cliente OpenAPI server-side envia o header `Cookie` original para rotas de negócio e nunca cria `Authorization: Bearer`.

- [ ] **Step 2: Confirmar falha contra o forwarding Bearer**

Run: `pnpm.cmd --filter @muvit/web test -- src/lib/auth-server.test.ts src/lib/api-client.test.ts`

Expected: FAIL porque o código atual lê `muvit_access` e usa Bearer.

- [ ] **Step 3: Implementar sessão server-side e cookie forwarding**

Usar `headers()`/`cookies()` do Next somente na borda. `auth-server.ts` pode chamar o cliente Better Auth server-side ou fazer fetch para `/api/auth/get-session`; deve retornar apenas `{ id, name, email, role }` necessário à UI. O `id` aqui é o auth user; regras de domínio continuam na API com `profileId` resolvido.

Em `api-client.ts`, encaminhar o header `cookie` integral recebido pelo Next e configurar credenciais corretamente. Excluir `auth-cookies.ts` e qualquer setter/clearer próprio.

- [ ] **Step 4: Regenerar o SDK sem iniciar servidor**

Primeiro verificar com uma requisição somente leitura se `http://localhost:3333/docs/openapi.json` já responde. Se não responder, pausar a execução e pedir ao usuário para iniciar a API; não iniciar nem reiniciar o servidor em nome dele.

Com a API disponível:

Run: `pnpm.cmd --filter @muvit/web api:gen`

Expected: SDK sem `/auth/signup/*`, `/auth/login`, `/auth/refresh` e `/auth/me`, mas com a nova rota de onboarding de trainers e todas as rotas de negócio.

- [ ] **Step 5: Ajustar consumidor de onboarding**

Trocar o uso gerado antigo pelo novo endpoint `/trainers/onboarding`, preservando UX e invalidação de cache.

- [ ] **Step 6: Verificar web e ausência de legado**

Run:

```powershell
pnpm.cmd --filter @muvit/web test
pnpm.cmd --filter @muvit/web typecheck
rg -n "muvit_access|muvit_refresh|accessToken|refreshToken|Authorization: Bearer|/auth/(signup|login|refresh|me)" apps/web --glob '!**/superpowers/**'
```

Expected: testes/typecheck PASS e nenhuma ocorrência de mecanismo legado. Referências nativas `/api/auth/*` do Better Auth são esperadas e devem ser diferenciadas dos endpoints removidos.

- [ ] **Step 7: Commit**

```powershell
git add apps/web/src/lib apps/web/src/app apps/web/src/components
git commit -m "refactor(web): encaminha cookie Better Auth"
```

## Task 9: Migrar autenticação e hidratação do Expo

**Files:**

- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/mobile/app.json`
- Create: `apps/mobile/src/lib/auth-client.ts`
- Create: `apps/mobile/src/lib/auth-errors.ts`
- Create: `apps/mobile/src/lib/auth-client.test.ts`
- Modify: `apps/mobile/app/(auth)/login.tsx`
- Modify: `apps/mobile/app/(auth)/signup.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/src/screens/profile.tsx`
- Modify: testes correspondentes
- Delete: `apps/mobile/src/lib/auth-store.ts`

- [ ] **Step 1: Instalar integrações Better Auth/Expo**

Run: `pnpm.cmd --filter @muvit/mobile add better-auth@1.6.23 @better-auth/expo@1.6.23`

Run: `pnpm.cmd --filter @muvit/mobile exec expo install expo-network`

Expected: versões compatíveis registradas e lockfile atualizado. Confirmar que `app.json` declara um scheme estável `muvit`; adicionar se estiver ausente.

- [ ] **Step 2: Escrever testes do cliente e das telas**

Cobrir com mocks das bordas da biblioteca:

- cliente usa plugin Expo, SecureStore, scheme `muvit` e prefixo de storage próprio;
- login chama `signIn.email` sem role;
- signup mobile chama `signUp.email` com `role: 'student'` fixo;
- mensagens de erro seguem o mesmo vocabulário pt-BR da web;
- layout mostra estado de carregamento durante `useSession`, redireciona sem sessão para auth e com sessão para tabs;
- fila offline e registro de push só montam com sessão autenticada;
- profile lê nome/e-mail/role da sessão e logout chama `signOut`.

- [ ] **Step 3: Confirmar falhas contra a store de tokens**

Run: `pnpm.cmd --filter @muvit/mobile test -- src/lib/auth-client.test.ts app src/screens/profile.test.tsx`

Expected: FAIL porque o app ainda depende de Zustand/access token.

- [ ] **Step 4: Criar o cliente Better Auth do Expo**

Implementação de referência:

```ts
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  plugins: [
    expoClient({
      scheme: 'muvit',
      storagePrefix: 'muvit_auth',
      storage: SecureStore,
    }),
  ],
});
```

Validar a URL pública no ponto já usado pelo app; não adicionar fallback silencioso para produção.

- [ ] **Step 5: Migrar login, signup, layout e profile**

Remover `useAuth` e a persistência manual. Usar `authClient.useSession()` como fonte de hidratação/identidade. Manter o fluxo mobile restrito a student. Em `401` ou logout, invalidar queries privadas e deixar o cliente Better Auth limpar seu storage.

- [ ] **Step 6: Excluir a store e atualizar mocks**

Excluir `auth-store.ts`. Atualizar todos os testes que mockam a store para mockar `authClient.useSession`, `signIn`, `signUp` ou `signOut`, conforme o comportamento exercitado. Não criar uma store paralela para espelhar a sessão.

- [ ] **Step 7: Executar testes e typecheck mobile**

Run:

```powershell
pnpm.cmd --filter @muvit/mobile test
pnpm.cmd --filter @muvit/mobile typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add apps/mobile pnpm-lock.yaml
git commit -m "feat(mobile): usa sessão Better Auth no Expo"
```

## Task 10: Encaminhar cookie Better Auth nas chamadas mobile

**Files:**

- Modify: `apps/mobile/src/lib/api.ts`
- Modify: `apps/mobile/src/lib/api.test.ts`
- Modify: `apps/mobile/src/lib/use-api.ts`
- Modify: `apps/mobile/src/screens/log-workout.tsx`
- Modify: `apps/mobile/src/screens/new-assessment.tsx`
- Modify: `apps/mobile/src/screens/today-workout.tsx`
- Modify: `apps/mobile/src/screens/progress.tsx`
- Modify: testes correspondentes

- [ ] **Step 1: Reescrever os testes do `ApiClient`**

Novo contrato:

```ts
type ApiClientOptions = {
  baseUrl: string;
  getCookie: () => string;
  onUnauthorized: () => void | Promise<void>;
  fetcher?: typeof fetch;
};
```

Testar:

- `Cookie` recebe o valor de `getCookie()`;
- request usa `credentials: 'omit'` no runtime nativo;
- não envia `Authorization`;
- `401` chama `onUnauthorized` uma única vez e propaga erro;
- não chama `/auth/refresh` nem repete a request;
- request pública sem cookie continua funcionando quando explicitamente permitida.

- [ ] **Step 2: Confirmar falha contra o refresh manual**

Run: `pnpm.cmd --filter @muvit/mobile test -- src/lib/api.test.ts`

Expected: FAIL porque o cliente atual usa access/refresh token.

- [ ] **Step 3: Implementar cookie forwarding**

Em `use-api.ts`, criar o client com:

```ts
getCookie: () => authClient.getCookie(),
onUnauthorized: async () => {
  await authClient.signOut();
  queryClient.clear();
},
```

No `ApiClient`, definir `Cookie` somente quando não vazio e `credentials: 'omit'`. Remover mutex, refresh, getters/setters de tokens e retry de `401`.

- [ ] **Step 4: Remover dependência de userId duplicado nas telas**

Atualizar screens para obter o auth user somente de `useSession` quando a UI precisar exibi-lo. Chamadas de domínio não devem construir ownership com auth user ID; a API resolve `profileId` pela sessão. Preservar rotas existentes e payloads funcionais.

- [ ] **Step 5: Executar suite mobile e busca de legado**

Run:

```powershell
pnpm.cmd --filter @muvit/mobile test
pnpm.cmd --filter @muvit/mobile typecheck
rg -n "auth-store|muvit_access|muvit_refresh|accessToken|refreshToken|Bearer|/auth/(signup|login|refresh|me)" apps/mobile --glob '!**/superpowers/**'
```

Expected: testes/typecheck PASS e nenhuma ocorrência do mecanismo removido. Chamadas Better Auth `signIn`/`signUp`/`getSession`/`signOut` são esperadas.

- [ ] **Step 6: Commit**

```powershell
git add apps/mobile/src/lib apps/mobile/src/screens apps/mobile/app
git commit -m "refactor(mobile): encaminha cookie Better Auth"
```

## Task 11: Atualizar configuração operacional e executar verificação final

**Files:**

- Modify: `.env.example`
- Modify: `apps/api/.env.example`
- Modify: `apps/web/.env.example`
- Modify: `apps/mobile/.env.example`
- Modify: `README.md`
- Modify: `apps/api/AGENTS.md`
- Modify: `apps/web/AGENTS.md`
- Modify: `apps/mobile/AGENTS.md`
- Modify: `packages/db/AGENTS.md`
- Modify: outros arquivos operacionais encontrados pela busca de legado, somente quando descrevem o sistema atual

- [ ] **Step 1: Atualizar exemplos de ambiente**

Documentar sem valor real:

- `BETTER_AUTH_SECRET` forte e exclusivo por ambiente;
- `BETTER_AUTH_URL` da API;
- origem pública da web;
- schemes/origens confiáveis do Expo por ambiente;
- `NEXT_PUBLIC_API_URL` e `EXPO_PUBLIC_API_URL` coerentes.

Remover `JWT_SECRET`. Não habilitar wildcard CORS/trusted origins em produção. Documentar cookies Secure/HTTP-only/SameSite e diferenças do desenvolvimento local.

- [ ] **Step 2: Atualizar os manuais locais afetados**

Nos `AGENTS.md`, registrar apenas regras recorrentes e verificáveis decorrentes da arquitetura nova. Remover instruções sobre Bearer, refresh e `passwordHash`. Garantir que cada arquivo específico permaneça com no máximo 200 linhas.

- [ ] **Step 3: Validar banco e testes completos por workspace**

Run:

```powershell
pnpm.cmd --filter @muvit/db migrate:test
pnpm.cmd --filter @muvit/db test
pnpm.cmd --filter @muvit/validators test
pnpm.cmd --filter @muvit/api test
pnpm.cmd --filter @muvit/web test
pnpm.cmd --filter @muvit/mobile test
```

Expected: todos PASS. Se a migration exigir reset do banco de teste, pausar, identificar o alvo exato e pedir autorização antes da operação destrutiva.

- [ ] **Step 4: Executar typecheck, lint e builds relevantes**

Run:

```powershell
pnpm.cmd --filter @muvit/db typecheck
pnpm.cmd --filter @muvit/validators typecheck
pnpm.cmd --filter @muvit/api typecheck
pnpm.cmd --filter @muvit/web typecheck
pnpm.cmd --filter @muvit/mobile typecheck
pnpm.cmd exec biome check apps/api apps/web apps/mobile packages/db packages/validators
pnpm.cmd --filter @muvit/api build
pnpm.cmd --filter @muvit/web build
pnpm.cmd --filter @muvit/mobile run doctor
```

Expected: todos PASS. Não iniciar servidor para validar browser nesta tarefa; a verificação interativa pode ser feita depois com o servidor mantido pelo usuário.

- [ ] **Step 5: Fazer auditoria negativa do legado**

Run:

```powershell
rg -n "JWT_SECRET|@fastify/jwt|bcryptjs|passwordHash|muvit_access|muvit_refresh|refreshToken|signAccessToken|signRefreshToken|verifyRefreshToken|Authorization: Bearer|/auth/(signup|login|refresh|me)" apps packages README.md .env.example --glob '!**/superpowers/**'
rg -n "\\u[0-9a-fA-F]{4}" apps packages README.md .env.example
git diff --check
git status --short
```

Expected:

- nenhuma ocorrência runtime/documentação operacional da autenticação própria;
- nenhuma sequência Unicode usada para representar texto pt-BR;
- `git diff --check` sem erros;
- somente mudanças coerentes com esta migração.

Os campos `accessToken`/`refreshToken` das tabelas internas `auth_accounts`, se exigidos pelo schema oficial, são exceções válidas: pertencem ao Better Auth, não ao contrato legado. Documentos históricos em `docs/superpowers/specs` e `docs/superpowers/plans` também são evidência, não runtime, e ficam fora da busca principal.

- [ ] **Step 6: Revisar critérios de aceite ponta a ponta**

Confirmar com testes/evidência:

- trainer e aluno independente cadastram, entram, recuperam sessão e saem;
- aluno gerenciado não possui `authUserId` nem conta;
- papel é único e imutável;
- e-mail é globalmente único;
- sessão dura 30 dias e atualiza a cada dia de atividade;
- rotas de negócio usam cookie e `profileId` resolvido;
- web e mobile não persistem tokens próprios;
- seed é idempotente nos totais aprovados;
- falha de provisionamento não deixa identidade órfã;
- nenhuma dependência, endpoint, cookie ou código do legado permanece.

- [ ] **Step 7: Commit final de documentação/configuração**

```powershell
git add .env.example apps/api/.env.example apps/web/.env.example apps/mobile/.env.example README.md apps/api/AGENTS.md apps/api/src/modules/auth/AGENTS.md apps/web/AGENTS.md apps/mobile/AGENTS.md packages/db/AGENTS.md
git commit -m "docs(auth): documenta operação com Better Auth"
```

- [ ] **Step 8: Revisar o histórico e preparar entrega**

Run:

```powershell
git status --short
git log --oneline --decorate -12
git diff HEAD~11..HEAD --stat
```

Expected: worktree limpo, commits focados e diff limitado à migração. Se a quantidade real de commits diferir, ajustar apenas a referência de revisão, sem reescrever histórico automaticamente.

## Observações de execução

- A versão `1.6.23` foi fixada após consulta ao Context7 e ao registry; não trocar durante a execução sem revisar mudanças de API e schema.
- A separação entre transação interna do adapter e provisionamento do perfil é deliberada. O hook `after` só considera o cadastro concluído depois do perfil; falha aciona compensação por exclusão de `auth_users` com cascade.
- O handler Fastify deve preservar todos os headers `Set-Cookie`; concatená-los em uma string quebra o cliente Expo e navegadores.
- O proxy Next verifica apenas presença do cookie. Autorização real sempre ocorre na API via `getSession`.
- A migração do banco local de desenvolvimento é destrutiva por decisão aprovada, mas sua execução ainda requer confirmar o alvo antes de apagar dados.
