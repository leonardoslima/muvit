# MUV-36 — Sessão guiada v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** migrar a sessão guiada do aluno para o Pen aprovado, preservando comportamento e persistência e permitindo consultar a demonstração disponível sem perder o contexto.

**Architecture:** conservar a rota `/session/:dayId` e uma única instância de `useGuidedWorkoutSession`; extrair apresentação e seleção pura de dados. Demonstração abre localmente em tela inteira e reutiliza os detalhes existentes; consulta de mídia fica separada do snapshot/journal e usa somente contratos atuais.

**Tech Stack:** TypeScript, Expo SDK 54/React Native 0.81, Expo Router, NativeWind, TanStack Query, Zod, Vitest/React Native Testing Library, Maestro; `expo-video ~3.0.16` e `expo-image ~3.0.11` para vídeo/GIF nativos.

**Spec:** [MUV-36 — design](../specs/2026-10-14-muv-36-guided-session-v2-design.md). Ler também `docs/mobile-v2-student-session.md`, cuja tabela de 45 estados é a matriz visual completa.

## Global Constraints

- Hoje, visão geral, progresso, avaliações, autenticação, API, banco, validators, algoritmo de treino, storage e journal ficam fora do diff funcional.
- Usar `src/lib/design-system/tokens.ts`, DM Sans e primitives v2; substituir imports legados nos arquivos migrados, sem aliases.
- Base 390 dp, gutter 16 dp, CTA de referência 58 dp; campos empilham em 320 dp e com fonte ampliada.
- O snapshot não garante mídia offline; sem arquivo local comprovado, apresentar o estado offline aprovado.
- Não há aprovação intermediária nesta execução autônoma. Planner cria somente spec/plano; commits e recursos externos pertencem ao coordenador, seguindo o workflow Muvit.
- Executar comandos na raiz desta worktree existente. Confirmar os `.env` locais copiados antes de setup/build/runtime; não imprimir secrets nem criar outra worktree.
- Preservar UTF-8 literal pt-BR, sem `any`, assertions não nulas, placeholders ou código morto. Nenhuma mudança global de configuração de teste para contornar falhas.

## Review Focus

1. Strings vazias, vírgula decimal e duas edições rápidas não podem virar defaults nem perder o último valor ao abrir/fechar a mídia — tarefas 2 e 4.
2. Back com mídia ampliada fecha somente fullscreen; o segundo volta à sessão e o terceiro protege a saída — tarefa 4.
3. Descanso vencido durante demonstração ou suspensão do app permanece em `rest`/00:00, sem reiniciar nem avançar — tarefas 2 e 4.
4. Resposta de mídia atrasada após troca A → B → A ou troca de dia não reapresenta outro exercício/URL — tarefas 3 e 4.
5. Falha de save/discard/finalização e limpeza de rascunho após journal terminal conservam a fase real e nunca permitem conclusão duplicada — tarefas 1, 2 e 5.

## Arquivos e propriedade

Todos os caminhos abaixo partem da raiz. O implementador deve acomodar os dois documentos do planner e outras alterações do coordenador, sem revertê-las.

| Arquivo | Responsabilidade |
| --- | --- |
| `apps/mobile/src/screens/log-workout.tsx` e `.test.tsx` | Borda do controlador, navegação, abertura da demonstração e integração dos estados |
| `apps/mobile/src/components/workouts/guided-session-layout.tsx` | Safe area, paleta imersiva, scroll/teclado e conteúdo original retido |
| `apps/mobile/src/components/workouts/guided-session-content.tsx` e `.test.tsx` | Apresentação das cinco fases, header, campos e feedback |
| `apps/mobile/src/components/workouts/guided-session-exit-sheet.tsx` | Sheet v2 de saída; callbacks existentes recebidos por props |
| `apps/mobile/src/application/workouts/guided-session-presentation.ts` e `.test.ts` | Seleção pura de dados e ajuste dos botões numéricos |
| `apps/mobile/src/components/workouts/workout-exercise-details.tsx` | Prescrição/observação extraídas da tela existente, reutilizadas na demonstração |
| `apps/mobile/src/screens/workout-exercise.tsx` e `.test.tsx` | Reutilização do componente extraído, sem alterar loader/contexto/retorno |
| `apps/mobile/src/application/exercises/session-exercise-media.ts` e `.test.ts` | Resolver mídia por ID exato no catálogo já autorizado |
| `apps/mobile/src/lib/use-session-exercise-media.ts` | Query por identidade/dia/exercício, conectividade e retry da mídia |
| `apps/mobile/src/components/workouts/guided-session-demonstration.tsx` e `.test.tsx` | Tela local clara, contexto, foco, retorno e apresentação dos estados de mídia |
| `apps/mobile/src/components/workouts/exercise-demonstration-media.tsx` e `.test.tsx` | Recursos nativos de vídeo/GIF, reprodução, erro, retry e fullscreen |
| `apps/mobile/package.json`, `pnpm-lock.yaml` | Duas dependências Expo necessárias à mídia aprovada |
| `apps/mobile/vitest.ui-coverage.config.ts` | Incluir os componentes extraídos da sessão na medição crítica, mantendo thresholds |
| `.maestro/muv-36-aluno-sessao-guiada.yaml`, `docs/muv-36-result-capsule.md` | Fluxo nativo reproduzível e evidências/limites da entrega |

