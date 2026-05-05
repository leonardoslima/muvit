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
