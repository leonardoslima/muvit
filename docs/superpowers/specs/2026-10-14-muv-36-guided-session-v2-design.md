# MUV-36 — Aluno: sessão guiada de treino v2

> Atualização de 17/10/2026: a decisão posterior de usar cargas inteiras substitui as referências históricas abaixo à aceitação de decimais. Veja o [plano de cargas inteiras](../plans/2026-10-17-integer-workout-loads.md) e o [contrato atual da sessão](../../mobile-v2-student-session.md).

## Objetivo e autorização

Migrar somente a sessão guiada do aluno para a UI/UX aprovada da MUV-26, preservando transições, valores, persistência, retomada, conclusão e sincronização existentes. O fluxo está implementado; o trabalho é uma evolução delimitada de apresentação com demonstração contextual do exercício. Este documento registra as decisões do brainstorming exigido pela execução autônoma, sem reabrir decisões de produto já aprovadas. A autorização da execução dispensa aprovação intermediária; implementação, revisão e publicação continuam sob responsabilidade do coordenador.

Hoje, visão geral, progresso, avaliações, autenticação, API, banco, validators, algoritmo de treino, storage e journal ficam fora do diff funcional. A extração da apresentação de detalhes de exercício deve conservar o comportamento das entradas existentes de Hoje/visão geral.

## Fontes e evidência atual

- Regras: `AGENTS.md` e `apps/mobile/AGENTS.md`.
- Design: `docs/mobile-v2-student-session.md`, `docs/mobile-v2-foundation.md`, `docs/mobile-v2-design-gate.md` e `assets/design/mobile.pen`.
- Código: `src/screens/log-workout.tsx`, `src/lib/use-guided-workout-session.ts`, `src/application/workouts/guided-session.ts`, `src/application/workouts/today-workout.ts`, `src/screens/workout-exercise.tsx` e primitives `src/components/ui/v2`, todos sob `apps/mobile`.
- Em 14/10/2026, o MCP desktop falhou com `transport not connected to app: desktop`. A leitura foi recuperada pelo MCP da CLI `pen interactive --in assets/design/mobile.pen --out <arquivo temporário>`, encerrado sem `save()`. Foram lidos estrutura, cores e textos dos quadros `Zdwrv`, `Y37JQ`, `wu584`, `SMZP4`, `jt5lm`, `a3DQOn`, `Yvlq4` e `Z4qiJX`; as imagens de `Zdwrv` e `Z4qiJX` foram inspecionadas. O original permaneceu sem diff. Isso fundamenta o plano e não comprova comportamento nativo.
- O handoff identifica 45 estados e o guia `tnkmS`; sua tabela continua sendo a matriz completa de comparação visual, inclusive `SigiQ`, `ZGhII`, `n6C6X`, `P36u7N` e `uDcRQ`.

## Alternativas e decisão

1. **Recomendação:** conservar `useGuidedWorkoutSession` montado na rota atual; extrair apresentação em componentes de treino, aplicar tokens/primitives v2 e abrir a demonstração em apresentação local de tela inteira. Isso preserva a fila de edição, a identidade, o scroll e o relógio da sessão, com poucas mudanças nas bordas.
2. Enviar a demonstração para a rota de exercício usando cache/contexto de sessão exigiria ampliar o resolver de origem e coordenar retenção/foco entre rotas. A apresentação existente de exercício será reutilizada, mas essa coordenação adicional não é necessária.
3. Reescrever o controlador ou fundir mídia ao snapshot/journal aumentaria o risco sobre contratos já cobertos por testes e ultrapassaria o escopo.

## Estrutura e responsabilidades

`LogWorkoutScreen` continua como borda de identidade, API, navegação e controlador. A rota `/session/:dayId` permanece fora das tabs. Componentes em `src/components/workouts` recebem dados e callbacks tipados, sem conhecer API, storage ou journal. Seletores puros de apresentação em `src/application/workouts` podem derivar exercício atual/próximo, última série, progresso e ajuste numérico; não alteram fases nem regras de conclusão.

