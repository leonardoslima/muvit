# Construtor de treinos alinhado ao Pencil

## Contexto

A rota `/workouts` exibe atualmente uma grade de alunos que encaminha o treinador para `/workouts/new?studentId=...`. O editor existente permite criar dias, adicionar exercícios e salvar um plano, mas sua composição em cards não corresponde aos frames `WGclk` e `XOIIZ` de `assets/design/pencil_design.pen`.

O design aprovado transforma `/workouts` no construtor canônico. A sidebar global permanece sob responsabilidade do layout autenticado; a área restante ocupa toda a altura disponível e reúne o painel de detalhes à esquerda, o editor do dia ao centro e um drawer sobreposto para escolher exercícios.

## Fontes de verdade

- Layout preenchido: node `WGclk`, “Workout Builder — Muvit”.
- Estado sem exercícios: node `XOIIZ`, “Workout Builder — Empty Screen State”.
- Gatilho inferior da tabela: node `mmJ8l`.
- Drawer de exercícios: node `GxGsg`.
- Tokens visuais: variáveis do Pencil e `apps/web/src/app/globals.css`.
- Contratos: SDK gerado em `apps/web/src/lib/api` e schemas de `packages/validators`.
- Regras locais: `AGENTS.md` da raiz e `apps/web/AGENTS.md`.

## Objetivo

Substituir a grade atual de `/workouts` por um construtor de treino full-height que reproduza os dois estados do Pencil, preserve o fluxo de criação existente e permita selecionar o aluno dentro da própria tela.

## Decisão de rota

- `/workouts` passa a ser a rota canônica do construtor.
- `/workouts?studentId=<id>` inicia o construtor com o aluno ativo correspondente selecionado.
- Sem `studentId` válido, o primeiro aluno ativo retornado pela API fica selecionado.
- `/workouts/new?studentId=<id>` redireciona para `/workouts?studentId=<id>` para preservar links existentes.
- `/workouts/[id]` continua como tela de leitura do treino e não será redesenhada nesta entrega.
- Editar um plano já persistido por `PATCH /workout-plans/:id` fica fora do escopo; o botão principal cria o plano com `POST /workout-plans`.

## Arquitetura

`WorkoutsPage` permanece como Server Component. Ela configura o cliente autenticado e busca alunos ativos e exercícios em paralelo. A página normaliza os resultados para props enxutas e entrega os dados a um Client Component route-local responsável pelo rascunho.

O estado do editor continua baseado em funções puras de `src/application/workouts/workout-editor-model.ts`. Componentes de apresentação recebem estado e callbacks; não importam o SDK, Server Actions ou módulos de navegação. A action continua fina: recebe o payload já validado, chama o SDK, traduz o erro esperado, invalida as rotas afetadas e redireciona para o treino criado.

## Estrutura de arquivos

- `apps/web/src/app/(app)/workouts/page.tsx`: busca dados, resolve o aluno inicial e monta o construtor.
- `apps/web/src/app/(app)/workouts/page.test.tsx`: integração da página, chamadas da API e seleção inicial.
- `apps/web/src/app/(app)/workouts/_workout-builder.tsx`: estado do rascunho e composição dos painéis.
- `apps/web/src/app/(app)/workouts/_workout-builder.test.tsx`: comportamento integrado do editor.
- `apps/web/src/app/(app)/workouts/_workout-details-panel.tsx`: metadados, status, notas e ações.
- `apps/web/src/app/(app)/workouts/_workout-day-tabs.tsx`: seleção, inclusão, remoção e renomeação dos dias.
- `apps/web/src/app/(app)/workouts/_workout-exercise-table.tsx`: campos e ações dos exercícios do dia ativo.
- `apps/web/src/app/(app)/workouts/_workout-empty-state.tsx`: estado `XOIIZ`.
- `apps/web/src/app/(app)/workouts/_exercise-drawer.tsx`: busca, filtros e seleção da biblioteca.
- `apps/web/src/app/(app)/workouts/actions.ts`: criação do plano.
- `apps/web/src/app/(app)/workouts/new/page.tsx`: redirecionamento legado.
- `apps/web/src/application/workouts/workout-editor-model.ts`: modelo puro e montagem do payload.