`src/lib/use-guided-workout-session.ts`, `guided-session.ts`, `workout-session-storage.ts` e `log-queue.ts` são referências e alvos de regressão, sem refatoração planejada. Não acrescentar stores, rotas, migrations ou contratos HTTP.

### Tarefa 1: Shell imersivo, estados iniciais e saída segura

**Arquivos:** modificar `apps/mobile/src/screens/log-workout.tsx` e `.test.tsx`; criar `guided-session-layout.tsx` e `guided-session-exit-sheet.tsx` nos caminhos da tabela.

**Interfaces:** consumir `GuidedWorkoutController`, `usePreventRemove(draftActive, callback)`, `saveDraft(): Promise<boolean>`, `discard(): Promise<boolean>` e `navigation.dispatch(action)`. Produzir componentes `GuidedSessionLayout(props: GuidedSessionLayoutProps): React.JSX.Element` e `GuidedSessionExitSheet(props: GuidedSessionExitSheetProps): React.JSX.Element`; props do sheet: `visible`, `busy`, contexto textual, `storageError`, `onContinue: () => void`, `onSave: () => Promise<void>`, `onDiscard: () => Promise<void>`. Layout aceita children, ref do ScrollView e estado de acessibilidade do conteúdo encoberto.

- [ ] Acrescentar testes à suíte real de `LogWorkoutScreen`: header fechar disponível em loading/erro/completed sem draft; retry não duplica operação; texto **Descartar treino**; continuidade não navega; save/discard navegam somente após resolver `true`; `false` conserva sheet e valores; ação interceptada é despachada uma vez; troca de identidade/dia limpa ação pendente; `busy` bloqueia fechamento e ações concorrentes.
- [ ] Rodar `pnpm.cmd --dir apps/mobile test src/screens/log-workout.test.tsx`; confirmar que os testes novos falham pelas diferenças de UI e que os testes de persistência anteriores continuam presentes.
- [ ] Extrair o shell e sheet, usar IconButton/Button/SheetSurface/StatePanel/Message/Text v2 e tokens. Aplicar safe area/fundo imersivo na raiz, sem tab bar; gerenciar IME uma vez, rolagem real e status bar clara somente enquanto a sessão está visível. Preservar callbacks e precedência do controlador; **Descartar treino** é o mesmo `discard()` existente.
- [ ] Renderizar header também sem dados. StatePanel ocupa conteúdo sem card e sem spinner duplicado; avisos com dados não substituem a sessão. Não adicionar confirmação de rascunho seguro em erro.
- [ ] Repetir o teste específico; resultado esperado: todos os casos da suíte passam, inclusive navegação protegida e ordenação de saves. Revisar diff para imports legados afetados e alterações fora de escopo antes do gate do coordenador.

### Tarefa 2: Série, controles, descanso, avanço e resumo v2

**Arquivos:** criar `guided-session-presentation.ts`/`.test.ts` e `guided-session-content.tsx`/`.test.tsx`; integrar em `log-workout.tsx`/`.test.tsx`.

**Interfaces:** `selectGuidedSessionView(day: WorkoutDay, session: GuidedSession): GuidedSessionView`, com `currentExercise`, `currentSet`, `previousSet`, `nextExercise` e `progress: ReturnType<typeof getWorkoutDraftProgress>`; exercícios são `WorkoutDay['exercises'][number] | undefined`, séries são `WorkoutSetState | undefined`. `adjustSessionValue(value: string, delta: 1 | -1): string` é puro e usa `toOptionalNumber`. `GuidedSessionContent` recebe controlador, seleção e `onOpenDemonstration(exercise: WorkoutDay['exercises'][number]): void`; não consulta rede/storage.

