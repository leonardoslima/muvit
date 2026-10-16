# MUV-40 — Professor: treinos e exercícios v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o fluxo de treinos do professor para v2 e entregar rascunhos remotos válidos com retomada e publicação segura.

**Architecture:** Rascunho em tabela separada de workout_plans, com payload normalizado validado, contexto de professor/aluno/plano original e revisão otimista. Casos de uso e repositórios preservam ownership; publicação transacional grava plano e consome draft. Mobile mantém serviços/aplicação testáveis e reutiliza primitives v2 e guard de navegação existentes.

**Tech Stack:** TypeScript, Zod, Fastify, Drizzle/PostgreSQL, Expo SDK 54, React Native 0.81, React 19, Expo Router 6, TanStack Query 5, NativeWind 4, Vitest, RNTL, Maestro e Pen CLI existentes.

**Spec:** `docs/superpowers/specs/2026-10-15-muv-40-professor-treinos-v2-design.md`.

## Global Constraints

- Sem novas dependências ou mecanismos de autenticação; Better Auth e `RequestIdentity.profileId` mantêm suas responsabilidades.
- Textos visíveis, comentários e documentação em pt-BR com UTF-8 literal.
- Tokens de `src/lib/design-system/tokens.ts` e primitives de `src/components/ui/v2`; sem aliases para o legado.
- Gutter de 16 dp, campos de referência de 52 dp, CTA de 58 dp e alvos de ícone de 48 × 48 dp, permitindo crescimento do conteúdo.
- Conteúdo rolável em 320/390/430 dp, com teclado nativo e fonte ampliada; safe areas e inset da tab bar aplicados uma vez pelo shell.
- Sem autosave, CRUD de catálogo, exclusão de plano, datas editáveis, drag-and-drop, campo tempo editável, seleção múltipla ou mídia no catálogo.
- Preservar endpoints e schemas existentes; novos contratos são aditivos. Somente o fluxo novo de rascunho recebe validação completa adicional.
- Testes integrados usam exclusivamente API/banco/portas e AVD/serial desta execução.

## Review Focus

- Duas instalações salvando/publicando o mesmo draft: revisão stale deve retornar 409 sem substituir pendências mais recentes; tarefa 2.
- Resposta perdida ou publicação repetida: nunca criar segundo plano nem consumir draft sem commit confirmado; tarefa 2.
- Aluno/plano/exercício alheio ou arquivado entre save e publish: não expor dados nem alterar o publicado; tarefa 2.
- Back/gesto/tab enquanto há request pendente e validação inválida: não abandonar valores nem disparar requests duplicados; tarefa 4.
- Cache/refetch/sessão mudam durante edição: não sobrescrever estado dirty nem mostrar draft de outra identidade; tarefas 3/4.

## Preparação e posse

Executor principal confirma claim, worktree/base, ambientes ignorados, PostgreSQL/API isolados e AVD exclusivo. Planner escreve somente spec/plano; implementação pode separar backend (tarefas 1/2) e mobile (tarefas 3–5) após fixar interfaces. Não comitar pelo planner. Cada implementador preserva arquivos/alterações concorrentes. Comandos abaixo partem da raiz; os commits são responsabilidade do executor principal após revisão.

### Tarefa 1: contratos validados e armazenamento separado

**Arquivos:** criar `packages/validators/src/workout-plan-drafts.ts` e teste adjacente; modificar `packages/validators/src/index.ts`; criar `packages/db/src/schema/workout-plan-drafts.ts`, exportar em `packages/db/src/schema/index.ts`; adicionar `isCurrent` em `packages/db/src/schema/workouts.ts`; gerar migration/snapshot/journal aditivos em `packages/db/drizzle/` pelo comando oficial.