Os componentes permanecem locais à rota porque ainda não existe reutilização equivalente fora do construtor. Primitives compartilhados continuam em `src/components/ui`.

## Layout e design system

A tela usa a sidebar existente de 260 px. A área do construtor remove apenas para esta rota o padding padrão do conteúdo autenticado e ocupa a altura total disponível.

O painel de detalhes possui 360 px, fundo `card`, borda direita e rodapé de ações fixado à base. O painel central usa o espaço restante, fundo `background` e overflow controlado. As abas ficam no topo, o título do dia e a tabela ocupam o conteúdo.

O drawer `GxGsg` possui 320 px, fica ancorado à direita da área do construtor e é renderizado por cima do conteúdo central. Ele não participa do grid, não reduz a tabela e não desloca nenhum painel. A sombra lateral e a borda esquerda estabelecem a sobreposição; não há backdrop escurecido no desktop.

As cores, tipografia, raios e sombras usam tokens já existentes:

- fundo `#F5F3EF` por `bg-background`;
- superfícies `#FFFFFF` por `bg-card`;
- texto principal `#1A1A1A` por `text-foreground`;
- texto secundário `#666666` por `text-muted-foreground`;
- bordas `#D1CCC4` por `border-border`;
- destaque `#2ECC71` por `primary`;
- títulos e labels em Space Grotesk;
- textos de conteúdo em Inter;
- raio padrão de 8 px.

Não serão introduzidos valores hexadecimais quando já existir token equivalente.

## Cópia

O layout visual segue o Pencil, mas toda a interface visível permanece em pt-BR:

- “Workout Details” → “Detalhes do treino”.
- “Plan Name” → “Nome do plano”.
- “Student” → “Aluno”.
- “Start Date” e “End Date” → “Data inicial” e “Data final”.
- “Draft”, “Active” e “Archived” → “Rascunho”, “Ativo” e “Arquivado”.
- “General Notes” → “Notas gerais”.
- “Discard” e “Save Changes” → “Descartar” e “Salvar treino”.
- “Add Exercise” → “Adicionar exercício”.
- “No exercises yet” → “Nenhum exercício ainda”.
- “Create Custom Exercise” → “Criar exercício personalizado”.

Caracteres pt-BR permanecem em UTF-8 literal.

## Estado e dados do plano

O rascunho contém:

- `studentId`;
- `name`;
- `startDate`;
- `endDate`;
- `status`;
- `notes`;
- até sete dias;
- exercícios ordenados em cada dia;
- séries, repetições, carga, descanso, tempo e notas por exercício.

O status inicial é `draft`. O primeiro dia é “Treino A”. Datas são opcionais, mas, quando ambas existirem, a data final não pode anteceder a inicial.

O aluno pode ser trocado pelo select enquanto o plano ainda não foi salvo. A lista contém apenas alunos ativos e exibe avatar, nome e email quando disponível. A action usa sempre o `studentId` atualmente selecionado.

“Descartar” restaura nome, datas, status, notas e dias ao estado inicial, preservando o aluno selecionado. Como a ação elimina dados digitados, ela usa `ConfirmationDialog`.

## Dias e exercícios

As abas reproduzem o topo do painel central. O botão `+` adiciona dias até o limite de sete. O dia ativo recebe borda inferior e texto primários. O ícone de lápis alterna a edição do nome do dia. Remover um dia exige confirmação e nunca pode eliminar o único dia restante.

Sem exercícios, o painel mostra o estado `XOIIZ`: círculo verde claro com halter, título, descrição e CTA. O CTA abre o mesmo drawer acionado por `mmJ8l`.

Com exercícios, a tabela exibe:

- alça de reordenação;
- exercício e grupo muscular;
- séries;
- repetições;
- carga em kg;
- descanso em segundos;
- tempo;
- notas e remoção.

A reordenação reutiliza o modelo puro existente e oferece alternativa por teclado na alça. O ícone de mensagem alterna um campo de notas abaixo da linha. A remoção exige confirmação.

## Drawer de exercícios

`mmJ8l` e o CTA do estado vazio abrem `GxGsg`. O drawer contém:

- título e botão `X`;
- busca por nome;
- filtros por grupo muscular;
- lista de exercícios;
- nome, grupo muscular e equipamento;
- botão individual para adicionar;
- link “Criar exercício personalizado” para `/exercises`.

