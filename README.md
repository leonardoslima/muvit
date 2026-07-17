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
cp .env.example .env
docker compose up -d        # Postgres + Redis
pnpm db:migrate
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3333
- API docs: http://localhost:3333/docs

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

Depois de aplicar as migrations, execute `pnpm db:seed`. O comando recria um professor, dez alunos, exercícios globais, avaliações, planos de treino e histórico dos últimos 90 dias para teste manual. Todos os dados são fictícios e gerados de forma reproduzível com Faker.

- Professor: `trainer@muvit.dev` / `12345678`
- Alunos: `aluno01@muvit.dev` até `aluno10@muvit.dev`, todos com a senha `12345678`.