**Interfaces:** exportar `workoutPlanDraftPayloadSchema`, `saveWorkoutPlanDraftSchema`, `publishWorkoutPlanDraftSchema`, `workoutPlanDraftSchema` e tipos `WorkoutPlanDraftPayload`, `SaveWorkoutPlanDraftInput`, `PublishWorkoutPlanDraftInput`, `WorkoutPlanDraft`. Payload é plano completo sem studentId/status/datas; usa nome/notas/dias e status ativo é definido somente na publicação. Save recebe `{ studentId, sourcePlanId?, draftId?, payload, selectedDayOrder, revision? }`; criação omite draftId/revision e update envia ambos; publish `{ payload, revision }`. Draft response contém identidade/contexto, payload, selectedDayOrder, revision, timestamps e exerciseReferences `{id,name,muscleGroup}[]`.

- [ ] RED: `rejectsInvalidDraftPayload` rejeita nome/dia/reps em branco, zero exercícios, séries 0/21/fracionárias, descanso -1/601/fracionário, carga -1/1001, oito dias e notas acima do limite. `acceptsCompleteDraftPayload` aceita 1/7 dias, séries 1/20, descanso 0/600 e carga 0/1000. `rejectsMissingSelectedDay` rejeita selectedDayOrder fora dos dias. Assertar que os schemas antigos mantêm entradas já suportadas. Cobrir create sem draftId/revision, update com ambos, e rejeitar cada combinação parcial.
- [ ] Executar `pnpm.cmd --filter @muvit/validators test src/workout-plan-drafts.test.ts`; registrar falha por exports/comportamento ausentes.
- [ ] GREEN: compor schemas compartilhados existentes com trim/refinement específicos do novo fluxo, sem relaxar limites. Definir tabela com JSONB tipado, FKs, timestamps, revision e unicidade por contexto que também cubra criação com sourcePlanId nulo. Adicionar `workout_days.is_current` com default verdadeiro para arquivar linhas substituídas sem apagar referências de logs. Tipos DB são exportados pelo padrão existente.
- [ ] Gerar `pnpm.cmd --filter @muvit/db generate`; inspecionar SQL para criação aditiva somente. Executar `pnpm.cmd --filter @muvit/db migrate:test`, validators test/typecheck e DB typecheck; esperar PASS no banco exclusivo.
- [ ] Revisar schema/migration; commit sugerido `feat(workouts): definir contrato de rascunhos remotos válidos (MUV-40)`.

### Tarefa 2: API de drafts e publicação atômica

**Arquivos:** criar `apps/api/src/modules/workouts/repositories/workout-plan-drafts-repository.ts`, `drizzle-workout-plan-drafts-repository.ts`, casos de uso `save-workout-plan-draft.ts`, `list-workout-plan-drafts.ts`, `get-workout-plan-draft.ts`, `publish-workout-plan-draft.ts`; modificar factory, rotas workouts, repositório de planos, repositório de logs e testes; extrair helper transacional das escritas de planos se necessário, mantendo-o em repositories.

**Interfaces:** repository oferece portas pequenas `save`, `listForStudent`, `findById` e `publish` consumidas individualmente. Os quatro use cases expõem `execute(identity: RequestIdentity, ...)`; reutilizam StudentAccessPolicy e verificação do plano original. Rotas: GET `/students/:studentId/workout-plan-drafts`, POST `/workout-plan-drafts`, GET `/workout-plan-drafts/:id`, POST `/workout-plan-drafts/:id/publish`; todas somente trainer. Save retorna WorkoutPlanDraft; publish retorna workoutPlanFullSchema.