- [ ] Escrever testes puros e de UI com afirmações: `adjustSessionValue('', 1) === '1'`, `adjustSessionValue('0', -1) === '0'`, `adjustSessionValue('16,5', 1) === '17.5'`, texto não numérico preservado; strings iniciais não mudam sem interação; progresso 0/2 depois de uma série e 1/2 depois de concluir o primeiro exercício; referência anterior só do mesmo exercício; próximo exercício identificado sem avançar o estado.
- [ ] Acrescentar testes com relógio controlado: término passado mostra **00:00**, não chama `skipRest`; **+15 s** e **Pular descanso** permanecem disponíveis. Cobrir `exercise-complete` com card do próximo, `ready-to-finish` sem resumo prematuro, finalização ocupada/retry, `queued=true` e erro de remoção pós-conclusão conservando métricas.
- [ ] Rodar `pnpm.cmd --dir apps/mobile test src/application/workouts/guided-session-presentation.test.ts src/components/workouts/guided-session-content.test.tsx src/screens/log-workout.test.tsx`; confirmar falhas pertinentes dos testes novos.
- [ ] Implementar seletores e fases com NumericField imersivo. Campos centrais usam as strings do controlador, teclado nativo adequado, labels/unidades e callbacks `updateSet`; botões chamam somente o ajuste de passo. Usar prescrição/carga real, nunca os valores ilustrativos do Pen como defaults.
- [ ] Apresentar transições pelos cinco valores de `session.phase`, sem nova máquina de estados. Timer deriva de `restEndsAtMs` e `Date.now()` e atualiza no retorno ao foreground. CTA/erro carregam estado de operação sem permitir ações concorrentes. Resumo vem exclusivamente de `controller.summary` e `queued`.
- [ ] Empilhar campos por largura/escala de fonte; preservar nome inteiro, rolagem, alvo mínimo e CTA alcançável. Conferir referência `P36u7N`: título compacto 20 sp antes da escala do sistema. Não copiar barra do sistema, altura de teclado ou viewport dos quadros.
- [ ] Repetir o comando específico e `pnpm.cmd --dir apps/mobile test src/application/workouts/guided-session.test.ts src/application/workouts/workout-log.test.ts src/lib/workout-session-storage.test.ts src/lib/log-queue.test.ts`; esperado: testes novos e regressões passam sem editar transições, storage ou journal.

### Tarefa 3: Resolver mídia acessível e reutilizar detalhes existentes

**Arquivos:** criar `session-exercise-media.ts`/`.test.ts`, `use-session-exercise-media.ts`, `workout-exercise-details.tsx`; adaptar somente a composição de `workout-exercise.tsx`/`.test.tsx`.

**Interfaces:** `SessionExerciseMedia = { kind: 'available'; uri: string; format: 'video' | 'gif' } | { kind: 'missing' }`; `loadSessionExerciseMedia(api: ApiRequester, exerciseId: string, signal?: AbortSignal): Promise<SessionExerciseMedia>`. `useSessionExerciseMedia({authUserId, dayId, exerciseId, enabled}: {authUserId?: string; dayId?: string; exerciseId?: string; enabled: boolean})` expõe query/data, estado offline, loading/erro e `retry(): void`, usando `useApiClient()` na borda. `WorkoutExerciseDetails({exercise}: {exercise: WorkoutDay['exercises'][number]}): React.JSX.Element` apresenta prescrição e observação.

- [ ] Testar loader com catálogo em várias páginas: ID exato na segunda página retorna sua URL; exercício com nome igual/ID diferente nunca é selecionado; registro ausente/URL nula retorna `missing`; paginação vazia encerra; página inválida lança erro; abort interrompe; `.GIF?token=x` é GIF. Não inserir dados de mídia no snapshot.
- [ ] Rodar `pnpm.cmd --dir apps/mobile test src/application/exercises/session-exercise-media.test.ts src/screens/workout-exercise.test.tsx`; confirmar falha dos testes novos antes de implementar.
- [ ] Implementar loader usando `listExerciseCatalog` e `exerciseSchema` para validação, sem filtro por nome: páginas de `EXERCISE_CATALOG_PAGE_SIZE`, offsets crescentes até match/total/fim. Encaminhar signal, rejeitar erro de rede/payload e jamais transformar falha em “sem mídia”. A API continua aplicando o escopo autorizado do aluno.
- [ ] Implementar hook com query key `['session-exercise-media', authUserId, dayId, exerciseId]`, enabled apenas na demonstração com identidade válida, retry explícito sem reentrada e cancelamento por contexto. Consultar conectividade com `expo-network` já instalado; sem mídia local comprovada e sem conexão, retornar apresentação offline, preservando prescrição. Não persistir novo cache privado ou mudar autenticação.
- [ ] Extrair somente a apresentação de prescrição/observação de WorkoutExerciseScreen. Conservar loader contextual, foco de título e retornos `today`/`overview`; demonstração recebe diretamente o snapshot carregado, sem reexecutar `loadWorkoutDay`.
- [ ] Repetir os testes específicos e `pnpm.cmd --dir apps/mobile test src/lib/workout-exercise-context.test.ts src/screens/today-workout.test.tsx src/screens/workout-overview.test.tsx`; esperado: comportamento dessas entradas preservado. Registrar explicitamente que exercícios privados inacessíveis pelo catálogo atual usam estado sem mídia.

