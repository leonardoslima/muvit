# MUV-8 — Experiência definitiva do aluno no Expo

## Contexto

A MUV-8 aplica em `apps/mobile` as referências de aluno aprovadas na MUV-7 e materializadas em `assets/design/pencil_design.pen`. O app já oferece autenticação, treino do dia, registro de treino, progresso, nova avaliação e perfil, mas ainda usa uma apresentação genérica e registra todas as séries em uma única tela.

Esta entrega preserva os contratos atuais da API e transforma o registro em uma sessão guiada. O progresso parcial fica no dispositivo e somente a finalização usa o fluxo existente de criação e conclusão de `workout-logs`.

## Fontes de verdade

- Issue Linear MUV-8 e sua relação de bloqueio já concluída com a MUV-7.
- `assets/design/pencil_design.pen`, fonte visual primária.
- `docs/superpowers/specs/2026-08-07-layouts-mobile-aluno-professor-design.md`, handoff do design mobile.
- `apps/mobile/AGENTS.md`, regras arquiteturais e de verificação do app.
- Contratos existentes de `@muvit/validators` e rotas atuais da API.

## Objetivo

Entregar a experiência visual definitiva do aluno no Expo, incluindo autenticação, Hoje, visão geral do treino, sessão guiada, progresso, nova avaliação e perfil, sem remover funcionalidades existentes nem ampliar a entrega para a experiência do treinador.

## Decisões aprovadas

- A implementação será incremental e orientada por componentes compartilhados, sem reorganização ampla do app.
- O fluxo principal continua exclusivo da role `student`; suporte a treinador permanece nas issues MUV-16 a MUV-19.
- O treino segue a sequência Hoje → visão geral → série atual → descanso → exercício concluído → próximo exercício → resumo.
- O progresso parcial da sessão é persistido localmente e particionado pelo usuário autenticado e pelo `workoutDayId`.
- “Salvar e sair” mantém o rascunho local; “Continuar treinando” retorna à sessão; “Encerrar treino” descarta o rascunho sem enviar um treino concluído; finalizar envia o registro pela API e remove o rascunho após confirmação local ou enfileiramento offline.
- A MUV-8 não altera rotas, schemas, tabelas ou regras de autorização da API.
- Textos visíveis permanecem em pt-BR com caracteres UTF-8 literais.

## Arquitetura

### Sistema visual

`apps/mobile/src/lib/styles.ts` continuará sendo a entrada dos tokens globais e será alinhado ao Pencil: fundo `#F5F3EF`, superfície `#FFFFFF`, texto principal `#1A1A1A`, texto secundário `#666666`, borda `#D1CCC4`, primária `#2ECC71`, aviso `#F39C12` e erro `#E74C3C`.

Componentes visuais reutilizáveis ficarão em `apps/mobile/src/components/ui`. Eles cobrirão shell de tela, marca Muvit, cabeçalhos, botões, campos, cards, badges, painel de estado, progresso do treino, controle numérico, temporizador e feedback de conclusão. Esses componentes receberão dados e callbacks por propriedades e não acessarão API, storage, router ou query client.

Os ícones usarão `@expo/vector-icons`, já disponível pelo Expo, sem adicionar uma biblioteca de ícones. A tipografia carregará Space Grotesk para títulos e Inter para corpo por meio de pacotes compatíveis com Expo; essas são as únicas dependências novas justificadas pela fidelidade ao sistema visual aprovado.

### Núcleo da sessão guiada

O estado e as transições da sessão ficarão em `apps/mobile/src/application/workouts/guided-session.ts`, sem imports de React Native ou Expo. O núcleo representará:

- posição atual por índice de exercício e série;
- valores registrados de repetições e carga;
- séries concluídas;
- instante de início e duração calculada;
- estado de descanso e término do descanso;
- conclusão de exercício e de treino.

As transições aceitarão somente ações válidas: atualizar a série atual, concluir série, adicionar quinze segundos ao descanso, pular descanso, avançar após exercício concluído e finalizar a última série. O payload final continuará compatível com `finishWorkoutLogSchema`.

### Persistência local

`apps/mobile/src/lib/workout-session-storage.ts` adaptará AsyncStorage a uma interface definida pelo núcleo da aplicação. A chave seguirá o formato `muvit_workout_session:<authUserId>:<workoutDayId>`.

O rascunho armazenará versão, IDs de usuário e treino, estado da sessão e data de atualização. Leituras rejeitarão payload inválido, versão incompatível ou IDs divergentes e removerão o valor inválido. Nenhuma informação de autenticação será persistida nesse storage.

Uma sessão salva será oferecida como “Retomar treino” em Hoje. Abrir a visão geral sem rascunho iniciará um estado novo; retomar restaurará exatamente o exercício, a série, os valores e o descanso armazenados. Cada transição relevante persistirá o estado atualizado.

### Integração com a API e offline

O carregamento do plano e do dia continuará usando as rotas self-scoped existentes. A sessão somente chama `finishWorkoutWithOfflineFallback` ao concluir o treino. Se a rede falhar, o registro final entra na fila offline atual; nesse caso o rascunho guiado também é removido, pois a fila passa a ser a fonte da submissão pendente.

O indicador offline permanece visível quando Hoje usa o plano em cache. Um rascunho local não será apresentado como sincronizado com o servidor.

## Navegação e telas

### Autenticação