- [ ] RED: em teste de rota criar professor/aluno/exercício explicitamente. Salvar draft de criação, buscar em outro cliente autenticado e assertar mesmos payload/dia/revisão, sem novo workout_plan. Salvar draft de ativo e assertar plano publicado byte a byte inalterado. Rejeitar 400 inválido, 403 student, 404 outro professor/aluno/exercício privado/plano alheio/arquivado.
- [ ] RED: salvar revisão 1 → 2; tentativa com 1 recebe 409 e mantém 2. Publicar usando payload atual diferente do salvo e revisão 2; assertar plano ativo com valores finais e draft ausente. Duas publicações concorrentes criam exatamente um plano. Falha dentro da transação mantém draft e plano original. Arquivar/remover original depois do save bloqueia publish sem converter em criação. Ao atualizar/publicar edição, preservar logs e séries ligados aos dias antigos, devolver somente dias atuais no plano e impedir iniciar novo log em dia antigo.
- [ ] Executar `pnpm.cmd --dir apps/api test src/routes/workouts.test.ts`; registrar RED. Se separar teste em `workout-plan-drafts.test.ts`, usar explicitamente esse caminho também.
- [ ] GREEN: implementar use cases finos e políticas injetadas, resolver nomes/grupos do catálogo real, aplicar unicidade/revisão condicional. Na publicação, transação bloqueia draft, revalida acesso/contexto e confirma revisão antes de criar/atualizar e consumir. Não chamar create/update HTTP e delete em sequência. Substituir a prescrição arquivando dias anteriores (`isCurrent=false`) e inserindo os atuais sem apagar logs/séries; filtrar dias arquivados nas leituras de planos e bloquear novos logs para esses dias. Registrar a decisão concreta no handoff.
- [ ] Reexecutar testes de workouts e suíte API; rodar API typecheck e `pnpm.cmd exec biome check apps/api packages/validators packages/db` no escopo alterado. Esperar PASS e inspecionar queries/transaction para concorrência.
- [ ] Commit sugerido `feat(api): persistir e publicar rascunhos de treino com revisão (MUV-40)`.

### Tarefa 3: serviços mobile e estado semântico do editor

**Arquivos:** modificar `apps/mobile/src/application/workouts/trainer-workout-data.ts`, teste adjacente, `workout-editor.ts` e teste adjacente; criar `workout-editor-draft.ts` e teste adjacente para normalização/hidratação/dirty se isso mantiver responsabilidade focada.

**Interfaces:** serviços `listTrainerWorkoutDrafts(api, studentId, signal?)`, `getTrainerWorkoutDraft(api, draftId, signal?)`, `saveTrainerWorkoutDraft(api, input)` e `publishTrainerWorkoutDraft(api, draftId, input)` usam tipos da tarefa 1. Helpers `buildWorkoutDraftPayload(state)` devolvem `BuildWorkoutInputResult<WorkoutPlanDraftPayload>`; `hydrateWorkoutDraftEditorState(draft, createId)` restaura strings/referências e devolve o dia selecionado; `getWorkoutEditorSnapshot(state)` ignora localId/foco; `isWorkoutEditorDirty(state, baseline)` compara snapshots e ordens; `trainerWorkoutDraftQueryKey(authUserId, studentId)` particiona cache privado por conta e contexto.

- [ ] RED: draft válido normaliza vírgula 42,5, opcionais vazios, ordens e tempo recebido; valores inválidos produzem primeira mensagem e zero request. Publicação normal força active, removendo dependência do seletor de status. Hidratação usa exerciseReferences e preserva dia selecionado, inclusive exercício fora da primeira página do catálogo.
- [ ] RED: editar/restaurar valores limpa dirty; mover e desfazer ordem limpa dirty; trocar localId/foco não altera dirty. Serviços assertam URL/método/body/draftId/revision/signal; update de draft remoto envia ID e revisão juntos. Cache de draft fica particionado pela identidade autenticada e contexto, e troca de conta não reaproveita dados privados.
- [ ] Executar `pnpm.cmd --dir apps/mobile test src/application/workouts/workout-editor.test.ts src/application/workouts/trainer-workout-data.test.ts src/application/workouts/workout-editor-draft.test.ts`; registrar RED.
- [ ] GREEN: implementar helpers puros em application sem React Native/router/storage; reaproveitar parsers e validação existentes. Manter APIRequester/Better Auth na borda, sem AsyncStorage de drafts. Usar schemas compartilhados na interface para impedir divergência de payload.
- [ ] Reexecutar os testes específicos e mobile typecheck; esperar PASS. Commit sugerido `feat(mobile): preparar retomada de rascunhos de treino (MUV-40)`.