Um layout local de sessão aplica safe areas reais, fundo imersivo, status bar clara, rolagem e insets de teclado uma única vez. Ele é necessário porque o `Screen` compartilhado usa fundo claro na SafeArea externa mesmo quando seu ScrollView recebe outro estilo. As demais telas conservam seu shell. Usar `src/lib/design-system/tokens.ts`, DM Sans e primitives v2; substituir imports legados nos arquivos migrados, sem aliases.

A apresentação de prescrição/observação já existente em `WorkoutExerciseScreen` será extraída em componente de detalhes e consumida pela demonstração. O loader contextual de Hoje/visão geral e seus retornos permanecem iguais. A demonstração não cria outro `useGuidedWorkoutSession`.

## Série, descanso e avanço

- Header com título do treino, fechar acessível, barra e texto de exercícios concluídos. Usar `getWorkoutDraftProgress`, que mede exercícios concluídos, sem calcular séries/total como progresso.
- `set`: card do exercício com posição, nome completo, prescrição, descanso e **Ver execução**; série atual; referência anterior somente quando houver série concluída do mesmo exercício na sessão; campos e **Concluir série**. Repetições começam vazias conforme `buildInitialSets`; carga conserva o valor existente da prescrição. Exemplos 10/40 do Pen não são defaults novos.
- `NumericField` imersivo conserva edição direta e botões de 48 × 48 dp, com passos de 1 repetição/1 kg. Ajuste de botão usa a normalização numérica existente: vazio parte de zero, incremento resulta em 1; decremento numérico não passa de zero; valor não numérico é preservado pelo botão. Isso é conveniência de edição, sem bloquear ou normalizar a digitação direta, nem acrescentar limites, validação ou obrigatoriedade. Decimais e vírgula continuam aceitos pelo caminho existente.
- `rest`: horário original em `restEndsAtMs`, relógio regressivo limitado visualmente a 00:00, **+15 s**, **Pular descanso**, contexto da série registrada e próxima série. Expiração não muda a fase. A extensão continua chamando `addRestTime`, que acrescenta 15 segundos ao término original.
- `exercise-complete`: confirmação do exercício atual e card/prescrição do próximo exercício. **Próximo exercício** chama `continueAfterExercise`; não inserir descanso.
- `ready-to-finish`: séries registradas, 100% de progresso e **Concluir e finalizar treino**, sem comunicar conclusão antecipada. `summary`: métricas do controlador, estado sincronizado/pendente e **Voltar ao início**, sem edição ou novas métricas.

## Saída, retomada e falhas

Fechar, voltar Android e remoção por gesto compartilham `usePreventRemove` enquanto `draftActive`. **Continuar treinando** fecha a decisão e limpa a navegação pendente; fechamento permitido tem o mesmo efeito. **Salvar e sair** espera `saveDraft()` retornar `true`, então despacha a ação pendente uma vez ou substitui por `mobileRoutes.studentHome`. **Descartar treino** renomeia a apresentação da ação existente `discard()`, sem segunda confirmação e sem enviar conclusão. Falhas preservam o sheet e liberam retry; `busy` bloqueia ações concorrentes, campos e nova saída.

Snapshot v2/legado, partição por aluno/dia, serialização, pausa do tempo ativo, tombstones e estágios duráveis `create` → `finish` → `terminal` permanecem no controlador atual. A retomada apresenta a fase restaurada, índices e valores reais. Descanso expirado continua em `rest` com 00:00. Resumo e conclusão repetida não oferecem descarte/retomada. Troca de conta/dia elimina contexto visual transitório e ação pendente anterior.

Loading/erro sem dados/retry/conclusão local repetida usam StatePanel v2 na área principal, sem card próprio, com header e saída normal. Erros com dados usam mensagem contextual e conservam fase, campos e ações. `storageError`, `actionError`, `canRetryFinish`, `busy` e `queued` são a autoridade visual. `queued=true` confirma salvamento local pendente; `queued=false` acompanha o resultado existente, sem inventar confirmação de servidor ou sincronização manual. Falha de remoção posterior à conclusão mantém o resumo e o aviso; não reabre o treino.

## Demonstração e limite dos contratos atuais

