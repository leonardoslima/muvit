# SOLID e Cobertura em Web e Mobile

## Objetivo

Aplicar um piso verificavel de SOLID e cobertura nos projetos `apps/web` e `apps/mobile`, sem criar testes frageis apenas para inflar percentual global. O resultado esperado e um fluxo em que regras de aplicacao fiquem em unidades pequenas, testaveis e injetaveis, enquanto o relatorio de cobertura global mostra a evolucao real das telas e componentes.

## Contexto Atual

O backend ja possui regras locais de SOLID em `apps/api/AGENTS.md` e um teste de arquitetura em `apps/api/test/solid-architecture.test.ts`. Web e mobile possuem orientacoes arquiteturais nos respectivos `AGENTS.md`, mas ainda nao possuem enforcement equivalente.

Medicoes executadas em 11 de junho de 2026:

- `pnpm.cmd --dir apps/web exec vitest run --coverage --reporter=dot`: 93,61% statements, medindo apenas arquivos importados pelos testes atuais.
- `pnpm.cmd --dir apps/mobile exec vitest run --coverage --reporter=dot`: 85,71% statements, medindo apenas arquivos importados pelos testes atuais.
- `pnpm.cmd --dir apps/web exec vitest run --coverage --reporter=dot --coverage.include "src/**/*.{ts,tsx}" --coverage.exclude "src/lib/api/**" --coverage.exclude "src/**/*.test.{ts,tsx}" --coverage.exclude "test/**"`: 6,59% statements.
- `pnpm.cmd --dir apps/mobile exec vitest run --coverage --reporter=dot --coverage.include "src/**/*.{ts,tsx}" --coverage.include "app/**/*.{ts,tsx}" --coverage.exclude "src/**/*.test.{ts,tsx}"`: 23,14% statements.

A diferenca mostra que o numero atual e otimista: ele cobre bem bibliotecas pequenas ja testadas, mas deixa pages, Server Actions, screens e parte da orquestracao de aplicacao fora da medicao ampla.

## Decisao de Produto Tecnico

Vamos seguir um caminho hibrido:

1. Cobertura bloqueante minima de 85% para o nucleo testavel de web e mobile.
2. Cobertura global ampla publicada desde ja como metrica de evolucao.
3. Regras arquiteturais automatizadas para impedir que novas regras de aplicacao fiquem presas em UI ou entrypoints.

O piso global de 85% para todos os arquivos de UI nao sera bloqueante no primeiro ciclo, porque os numeros atuais exigiriam muitos testes de renderizacao de baixo valor. A evolucao global vira por ratchet: a cada extracao de regra para nucleo testavel, a cobertura ampla sobe sem tornar os testes acoplados a detalhes visuais.

## Escopo

Incluido:

- `apps/web`, com foco em Server Actions, montagem de payload, acesso a API, regras de formularios, upload e editores com estado relevante.
- `apps/mobile`, com foco em telas que orquestram API, cache offline, fila local, permissao, upload, auth e montagem de payload.
- Configuracao de coverage e thresholds em Vitest.
- Testes unitarios de regras extraidas e testes de arquitetura.
- Atualizacao de `AGENTS.md` locais quando uma regra recorrente precisar ser explicita para proximos trabalhos.

Fora deste primeiro ciclo:

- Refatoracao visual ampla.
- Alteracao de contratos de API, banco ou validators sem necessidade direta.
- Troca de biblioteca de teste.
- Exigir 85% global bloqueante para shadcn/ui, layouts, instrumentacao, SDK gerado, arquivos de entrada do Next/Expo e componentes puramente visuais.

## Arquitetura Web

As rotas e Server Actions continuam nas pastas do App Router, mas devem delegar regras para unidades testaveis:

- Componentes client ficam responsaveis por interacao e renderizacao.
- Server Actions ficam responsaveis por receber `FormData`, chamar uma funcao de aplicacao e traduzir sucesso para `revalidatePath` ou `redirect`.
- Parsing, normalizacao, validacao local de formulario e montagem de payload ficam em modulos puros ou comandos com dependencias injetadas.
- Acesso ao SDK gerado fica atras de funcoes pequenas quando a action precisar de comportamento testavel ao redor de erro, upload ou redirecionamento.
- Modulos especificos de rota podem ficar colocalizados quando nao houver reuso; utilitarios compartilhados ficam em `src/lib`.

Exemplos de candidatos iniciais:

- Extrair a maquina de estado e montagem de payload do editor em `apps/web/src/app/(app)/workouts/new/_editor.tsx`.
- Extrair parsing de aluno e avaliacao de `actions.ts` para modulos puros testaveis.
- Isolar upload/presign da avaliacao em uma porta pequena, mantendo a action fina.

## Arquitetura Mobile

As telas Expo continuam sendo o ponto de composicao de UI, mas regras de aplicacao devem sair para hooks, services ou modelos puros:

- Screens ficam responsaveis por renderizacao, navegacao e conexao com hooks.
- Hooks ficam responsaveis por coordenar React Query, estado local e chamadas de servico.
- Services recebem dependencias por interface pequena, como API client, storage, cache, fila, picker ou query client.
- Regras puras de selecao de treino, montagem de payload, conversao numerica e fallback offline ficam testaveis sem React Native.
- Dependencias concretas como `AsyncStorage`, `expo-router`, `expo-image-picker` e `queryClient` entram nas bordas.

