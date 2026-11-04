# MUV-35 — Cápsula de resultado

- **Data:** 13/10/2026
- **Issue:** [MUV-35 — Migrar aluno: Hoje e visão geral do treino para UI/UX v2](https://linear.app/muvit/issue/MUV-35/migrar-aluno-hoje-e-visao-geral-do-treino-para-uiux-v2)
- **Base validada:** `develop` atualizado em `d8b3d2a` (MUV-38).
- **Branch:** `feat/muv-35-migrar-aluno-hoje-e-visao-geral-do`.

## Escopo entregue

Migração mobile de Hoje e visão geral com estados de disponível, retomada, sem plano/dia sem treino, loading, erro e retry preservados. A lista de exercícios mantém detalhes contextuais e retorno para a origem; início e retomada continuam usando a sessão existente. Diff final restrito ao mobile, Maestro e artefatos de planejamento MUV-35: sem mudanças em API, banco, validators, tipos web, regras de treino ou dependências.

## Verificações no `develop` atual

- `pnpm.cmd -F @muvit/mobile test --hookTimeout=30000 --maxWorkers=4` — 64 arquivos, 569 testes aprovados, incluindo regressões para atualização e remoção de prescrição em cache.
- `pnpm.cmd -F @muvit/mobile typecheck` — aprovado.
- `pnpm.cmd exec biome check <arquivos móveis alterados>` — 14 arquivos verificados, sem alterações necessárias.
- `pnpm.cmd -F @muvit/mobile test:coverage:core --hookTimeout=30000 --maxWorkers=4` — 93,97% statements, 86,79% branches, 98,93% functions e 97,51% linhas.
- `pnpm.cmd -F @muvit/mobile test:coverage:ui --hookTimeout=30000 --maxWorkers=4` — 90,96% statements, 87,89% branches, 93,62% functions e 95,18% linhas.
- `pnpm.cmd -F @muvit/mobile exec expo export --platform android` — aprovado; bundle de 4.118 módulos e 84 assets.
- `maestro check-syntax .maestro/login-aluno.yaml` e `maestro check-syntax .maestro/muv-35-aluno-hoje.yaml` — ambos aprovados.
- `git diff --check` e busca por escapes Unicode nos arquivos alterados — sem problemas.
- Expo Doctor: 16/17 checks. O único check falha pelas versões já presentes no `develop`: `sentry-expo` 7.2.0 (esperado `~7.0.0`) e `@react-navigation/bottom-tabs` 7.16.0 (esperado `^7.4.0`); o diff MUV-35 não altera essas dependências.
- Revisão independente aprovada para a implementação no SHA `82fd8f1`; o achado de cache obsoleto foi corrigido e coberto por testes de atualização/remoção.
- PR [#23](https://github.com/leonardoslima/muvit/pull/23) aberta para `develop`; o primeiro ciclo do GitHub Actions passou em Biome, Test Mobile, Build e TypeScript.

## Android e evidências visuais

- AVD desta execução: `MUV35_QA`, serial `emulator-5558`; o AVD MUV-39 (`emulator-5570`) não foi alterado.
- Maestro executado no SHA rebaseado a 390 dp: login, Hoje, visão geral, abertura de exercício, retorno e volta a Hoje — aprovado. A correção posterior de sincronização de cache foi verificada por testes de regressão e pelo CI.
- Sessão nativa manual anterior verificou início, salvar e sair, retomada no mesmo exercício e encerramento sem submeter séries.
- Capturas manuais anteriores ao rebase, em `%TEMP%\muv35-qa-20261013`: Hoje/visão geral em 320 e 390 dp; em 430 dp com fonte 1,5, texto envolvido sem clipping e CTA acessível após rolagem.
- O ensaio ampliado 320 dp + fonte 1,5 após o rebase encontrou o tutorial/menu inicial do Expo Go durante o login e não chegou às telas MUV-35. As capturas estreitas/ampliadas são anteriores à atualização da base; o fluxo funcional foi repetido na base atual em 390 dp.
- A densidade do AVD foi restaurada para 443, escala de fonte 1,0, Wi-Fi e dados ligados.
- Os três URLs temporários usados em dados de demonstração foram removidos do PostgreSQL isolado MUV-35; a contagem final de exercícios com `video_url` preenchido é zero.

## Handoff

PR #23 está pronta para revisão humana; manter MUV-35 em `In Review` até a aprovação humana. Não fazer merge nem marcar a issue como concluída.