### Tarefa 4: editor v2, proteção de saída e retomada

**Arquivos:** modificar `apps/mobile/src/screens/trainer-workout-editor.tsx` e teste; criar `apps/mobile/src/lib/use-trainer-workout-editor.ts` e teste para controller; criar `apps/mobile/src/components/workouts/workout-editor-exit-sheet.tsx` e teste; modificar `workout-editor-day.tsx` e teste; manter wrappers Expo Router existentes, aceitando draftId por parâmetro.

**Interfaces:** controller recebe `{ api, authUserId, studentId, planId?, draftId?, mode }` e devolve editor/activeDay/dirty/busy/feedback, mutações locais, `saveDraft(): Promise<boolean>` e `publish(): Promise<boolean>`. `saveDraft`/`publish` retornam true somente após persistência confirmada, com erro false e valores preservados. Sheet recebe `{ visible, busy, error, onContinue, onSave, onDiscard }`; regra de validação/navegação fica no controller/screen. Usar `usePreventRemove` existente e action capturada para saída exata.

- [ ] RED com promises adiadas: header, Back/gesto e navegação abrem o mesmo sheet; continuar/scrim/Back conserva valores; discard abandona somente edição local. Durante save/publish não ocorre saída, dispensa ou segundo request. Save inválido mantém editor e não chama API; falha remota mantém sheet e permite retry; sucesso dispara action capturada uma vez. Testar fechamento/retorno sem stack anterior.
- [ ] RED: draft retomado mostra mensagem e valores/dia selecionado; publish usa draftId/revision/payload atual; original ativo não é atualizado até publicação; dirty impede refetch tardio. Plano arquivado/404/outro aluno bloqueia conteúdo e requests. Falha de invalidação após resposta salva não provoca novo POST nem mensagem falsa de ausência de gravação.
- [ ] RED UI: seletor de status e botões Ver treino/Voltar do corpo ausentes; header com reload único; remoção de dia no cartão selecionado, último dia bloqueado, dia vazio direto e preenchido com Alert. Foco do lápis muda indicação; alteração/reordenação domina foco e restauração limpa indicador. Limite sete e extremos bloqueados.
- [ ] Executar testes da screen/controller/day/sheet; registrar RED e implementar GREEN com primitives v2, TrainerScreen, tokens e campos em duas colunas. Controller mantém regras/efeitos; screen conecta router/guard; sheet somente apresenta. Conservar mensagens exatas do handoff, exceto textos inválidos resolvidos pela decisão de 15/10.
- [ ] Reexecutar testes específicos, coverage:core (mínimo 85%), coverage:ui e mobile typecheck; esperar PASS. Commit sugerido `feat(mobile): migrar editor de treinos e proteger saída (MUV-40)`.

### Tarefa 5: lista, detalhe, catálogo e descoberta do draft

**Arquivos:** modificar screens `trainer-workouts.tsx`, `trainer-workout-detail.tsx` e testes; componentes `workout-plan-list-item.tsx`, `workout-day-card.tsx`, `workout-status-badge.tsx`, `exercise-catalog-modal.tsx` e testes; criar item de draft local somente se a apresentação existente não comportar callback/contexto sem sobrecarga.

**Interfaces:** lista continua `listTrainerWorkoutPlans` e acrescenta `listTrainerWorkoutDrafts` da tarefa 3 com query por identidade/aluno. Continuar draft navega editor de criação ou edição conforme sourcePlanId, encaminhando draftId. Detalhe mantém TrainerWorkoutPlan/ownership e catálogo mantém ExerciseCatalogPage/limit 50/offset acumulado.