### Tarefa 4: Demonstração local, player nativo e retorno exato

**Arquivos:** criar `guided-session-demonstration.tsx`/`.test.tsx` e `exercise-demonstration-media.tsx`/`.test.tsx`; integrar em `log-workout.tsx`/`.test.tsx`; atualizar manifesto/lockfile. Mocks nativos devem ficar nos testes afetados; ampliar `apps/mobile/test/react-native.mock.ts` somente quando APIs de RN efetivamente utilizadas estiverem ausentes.

**Interfaces:** `GuidedSessionDemonstration` recebe `visible`, identidade/dia, `exercise`, `originPhase: 'set' | 'rest' | 'exercise-complete'`, strings/contexto da origem, `restEndsAtMs`, `onClose: () => void`. `ExerciseDemonstrationMedia` recebe `media: Extract<SessionExerciseMedia, {kind: 'available'}>`, estado ativo e callbacks de erro/fullscreen; expõe por ref `exitFullscreen(): Promise<void>` para consumir o primeiro back. Nenhuma interface recebe operações de treino.

- [ ] Acrescentar testes: abrir/voltar conserva strings vazias e última edição, índices, fase, scroll e duração ativa; não chama save/pause/discard/finish/advance nem remonta o controlador. Durante descanso, relógio continua e expiração volta em `rest`/00:00. Na confirmação do exercício, demonstração mostra o próximo e retorno conserva a confirmação. Foco entra no título e volta à ação consultada; conteúdo encoberto fica inacessível.
- [ ] Testar mídia isolada: começa pausada/muted; play é explícito; GIF tem autoplay desativado; erro permite retry somente da mídia; retry pendente não duplica requisição; desmontagem/fechamento pausa e libera player. Back fullscreen chama somente `exitFullscreen`; próximo back chama somente `onClose`; voltar à sessão não abre saída segura. Cobrir troca de identidade/dia/exercício com resposta atrasada e A → B → A.
- [ ] Rodar `pnpm.cmd --dir apps/mobile test src/components/workouts/guided-session-demonstration.test.tsx src/components/workouts/exercise-demonstration-media.test.tsx src/screens/log-workout.test.tsx`; confirmar falhas pertinentes nos novos casos.
- [ ] Instalar somente as dependências de mídia necessárias: `pnpm.cmd --dir apps/mobile exec expo install expo-video expo-image --pnpm`. Conferir que manifesto/lockfile resolvem versões SDK54 equivalentes às faixas `~3.0.16` e `~3.0.11`; não atualizar Expo nem outras dependências por conveniência. Documentação de referência: [Video SDK54](https://docs.expo.dev/versions/v54.0.0/sdk/video/) e [Image SDK54](https://docs.expo.dev/versions/v54.0.0/sdk/image/).
- [ ] Implementar apresentação clara local de tela inteira, com conteúdo original montado e bloqueado para acessibilidade/interação. Interceptar retorno local antes da saída de sessão; respeitar fullscreen nativo antes de fechar demonstração. Resetar contexto transitório quando mudar usuário/dia ou fase incompatível. Restaurar scroll/ref de foco após retorno sem refetch do treino.
- [ ] Implementar `useVideoPlayer`/`VideoView` com controles nativos, reprodução inicial pausada, muted, fullscreen e cleanup. GIF usa `expo-image` sem autoplay e controles acessíveis compatíveis com animação. Não adicionar autoplay, background playback, PiP, download ou mídia de exemplo ao produto.
- [ ] Apresentar loading, erro/retry, offline e sem mídia conforme `xDF4S`, `O0OX1`, `sQ123`, `GB9Tc`; conservar detalhes e retorno em todos. A origem define **Voltar à série**, **Voltar ao descanso** ou **Voltar ao treino**; consulta nunca registra série.
- [ ] Repetir os testes específicos e `pnpm.cmd --dir apps/mobile typecheck`; esperado: testes passam, sem erros de tipos. Examinar imports e API real instalada para confirmar eventos/callbacks de fullscreen; mocks não substituem a etapa nativa.

### Tarefa 5: Regressão, evidência Android e entrega ao coordenador

**Arquivos:** criar `.maestro/muv-36-aluno-sessao-guiada.yaml` e `docs/muv-36-result-capsule.md`; atualizar somente testes/documentos que reflitam a implementação final. A capsule deve identificar SHA, ambiente, comandos/resultados, imagens, comparação Pen e limitações observadas.

**Interfaces:** usar o ambiente Android isolado fornecido pelo coordenador e o login `.maestro/login-aluno.yaml`, sem iniciar outro AVD/stack compartilhado por conta própria. Reutilizar o treino/IDs reais disponíveis; fixtures de teste não viram valores do produto.

- [ ] Rodar na raiz: `pnpm.cmd --dir apps/mobile test`, `pnpm.cmd --dir apps/mobile typecheck`, `pnpm.cmd --dir apps/mobile test:coverage:core`, `pnpm.cmd --dir apps/mobile test:coverage:ui`, `pnpm.cmd --dir apps/mobile doctor` e `pnpm.cmd --dir apps/mobile exec expo export --platform android --output-dir <diretório temporário>`. Esperado: testes/typecheck/export sem falhas; cobertura core/UI atinge o piso vigente de 85%; registrar avisos doctor com causa e impacto, sem afirmar que passaram quando falharem.
- [ ] Antes da medição UI, acrescentar ao `include` de `vitest.ui-coverage.config.ts` os caminhos explícitos dos componentes de sessão/demonstração e detalhes criados neste plano. Hoje essa configuração inclui primitives e screens, portanto a extração sem ajuste deixaria a UI crítica fora da medição. Conservar todos os includes e thresholds existentes; core já inclui `src/application/**/*.ts`.
- [ ] Rodar `pnpm.cmd exec biome check` com a lista explícita dos arquivos de código/configuração alterados. Não ampliar para API/web/DB sem alteração nesses contratos; não baixar thresholds nem excluir arquivos para obter verde.
- [ ] Criar fluxo Maestro que usa login existente, abre a sessão, edita reps/carga, consulta demonstração, retorna sem perda, conclui série, estende/pula descanso, salva/sai, retoma e descarta. Executar `maestro test .maestro/muv-36-aluno-sessao-guiada.yaml` no alvo isolado explicitamente selecionado pelo coordenador. Não concluir um treino real repetidamente só para obter capturas; usar o ambiente de QA autorizado.
- [ ] Capturar Android em 320/390/430 dp e com fonte ampliada: série vazia/preenchida, referência anterior, descanso normal/00:00, próximo exercício, pronta para finalizar, saída, resumo sincronizado/pendente, erro/retry e demonstração. Comparar com os IDs do handoff. Conferir nomes longos, alvos, teclado real, campo focado, scroll/CTA e safe areas sem duplicação.
- [ ] Verificar no dispositivo back/header/gesto, leitor de tela/foco e ordem fullscreen → demonstração → saída segura. Para vídeo/GIF, usar somente URL realmente alcançável pelos contratos atuais; se o seed não tiver mídia ou a reprodução nativa não puder ser exercitada, registrar exatamente o cenário não comprovado e conservar o gate de QA, sem trocar por vídeo fictício.
- [ ] Reexecutar regressões afetadas somente se houver correções. Rodar `git diff --check`; buscar escapes com `rg -n '\\u[0-9a-fA-F]{4}'` passando a lista explícita de arquivos textuais alterados, excluindo `.pen`; corrigir ocorrências de acentuação que deveriam ser literais. Confirmar ausência de diff em API/validators/storage/journal/Pen.
- [ ] Registrar resultados na capsule e entregar os paths e riscos ao coordenador para revisão independente do SHA final. Commit, push, PR para `develop`, CI e transição da issue seguem a skill Muvit sob propriedade do coordenador; não fazer merge automático nem considerar CI substituto da evidência Android.

## Self-review do plano

As cinco fases e feedback estão na tarefa 2; proteção de saída/entrada está na tarefa 1; catálogo autorizado e reutilização de detalhes estão na tarefa 3; demonstração, fullscreen, foco e retenção estão na tarefa 4; acessibilidade nativa, adaptação, regressões e evidências estão na tarefa 5. Os cinco focos de revisão têm testes nas tarefas indicadas. Tipos de sessão/dia/controlador são os existentes, sem novo contrato de persistência. A ausência de mídia privada é limitação documentada do contrato atual, não uma promessa de reprodução de todos os exercícios.