A busca e o filtro são derivados localmente das props; não fazem novas chamadas à API. Adicionar um exercício inclui o item no dia ativo e fecha o drawer. O botão `X` e a tecla `Escape` fecham o drawer e devolvem o foco ao gatilho que o abriu.

No desktop, o drawer é uma sobreposição sem backdrop. Em viewports abaixo de `lg`, o mesmo conteúdo usa uma superfície fixa sobre a tela com backdrop e largura limitada ao viewport, mantendo a navegação por teclado.

## Estados de erro e vazio

- Falha ao carregar alunos: mostrar mensagem clara no painel de detalhes e desabilitar o salvamento.
- Nenhum aluno ativo: mostrar orientação para cadastrar um aluno e link para `/students/new`.
- Falha ao carregar exercícios: manter o editor utilizável, mas mostrar erro no drawer e desabilitar a inclusão.
- Busca sem resultado: mostrar “Nenhum exercício encontrado”.
- Falha ao salvar: mostrar alerta no painel de detalhes, sem perder o rascunho.
- Durante o salvamento: desabilitar ações conflitantes e exibir “Salvando…”.

## Acessibilidade

- Inputs possuem labels visíveis e associados.
- Abas usam semântica de `tablist`, `tab` e `tabpanel`.
- Status usa controles selecionáveis com nome acessível.
- Botões apenas com ícone possuem `aria-label`.
- O drawer possui título acessível, gerenciamento de foco, fechamento por `Escape` e retorno de foco.
- A alça de reordenação permite operação por teclado.
- Mensagens de erro usam `role="alert"`.
- Confirmações destrutivas reutilizam `ConfirmationDialog`.

## Alternativas consideradas

Manter a grade em `/workouts` e redesenhar somente `/workouts/new` reduziria mudanças de rota, mas contrariaria a rota solicitada e manteria uma etapa ausente no Pencil.

Renderizar o drawer como terceira coluna reproduziria a hierarquia aparente do frame, mas reduziria o painel central. A decisão aprovada é sobrepor `GxGsg` ao conteúdo, coerente com o botão `X`, a sombra lateral e o comportamento esperado de `mmJ8l`.

Criar um novo sistema de componentes para o construtor aumentaria o escopo sem reutilização comprovada. A implementação usará os primitives e tokens atuais, com composições locais.

## Fora do escopo

- Alterar API, validators, schema ou migrations.
- Adicionar biblioteca de drag-and-drop, calendário ou gerenciamento de estado.
- Editar treinos persistidos.
- Redesenhar `/workouts/[id]`.
- Criar exercício personalizado dentro do drawer.
- Modificar o arquivo `.pen`.

## Verificação

- Testes unitários do modelo puro.
- Testes de integração da Server Component.
- Testes de UI do construtor, detalhes, abas, tabela, estado vazio e drawer.
- `pnpm.cmd --dir apps/web test`.
- `pnpm.cmd --dir apps/web test:coverage:core`.
- `pnpm.cmd --dir apps/web test:coverage:ui`.
- `pnpm.cmd --dir apps/web typecheck`.
- `pnpm.cmd exec biome check apps/web`.
- Comparação visual em 1440 × 960 com `WGclk` e `XOIIZ`.
- Verificação em viewport estreito, navegação por teclado, console e overflow.
- `git diff --check`.
- Busca por sequências de escape Unicode nos arquivos textuais alterados.

## Critérios de aceite

- `/workouts` exibe diretamente o construtor e não a grade de alunos.
- O estado vazio corresponde a `XOIIZ`.
- O estado preenchido corresponde a `WGclk`.
- `mmJ8l` e o CTA vazio abrem `GxGsg` sobre o conteúdo, sem redimensionar a tabela.
- O botão `X` e `Escape` fecham o drawer.
- O treinador consegue selecionar aluno, preencher metadados, gerenciar dias e exercícios e criar o plano.
- O payload inclui todos os campos suportados exibidos pela interface.
- O fluxo legado `/workouts/new?studentId=...` continua funcionando por redirecionamento.
- A tela usa apenas o design system e as dependências existentes.
- Estados de loading, erro e vazio são claros e acessíveis.
- As verificações web aplicáveis passam sem incluir alterações fora do escopo.