- [ ] RED: header e refresh únicos em estados vazio/loading/erro; 404 após cache oculta planos/drafts/detalhe; falha recuperável mantém conteúdo; contexto inválido não chama API. Draft salvo aparece para mesma conta, navega corretamente e fica ausente em outra identidade. Arquivado não oferece editar.
- [ ] RED: opcionais ausentes não viram zero, carga pt-BR e notas extensas renderizam; catálogo aplica trim somente ao buscar, limpa texto sem remover grupo, preserva busca/filtro ao fechar, calcula offset acumulado e retry correto. Fetch bloqueia seleção/filtros/busca e mantém fechar disponível.
- [ ] Executar testes específicos e registrar RED; migrar GREEN para primitives/tokens v2 sem aliases, mantendo StatePanel sem card e sem ações duplicadas no conteúdo. Catálogo usa SheetSurface/maxHeight 92%, opções roláveis e linhas com toque acessível.
- [ ] Reexecutar testes específicos e suíte mobile; conferir ausência de imports legados nos arquivos migrados. Commit sugerido `feat(mobile): migrar consulta e catálogo de treinos para v2 (MUV-40)`.

### Tarefa 6: QA real, handoff e revisão independente

**Arquivos:** atualizar `docs/mobile-v2-trainer-workouts.md` para a decisão de 15/10 e contrato/API/draft implementados; acrescentar evidências reais e operação/migration em documento local apropriado; flows Maestro somente se necessários ao comportamento novo. Não alterar o Pen para adaptar requisitos ao código.

- [ ] Inspecionar via Pen CLI quadros v3bKo6/B6INq/OgWFW/f81SIu/aybsK/UFwPa/osTYQ/CacGB e catálogo uRzoD, registrando exports realmente observados. Conferir 320/390/430 dp e diferenças justificadas pela resolução de validade de drafts.
- [ ] Com API/banco exclusivos ativos e AVD/serial confirmado, executar Maestro/ADB: lista/detalhe/novo, adicionar/reordenar/remover exercício/dia, teclado com vírgula/carga, sete dias, invalidade ao salvar draft, continuar/descartar/erro/retry/exit bloqueado. Confirmar draft de ativo sem alteração publicada.
- [ ] Demonstrar retomada remota por nova instalação/sessão sem cache local e mesmo backend isolado; publicar e verificar draft consumido/um plano ativo. Repetir publicação na API para confirmar ausência de duplicata. Anexar captura/evidência de fonte ampliada e layout estreito; reportar limites observados.
- [ ] Rodar checks finais do diff: validators test/typecheck; DB migrate:test/typecheck; API test/typecheck; mobile test/typecheck/doctor; coverage:core/UI; Biome no escopo; `git diff --check`; busca de escapes Unicode nos arquivos textuais alterados. Repetir somente após novas mudanças ou falhas.
- [x] Subagente independente revisou diff/HEAD atual, sobretudo transação, ownership, stale, descarte, guard e histórico. O único achado P3 sobre scripts incidentais foi corrigido; a revisão final do código e do handoff aprovou sem pendências.
- [x] Executor principal commitou e publicou a branch, abriu [PR #28](https://github.com/leonardoslima/muvit/pull/28) para `develop`, conferiu os checks/CI no SHA de entrega, anexou a PR e moveu Linear para `In Review`. Não moveu para Done nem realizou merge.

## Registro de execução run-34 (16/10/2026)

Implementação das tarefas 1–5 e contrato aditivo de rascunhos concluídos. A suíte API passou com 101 testes; validators com 36; mobile com 799. Typecheck passou em mobile, API, validators e DB; Biome verificou 163 arquivos. Cobertura mobile: core 94,17% e UI 86,16% de statements. A aprovação de código independente foi recebida sem achados após reverter as alterações incidentais do prebuild.

QA Android real validou o editor em 320/390 dp e o ciclo remoto de salvar, retomar após reiniciar o processo e publicar. As capturas estão em `docs/evidence/muv-40/` e são referenciadas no handoff. AVD nativo de 430 dp e reinstalação/segundo aparelho não foram testados; 430 dp foi conferido por export do Pen. Expo Doctor ficou em 16/17 por dois desalinhamentos de versão já existentes em `develop`. A PR #28 está aberta e todos os checks do CI passaram; Linear está em `In Review`. Nenhum merge foi realizado.