Exemplos de candidatos iniciais:

- Extrair selecao de treino do dia de `apps/mobile/src/screens/today-workout.tsx`.
- Extrair finalizacao de treino e fallback para fila de `apps/mobile/src/screens/log-workout.tsx`.
- Extrair criacao de avaliacao e upload opcional de `apps/mobile/src/screens/new-assessment.tsx`.

## Cobertura

Cada app tera dois sinais de cobertura:

- `test:coverage`: relatorio amplo, incluindo arquivos de app relevantes e excluindo codigo gerado, testes, configuracoes e entrypoints que nao representam regra de aplicacao.
- Threshold bloqueante de 85% para o nucleo testavel extraido, aplicado por `coverage.thresholds` ou por config dedicada quando for mais claro manter as metricas separadas.

O nucleo testavel deve incluir:

- Services, commands, hooks e modelos de estado com regra de aplicacao.
- Parsers e builders de payload.
- Adaptadores pequenos que traduzem erro esperado.
- Regras de cache, fila, auth, upload e permissao quando estiverem no app.

A cobertura global ampla deve ser visivel no terminal e no CI local, mas nao bloqueia abaixo de 85% no primeiro ciclo. O valor atual fica registrado como baseline para orientar evolucao.

## Regras SOLID Automatizadas

Web e mobile terao testes de arquitetura inspirados no backend, ajustados ao contexto de frontend:

- Arquivos de UI nao devem importar dependencias concretas de infraestrutura quando houver regra de aplicacao extraida para service ou hook.
- Modulos de nucleo testavel nao devem importar `next/navigation`, `next/cache`, `expo-router`, `AsyncStorage`, `expo-image-picker` ou componentes visuais.
- Modulos de regra nao devem importar componentes React.
- Services e commands devem depender de portas pequenas, definidas por consumidor, em vez de clientes concretos grandes quando o comportamento precisar de teste.
- Codigo gerado em `apps/web/src/lib/api` fica fora das regras de arquitetura locais.

Essas regras servem como guardrail, nao como substituto de revisao humana. Quando uma excecao for necessaria, ela deve ficar explicita no teste ou na documentacao local.

## Testes

Os testes devem priorizar comportamento estavel:

- Builders de payload: entradas validas, campos opcionais vazios, conversao numerica e erros de validacao.
- Services de aplicacao: sucesso, erro de API, erro de upload, fallback offline e invalidacao de cache.
- Hooks: apenas quando a regra depender de ciclo React; regras puras devem ser testadas fora do hook.
- Componentes: renderizacao e interacao principais, sem cobrir detalhes visuais de baixo valor.
- Arquitetura: import boundaries e ausencia de dependencias concretas em nucleo testavel.

## Sequencia de Implementacao Recomendada

1. Configurar scripts e coverage para web e mobile, separando relatorio amplo de threshold do nucleo testavel.
2. Adicionar testes de arquitetura iniciais para web e mobile.
3. Refatorar primeiro os fluxos com maior concentracao de regra: workout editor web, assessments web, today/log/new assessment mobile.
4. Cobrir as unidades extraidas ate atingir 85% no nucleo testavel.
5. Rodar `test`, `typecheck` e Biome nos workspaces afetados.
6. Atualizar `AGENTS.md` locais se as novas regras de boundary precisarem ser preservadas em tarefas futuras.

## Criterios de Aceite

- `apps/web` possui coverage amplo visivel e threshold de 85% para nucleo testavel.
- `apps/mobile` possui coverage amplo visivel e threshold de 85% para nucleo testavel.
- Web e mobile possuem testes de arquitetura SOLID.
- Regras extraidas de UI possuem testes unitarios significativos.
- Components/screens/actions ficam mais finos nos fluxos alterados.
- `pnpm.cmd --dir apps/web test`, `pnpm.cmd --dir apps/web typecheck`, `pnpm.cmd --dir apps/mobile test` e `pnpm.cmd --dir apps/mobile typecheck` passam.
- `pnpm.cmd exec biome check apps/web apps/mobile` passa ou qualquer impedimento fica documentado no resultado da tarefa.

## Riscos e Mitigacoes

- Risco: tentar cobrir UI demais e gerar testes frageis. Mitigacao: threshold bloqueante no nucleo testavel e cobertura global como metrica de evolucao.
- Risco: criar arquitetura paralela demais para um app pequeno. Mitigacao: colocalizar modulos especificos de rota/tela e extrair para `src/lib` apenas quando houver reuso real.
- Risco: regras de arquitetura bloquearem casos validos. Mitigacao: testes de arquitetura devem listar excecoes nomeadas e justificadas.
- Risco: cobertura ampla continuar baixa por algum tempo. Mitigacao: baseline registrada e ratchet por fluxo refatorado, sem bloquear entrega util.

## Revisao da Spec

- Cobertura do pedido: o desenho cobre SOLID em `apps/web` e `apps/mobile`, com piso minimo de 85% aplicado ao nucleo testavel e cobertura global monitorada.
- Ambiguidade resolvida: 85% global nao bloqueia no primeiro ciclo; 85% bloqueia apenas o nucleo testavel.
- Sem lacunas abertas: todas as secoes possuem criterios e exemplos concretos.
- Compatibilidade: a proposta preserva Next.js, Expo, Vitest, Biome, Turborepo e contratos compartilhados atuais.
