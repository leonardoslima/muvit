# Muvit

Plataforma de treinos para personal trainers e alunos independentes.

Monorepo gerenciado por pnpm + Turborepo.

## Estrutura

```
apps/
  web/          Dashboard do trainer (Next.js 16)
  api/          Backend REST (Fastify)
  mobile/       App do aluno (React Native / Expo) — TODO
packages/
  db/           Schema Drizzle + migrações
  validators/   Schemas Zod compartilhados
  config/       Configs base (TS, Biome)
  ui/           Componentes shadcn/ui — TODO
assets/
  design/       Arquivos do Pencil (.pen) e exports de design
  images/       Mockups e screenshots de referência
```

## Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
cp packages/db/.env.example packages/db/.env
cp apps/api/.env.test.example apps/api/.env.test
cp packages/db/.env.test.example packages/db/.env.test
docker compose up -d postgres postgres_test redis
pnpm db:migrate
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3333
- API docs: http://localhost:3333/docs
- PostgreSQL de desenvolvimento: `localhost:5432`, banco `muvit`
- PostgreSQL de teste: `localhost:5433`, banco `muvit_api_test`

### Banco de testes e testes de integração

O ambiente local mantém dois bancos PostgreSQL isolados:

- `muvit` em `localhost:5432` é o banco de desenvolvimento usado pela aplicação normalmente.
- `muvit_api_test` em `localhost:5433` é usado exclusivamente pelos testes de integração da API.

Ao executar os testes da API, o script aplica as migrations ao banco configurado em `apps/api/.env.test` e os testes de integração limpam suas tabelas antes de cada caso. A limpeza usa `TRUNCATE ... RESTART IDENTITY CASCADE`: remove os dados de teste, reinicia os contadores de IDs e limpa registros relacionados. Ela não remove o banco, as tabelas ou as migrations.

Nunca aponte `DATABASE_URL` de teste para `muvit`: essa limpeza apagaria os dados de desenvolvimento. A aplicação iniciada em modo de desenvolvimento continua usando apenas os arquivos `.env`, não os `.env.test`.

Ainda não há uma suíte E2E. Quando ela for criada, deverá iniciar a API com o ambiente de teste e reutilizar `muvit_api_test`. Testes de integração e E2E não podem executá-lo simultaneamente, pois ambos precisam controlar e limpar o mesmo estado; cada execução E2E deverá preparar seus próprios dados no início.

### Autenticação e ambiente

O Better Auth é a única fonte de senha, sessão e cookies. A API converte a sessão em identidade de domínio; web e mobile não persistem tokens próprios.

- `BETTER_AUTH_SECRET` deve ser aleatório, ter pelo menos 32 caracteres e ser exclusivo por ambiente.
- `BETTER_AUTH_URL` aponta para a URL pública da API. `WEB_URL` e cada item de `EXPO_TRUSTED_ORIGINS` devem ser origens exatas; não use wildcard em produção.
- `NEXT_PUBLIC_API_URL` e `EXPO_PUBLIC_API_URL` devem apontar para a mesma API alcançável por cada cliente. Builds mobile de produção falham quando a URL pública não está configurada.
- O navegador e o Expo autenticam com o cookie emitido pela API. Cookies de sessão são `HttpOnly`; em HTTPS de produção também devem ser `Secure`. Use `SameSite=Lax` quando web e API forem same-site; topologias realmente cross-site exigem `SameSite=None` junto de `Secure`.
- O desenvolvimento local em HTTP pode usar cookie sem `Secure`, apenas para `localhost` e dispositivos de teste. Produção deve usar HTTPS e origens explícitas.
- Desenvolvimento e testes usam somente PostgreSQL. Não crie SQLite, `index.db` ou outro banco em arquivo no projeto.

## Scripts

| Comando | Descrição |
| --- | --- |
| `pnpm dev` | Inicia os workspaces em modo de desenvolvimento. |
| `pnpm build` | Gera o build dos workspaces. |
| `pnpm lint` | Executa as verificações do Biome no monorepo. |
| `pnpm format` | Formata os arquivos do monorepo com o Biome. |
| `pnpm test` | Executa os testes dos workspaces. |
| `pnpm typecheck` | Executa a verificação de tipos dos workspaces. |
| `pnpm db:generate` | Gera migrations do banco com o Drizzle Kit. |
| `pnpm db:migrate` | Aplica as migrations no banco local. |
| `pnpm db:studio` | Abre o Drizzle Studio para inspecionar o banco. |
| `pnpm db:seed` | Recria os dados de demonstração para testes manuais. |
| `pnpm mobile:start` | Inicia o servidor de desenvolvimento do Expo. |
| `pnpm mobile:android` | Abre o app mobile no Android. |
| `pnpm mobile:ios` | Abre o app mobile no iOS. |
| `pnpm mobile:web` | Abre o app mobile no navegador. |
| `pnpm mobile:test` | Executa os testes do app mobile. |
| `pnpm mobile:typecheck` | Executa a verificação de tipos do app mobile. |
| `pnpm mobile:doctor` | Verifica a configuração e as dependências do projeto Expo. |

### Dados de demonstração

Depois de aplicar as migrations, execute `pnpm db:seed`. O comando cria um professor autenticável, dez alunos gerenciados sem login, um aluno independente autenticável, exercícios globais, avaliações, planos de treino e histórico para teste manual. Todos os dados são fictícios e gerados de forma reproduzível com Faker.

- Dashboard — professor: `trainer@muvit.dev` / `12345678`
- Mobile — aluno independente: `aluno.independente@muvit.dev` / `12345678`

Os dez alunos gerenciados não possuem conta ou senha. O seed não preserva autenticação anterior à migração e deve ser executado somente contra um banco descartável.