**Ver execução** é secundário, tem ícone de reprodução, alvo mínimo de 48 dp e nome acessível com o exercício. Em `set` e `rest` consulta o exercício atual; em `exercise-complete`, o próximo. Durante `busy` fica indisponível. A apresentação clara reutiliza detalhes, título, grupo, prescrição e observação já disponíveis. Retorno usa **Voltar à série**, **Voltar ao descanso** ou **Voltar ao treino** conforme a origem.

O contrato `workoutExerciseFullSchema.exercise` contém somente `id`, `name` e `muscleGroup`: o loader e o snapshot não fornecem `videoUrl`. `exerciseSchema` do catálogo contém `videoUrl`; `GET /exercises` existente é autenticado e a API força o aluno ao catálogo global. Decisão do coordenador: consultar somente esse contrato já acessível, identificar por `exercise.id` exato e representar **sem mídia** se o registro não estiver acessível ou a URL for nula. Não procurar por nome semelhante, inventar URL, usar capas de design como vídeo ou ampliar autorização/API/validators. Mídia privada de professor pode existir no banco e continuar indisponível ao aluno por esse contrato; essa limitação deve constar na entrega.

O loader de mídia é separado do treino e só roda na consulta opcional. Reutiliza `listExerciseCatalog`, pagina o catálogo até encontrar o ID ou esgotar o total, valida o resultado e aceita cancelamento. A query é particionada por `authUserId`, dia e ID do exercício; respostas antigas não aparecem em outro contexto. Retry refaz somente a consulta/player, com bloqueio de reentrada. Prescrição permanece disponível em loading, erro, offline e ausência de mídia. O snapshot não garante mídia offline; sem arquivo local comprovado, apresentar o estado offline aprovado. Não introduzir download/cache durável de vídeo nesta issue.

Não há player no código, manifesto ou dependências instaladas. A reprodução exige `expo-video ~3.0.16`, versão compatível confirmada no `expo/bundledNativeModules.json` local e na [documentação SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/video/). Para GIF, `expo-image ~3.0.11` fornece animação controlável sem autoplay e suporte nativo, conforme o mesmo mapa local e a [documentação SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/image/). Essas dependências suprem funções expressas no handoff; não adicionar outro player ou serviço.

Vídeo começa pausado e sem áudio, com controles nativos, busca, áudio e tela cheia; GIF usa o formato real identificado, inicia parado e oferece reprodução/pausa acessíveis. URL `.gif` considera pathname, independentemente de query string; fonte incompatível conserva erro recuperável em vez de ser apresentada como vídeo válido. Ao sair, interromper mídia e liberar recursos. Primeiro voltar em vídeo ampliado fecha tela cheia e permanece na demonstração; próximo voltar retorna à origem.

Abrir/fechar demonstração não chama salvar, pausar, descartar, concluir ou avançar. Controlador e conteúdo original permanecem montados; conteúdo encoberto não recebe foco/leitor de tela. Preservar scroll e strings em edição, inclusive vazias; devolver foco à mesma ação **Ver execução**. O descanso usa o horário original durante a consulta e volta em `rest` mesmo se expirado. A consulta continua contando no tempo ativo.

## Adaptação e validação

Base 390 dp, gutter 16 dp, CTA de referência 58 dp; campos empilham em 320 dp e com fonte ampliada. Nome longo usa título compacto 20 sp antes da escala do sistema, preservando texto completo. Safe areas, IME e barra inferior são reais, sem alturas fixas copiadas das anotações do Pen. Ação principal e campo focado devem permanecer alcançáveis por rolagem. Erros, sucesso e sincronização incluem texto; controles têm rótulos distintos e estado disabled/busy acessível.

Preservar a suíte existente de sessão/journal/storage e acrescentar testes comportamentais de apresentação, saída, demonstração, isolamento, timer e mídia. Verificar mobile test/typecheck, cobertura core/UI com piso vigente de 85%, Biome focado, Expo doctor e export Android. Validar em Android com Maestro e capturas comparadas aos quadros, incluindo 320/390/430 dp, fonte ampliada, teclado real, saída, retomada, resumo e fullscreen. Evidência estática do Pen ou testes com mocks não aprovam o comportamento nativo. Cenários sem dispositivo/mídia real devem ser relatados como não comprovados, e o coordenador mantém os gates correspondentes.