Login (`OII7y`, `P9kNT`) e cadastro (`J6jZMI`, `W7qGN`) receberão marca, labels, inputs e ações do Pencil. Submissão desabilita a ação principal e erros permanecem próximos ao formulário. O login continua rejeitando roles diferentes de `student`.

### Hoje e detalhes do treino

Hoje cobrirá treino disponível (`uJLDm`), treino em andamento (`OVuJm`), carregando (`jNGgW`), sem plano ativo (`nMLyN`), sem treino hoje (`QOngV`) e erro (`Uniw4`). Estados vazios e de erro serão distintos, e o erro permitirá tentar novamente.

O card abre a visão geral (`jYzas`) antes de iniciar. O detalhe complementar de exercício (`TsKjV`) continuará disponível como superfície inferior, sem substituir a sessão guiada.

### Sessão guiada

A rota de registro continuará identificada pelo `dayId`, mas a tela será dividida em componentes e estados correspondentes a exercício atual (`nerHC`), descanso (`IRuyd`), exercício concluído (`VoY8I`), último exercício (`I1EuxI`), resumo (`jwmjt`), saída segura (`p4oS1`) e carregamento/erro (`uPybj`).

O botão de voltar abrirá a confirmação de saída. Enquanto houver rascunho ativo, a remoção da rota será interceptada pelo guard de navegação usado pelo Expo Router e exigirá uma das três decisões da tela de saída. A sessão não finalizará implicitamente ao sair.

### Progresso e avaliação

Progresso seguirá `nBQZW` e `U09sO`, com lista cronológica, métricas legíveis e estados de carregamento, vazio e erro com retry. A ação de adicionar abrirá a nova avaliação.

Nova avaliação seguirá `I2gzs` e `CsaiW`, preservando data, peso, gordura corporal, notas e foto. Haverá feedback explícito de envio, erro e sucesso. O sucesso invalidará a lista e retornará ao progresso.

### Perfil e navegação principal

Perfil seguirá `q7wg2L`, exibindo iniciais, nome, email, tipo de conta e acesso, além da ação de sair. O logout continuará limpando o query client.

As tabs Hoje, Progresso e Perfil terão ícone e label, indicação visual e textual do item ativo, área tocável mínima de 44 px e superfície flutuante inspirada no componente Pencil.

## Estados e tratamento de erros

- Carregamento preserva a hierarquia da tela e usa indicador ou skeleton discreto.
- Vazio explica a ausência de conteúdo sem sugerir falha de rede.
- Erro informa a falha e oferece retry quando a operação puder ser repetida.
- Submissões impedem toques duplicados e mantêm feedback visível.
- Falha ao persistir rascunho mantém a sessão utilizável e apresenta aviso; a tela não declara que o progresso foi salvo.
- Rascunho inválido é descartado de forma segura e inicia uma sessão nova.
- Falha ao concluir treino usa a fila offline atual; falha simultânea da API e da fila mantém o rascunho para nova tentativa.

## Acessibilidade e responsividade

- Controles interativos terão área tocável mínima de 44 px, labels acessíveis e estado desabilitado perceptível.
- Inputs informarão unidade, série atual e teclado apropriado.
- Conteúdo usará Safe Area e ScrollView quando puder exceder a altura disponível.
- Textos longos poderão quebrar sem larguras rígidas que causem corte.
- Cores de estado não serão o único meio de comunicar significado.
- A superfície de detalhes de exercício terá título, ação de fechar e retorno previsível ao contexto anterior.

## Estratégia de testes

O trabalho seguirá TDD em três níveis:

1. Testes unitários do núcleo da sessão para transições, descanso, resumo, payload final e casos inválidos.
2. Testes do adaptador de persistência para isolamento por usuário/treino, restauração, versão inválida e falhas de storage.
3. Testes de tela com React Native Testing Library para autenticação, todos os estados de Hoje, início/retomada/saída/finalização da sessão, progresso, avaliação, perfil e tabs.

A verificação final inclui `pnpm.cmd --dir apps/mobile test`, `pnpm.cmd --dir apps/mobile test:coverage:core`, `pnpm.cmd --dir apps/mobile test:coverage:ui`, `pnpm.cmd --dir apps/mobile typecheck`, `pnpm.cmd --dir apps/mobile doctor`, Biome nos arquivos alterados e inspeção visual em uma plataforma Expo quando o ambiente estiver disponível.

## Critérios de aceite verificáveis

- Cada referência de aluno priorizada no Pencil possui implementação correspondente ou estado equivalente na mesma tela.
- O fluxo guiado registra uma série por vez, controla descanso, apresenta resumo e envia um payload válido ao finalizar.
- Uma sessão salva reaparece em Hoje e retoma na posição exata após remontar o app.
- Encerrar descarta o rascunho; concluir remove o rascunho somente depois de envio ou enfileiramento bem-sucedido.
- Autenticação, avaliação, fila offline, cache do treino e logout continuam operacionais.
- Não há mudanças de contrato na API ou nos validators.
- Testes e verificações estáticas relevantes de `apps/mobile` passam.
- Não há quebra visual relevante em 390 × 844 nem em telas menores suportadas pelo Expo.

## Fora de escopo

- Navegação ou telas de treinador.
- Criação ou edição de planos, exercícios e avaliações pelo treinador.
- Persistência server-side de sessões parciais.
- Novo endpoint, migration ou alteração de schema compartilhado.
- Sincronização do mesmo rascunho entre dispositivos.
- Notificações de descanso em background.
- Novas dependências de UI ou gerenciamento de estado.
