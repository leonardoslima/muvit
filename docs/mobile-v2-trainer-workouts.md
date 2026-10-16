# Professor — treinos e exercícios v2 · MUV-31

Fonte visual: `assets/design/mobile.pen`, editada pelo MCP Pen. Esta entrega contém 63 quadros de telas/estados, um catálogo de componentes e um contrato de implementação. As amostras são ilustrativas. Foundation MUV-24 e componentes das entregas anteriores permanecem como autoridade visual. Implementação Expo pertence ao MUV-40.

## Escopo e composição

Lista de treinos por aluno, detalhe, criação/edição, catálogo de seleção, confirmações e estados de consulta/envio. A revisão de 07/10/2026 acrescentou ao design a confirmação de saída e o rascunho persistente na conta. A decisão de produto de 15/10/2026 autoriza a implementação aditiva de persistência remota no MUV-40 e determina que somente dados válidos possam ser salvos como rascunho. Salvar normalmente publica o treino como ativo; rascunho é escolhido somente ao sair sem publicar. Não acrescenta CRUD de exercícios, exclusão de plano, edição de datas, campo de tempo ou mídia no catálogo. As regras de ownership permanecem; os contratos e a persistência novos são limitados aos rascunhos deste fluxo. Home, alunos e avaliações ficam fora do escopo.

DM Sans, papel, verde profundo, lima e ícones Lucide usam os tokens existentes. Gutter de 16 dp, controles de 52 dp, CTA de 58 dp e alvos de ícone de 48 dp. As telas são expandidas para mostrar conteúdo rolável; não representam altura fixa do dispositivo. Adaptações de lista, detalhe, editor e catálogo em 320/390/430 dp; o editor de 320 dp inclui nome extenso. Safe areas e tab bar devem ser consumidas uma vez pelo shell Início/Alunos/Perfil.

Os novos símbolos são `RTkQU` (lista de treino), `JPjJ2` (prescrição em leitura), `HJIyB` (exercício do catálogo), `Gaaoc` (prescrição editável), `WpCw0` (ação contextual) e `lwH91` (referência visual de confirmação). Botões, campos, status, mensagens, cabeçalho e navegação são instâncias conectadas à MUV-24. O diálogo mapeia o Alert nativo; não exige substituir o controle do sistema por modal próprio.

## Jornada e navegação

| Origem / ação | Destino ou efeito |
| --- | --- |
| Detalhe do aluno / treinos | `/trainer/students/[studentId]/workouts` |
| Lista / plano | Push `/trainer/students/[studentId]/workouts/[planId]` |
| Lista / Novo treino | Push `/trainer/students/[studentId]/workouts/new` |
| Detalhe / Editar treino | Push `/trainer/students/[studentId]/workouts/[planId]/edit` |
| Lista / Aluno | Dismiss to detalhe do aluno |
| Editor ou detalhe / Treinos | Dismiss to lista de treinos |
| Criação confirmada | Feedback no editor; navegação pelo header Treinos |
| Edição confirmada ou editor arquivado / header Treino | Dismiss to detalhe |
| Contexto sem aluno | Dismiss to `/trainer/students` |
| Catálogo / exercício | Adiciona ao dia ativo e fecha o modal |
| Editor alterado / tentativa de saída | Abre Bottom sheet · Sair do editor |
| Bottom sheet / Salvar rascunho e sair | Persiste na conta e conclui a saída após confirmação |
| Bottom sheet / Continuar editando | Fecha o sheet e mantém todos os valores |
| Bottom sheet / Descartar e sair | Abandona alterações pendentes e conclui a saída |
| Rascunho da conta / continuar | Retoma o editor com os valores preservados |

A jornada é documentada por quadros e ações nomeadas; não é um protótipo clicável.

O retorno contextual fica somente no botão de voltar do header, sem ações de retorno duplicadas no conteúdo. Quando não há aluno válido, o header Alunos retorna à lista de alunos. Após edição confirmada ou bloqueio por plano arquivado, o header Treino retorna ao detalhe.

## Consulta de treinos

Fontes: `trainer-workouts.tsx`, `trainer-workout-detail.tsx`, `trainer-workout-data.ts`, `workout-plan-list-item.tsx` e `workout-day-card.tsx`.

Lista apresenta nome, status, período quando disponível e data de criação. Datas usam DD/MM/AAAA. Não introduzir busca, filtro ou paginação de planos. Detalhe exibe dias e exercícios na ordem recebida, séries/repetições, carga/descanso quando informados e notas não vazias. Não mostrar zero para campos ausentes. Carga usa apresentação pt-BR com até duas casas decimais.

A lista também apresenta os rascunhos remotos do professor no aluno atual, separados dos planos publicados e identificados como rascunhos da conta. Continuar encaminha `draftId` e o contexto original: sem `sourcePlanId`, abre criação; com plano de origem, abre edição. Planos e rascunhos usam o contexto autenticado/aluno na consulta, e a troca de usuário ou aluno não pode manter conteúdo do contexto anterior.

Loading, erro inicial com retry e vazio preservam contexto. StatePanel ocupa a área principal, sem superfície própria de card. Com dados anteriores, falha de atualização mantém o conteúdo e apresenta mensagem contextual. 404 prevalece sobre dados anteriores; treino de outro aluno não expõe conteúdo. Planos arquivados são somente leitura e não oferecem Editar treino. O editor também bloqueia acesso direto ao plano arquivado.

Durante consulta em andamento, abrir/criar/editar e seleção do catálogo obedecem aos bloqueios existentes. Recarregar fica somente no ícone do header, sem botão adicional no conteúdo, inclusive no erro inicial da lista, do detalhe e do carregamento da edição. O controle permanece visível nos 45 headers: normal em consulta recuperável e desabilitado durante fetch, contexto inválido ou edição local. Quando não há outro indicador de progresso para a consulta, o reload usa Loading durante fetch. Em `K1Dv9W`, `ibKMR` e `z5yoK`, o StatePanel já comunica o loading; o reload fica estático e desativado, preservando seu alvo de 48 dp e posição. O vazio também permite recarregar. A apresentação desativada usa o token de texto desativado; `enabled: false` do Pen oculta o elemento e não deve representar esse estado. Tentar carregar mais recupera somente a paginação do catálogo.

A foundation possui `IconButton/Refresh/Default` (`fQXup`), `Disabled` (`nqQdX`) e `Loading` (`VLGa4`), além de Pressed e Focus. O header `B32I3H` contém o alvo e o ícone de reload diretamente; os estados do MUV-31 são overrides das instâncias desse header, sem alterar a foundation compartilhada. Na implementação, desativado deve impedir o acionamento e informar o estado ao leitor de tela; os metadados do canvas não implementam interação nativa.

## Editor e prescrição

Fontes: `trainer-workout-editor.tsx`, `workout-editor-day.tsx`, `workout-editor.ts` e `packages/validators/src/workouts.ts`.

Revisão do dia de treino em 08/10/2026: os 16 formulários completos e a amostra de valores iniciais `pRl06` usam um cartão do dia selecionado, com superfície branca, raio de 24 dp, padding e gap de 16 dp. O cabeçalho reúne nome editável, contagem de exercícios, lápis e lixeira. O lápis direciona o foco ao campo de nome existente. Dias do treino e Adicionar dia ficam na mesma linha, acima das abas. Dados do plano, orientação, header e navegação permanecem fora desse cartão. A referência enviada define a organização; as cores continuam sendo os tokens claros da foundation.

As ações de adição reutilizam `D0UIi`: Adicionar dia usa ícone de mais e texto verde, sem superfície ou borda, com alvo de 128 × 48 dp; Adicionar exercício encerra o cartão do dia, com 58 dp, ícone de mais, texto verde e contorno tracejado no token de borda padrão. Salvar conserva o botão primário lima existente, inclusive `Bn8Zy` e seu indicador durante envio. Estados desativados usam o token de texto desativado. Os valores de campos e a ordem dos exercícios são preservados.

Criação inicia sem nome/notas, com um dia Treino A vazio. O formulário não possui seletor Rascunho/Ativo nem ação direta de rascunho; Salvar treino publica como ativo, enquanto Salvar alterações publica as alterações. Salvar rascunho e sair fica na confirmação de saída e só persiste depois que a validação completa for aprovada. Nome do plano e dos dias são editáveis; datas são somente consultadas. Um exercício selecionado entra com 3 séries, 10 repetições e carga, descanso e observação vazios, como no quadro `pRl06`.

Adicionar dia seleciona o novo dia e fica desabilitado em sete dias. As abas formam um seletor segmentado dedicado somente à seleção, com o dia selecionado em verde profundo. Uma única lixeira no cabeçalho do cartão remove o dia selecionado; para remover outro dia, selecione sua aba primeiro. Lápis e lixeira reutilizam `WpCw0`, com alvo de 48 × 48 dp. Remover o último dia e remover durante envio ficam bloqueados. Dia vazio é removido diretamente; dia com exercícios abre Remover dia? com Cancelar e Remover dia. Remover dia ativo seleciona o primeiro restante. As amostras de sete dias distribuem a faixa em linhas para expor todos os controles no canvas; no runtime, a faixa horizontal existente permite rolagem sem truncar nomes ou reduzir os alvos.

O componente `Gaaoc` usa superfície de fundo clara, borda padrão e raio de 20 dp dentro do cartão branco do dia. Seu cabeçalho reúne halter, nome e grupo muscular com posição do exercício. Séries/repetições e carga/descanso permanecem em duas colunas, com os campos editáveis conectados à foundation; observação continua editável. As ações ficam alinhadas à direita: mover acima/abaixo, lápis para focar a prescrição existente e remoção direta do estado local. Extremos de reordenação ficam desabilitados. A lixeira identifica Remover exercício por nome no leitor de tela. Não criar drag-and-drop, modal de edição adicional, confirmação de remoção de exercício ou exclusão do catálogo.

Estados visuais do exercício: padrão usa borda neutra e não mostra indicação local; clicar no lápis ativa edição inline, borda de 2 dp em `color/text/brand`, ícone de lápis e Editando exercício entre identificação e campos. Alterar qualquer valor ou a posição do exercício ativa borda de 2 dp em `color/feedback/warning`, ícone circular e Alterações não salvas no mesmo local. Esse estado tem prioridade sobre o foco e permanece durante envio e falha; limpa após salvamento confirmado ou restauração dos valores originais, voltando ao padrão quando não há edição ativa. O indicador local não representa alterações nos dados gerais do plano. Não abrir modal nem introduzir salvamento individual de exercício. As amostras conectadas no catálogo são `SAWcO` (edição) e `W2E7p` (alterado); os formulários de prescrição, edição pendente, reordenação, erro, envio, rascunho retomado e 320 dp representam o estado correspondente.

Verificação dos estados: capturas conferiram edição, alteração, foco com teclado, envio e versões de 320/390/430 dp. Verde e atenção têm contraste de 5,76:1 e 6,25:1 sobre o fundo do cartão; ícone e texto complementam a borda. Os 330 quadros raiz continuam sem interseções. O visitor de bounds atribui deslocamento vertical de 50 dp às referências de amostra e reporta clipping, embora as capturas mostrem os cartões completos; esse diagnóstico não comprova clipping visual. O salvamento do Pen permanece com o usuário.

Cada dia precisa de ao menos um exercício para publicar ou salvar um rascunho. Nome do plano até 200 caracteres, dia até 50; repetições texto obrigatório até 20; séries inteiras entre 1 e 20; carga opcional entre 0 e 1000 kg, com vírgula aceita; descanso inteiro opcional entre 0 e 600 s. Notas do plano até 2000 e do exercício até 500. Campo tempo não é editado; seu valor recebido é preservado no update. A primeira falha aparece em mensagem global, sem acrescentar validação por campo ou em cada digitação. Se o formulário estiver incompleto ou inválido, o rascunho não é enviado nem a tela sai; a mensagem explica o problema e os valores permanecem para correção ou descarte explícito.

### Dirty state e ações destrutivas

`A8V2Ho` apresenta Alterações não salvas como indicação visual do estado local, com nome/carga alterados. O dirty existente impede que uma nova hidratação sobrescreva a edição. Salvar alterações limpa o dirty após update confirmado.

A revisão define proteção de saída com alterações pendentes. Voltar pelo header, gesto/Back do sistema e navegação para outra tela passam pela mesma confirmação. Sem alterações, sair diretamente. O bottom sheet oferece Salvar rascunho e sair, Continuar editando e Descartar e sair. Dispensar por scrim, arraste ou Back equivale a continuar editando. Durante gravação, bloquear reentrada, descarte, dispensa e navegação; a saída só acontece após persistência confirmada. Falha mantém o sheet e todos os valores, oferecendo Tentar salvar e sair. Descartar abandona apenas alterações pendentes e preserva a versão já publicada.

O rascunho válido fica na conta do professor e pode ser retomado em outra instalação autenticada. Ele conserva o aluno, o dia selecionado e o vínculo com o treino original, quando houver, mas nunca os campos vazios ou inválidos. Em edição, guarda as alterações pendentes separadamente, sem rebaixar ou sobrescrever o treino publicado. Retomar hidrata o editor e informa Rascunho recuperado da sua conta; publicar valida o payload atualizado, grava o plano como ativo e consome o rascunho na mesma transação. Não há autosave: persistência de rascunho exige a escolha explícita no sheet.

O MUV-40 implementa contratos Zod próprios e endpoints autenticados para listar rascunhos do aluno (`GET /students/:studentId/workout-plan-drafts`), criar/atualizar (`POST /workout-plan-drafts`), buscar (`GET /workout-plan-drafts/:id`) e publicar/consumir (`POST /workout-plan-drafts/:id/publish`). `draftId` e `revision` são enviados juntos no update; uma revisão desatualizada retorna conflito e não substitui a versão mais recente. O draft de edição mantém `sourcePlanId`; o treino ativo só muda na publicação. Dias substituídos são arquivados em vez de apagados para preservar logs históricos, e não aceitam novos logs. Excluir do catálogo um exercício referenciado por rascunho retorna conflito; a exclusão e o salvamento/publicação coordenam locks para evitar corrida nessa referência.

A confirmação de remoção de dia continua independente: Cancelar conserva o editor; confirmar remove localmente e a estrutura resultante só é enviada ao salvar. Ela permanece um Alert nativo, não um bottom sheet de saída.

### Envio e sucesso

Validar → create/update → atualizar cache e invalidar consultas de treinos/resumo → feedback. Durante envio, campos, dias, prescrição, reordenação e adição ficam desabilitados; botão mantém largura e bloqueia reentrada. A revisão determina bloqueio de saída durante gravação; após falha, a edição continua preservada e a proteção de saída volta a ficar disponível.

Erro preserva os valores. Criação confirma Treino salvo com sucesso., sem botão Ver treino no corpo do editor; a navegação permanece no header Treinos. Edição confirma Treino atualizado com sucesso. e permite retornar ao detalhe pelo header Treino. Não há retorno automático. Após sucesso, controles voltam a estar disponíveis e novas edições limpam o feedback; a entrega não acrescenta bloqueio de criação duplicada ou idempotência. Uma falha de invalidação pode acontecer depois da gravação: não prometer que nenhum registro foi salvo.

## Bottom sheet · Catálogo

Fontes: `exercise-catalog-modal.tsx` e `exercise-catalog.ts`. Consulta `/exercises?scope=all`, com busca aplicada, grupo, limit de 50 e offset igual à quantidade carregada.

Digitar muda a busca local. Buscar ou a tecla de busca aplica o texto aparado. Limpar busca limpa texto local/aplicado, preservando grupo muscular. Os filtros disponíveis são Todos, Peito, Costas, Ombros, Bíceps, Tríceps, Pernas, Glúteos, Core, Cardio e Corpo inteiro. As capturas mostram o início da faixa horizontal; os demais filtros permanecem acessíveis por rolagem.

Selecionar uma linha adiciona um exercício ao dia ativo e fecha o catálogo; não há seleção múltipla nem botão de confirmar lote. Equipamento aparece apenas quando informado. Fechar pelo X ou Back do modal preserva o editor e mantém busca/filtro no componente montado.

Loading inicial, erro com retry, ausência de resultados, paginação, erro de próxima página e erro de atualização estão desenhados. O modal do catálogo não possui header de navegação com reload: seu Tentar novamente recupera o erro inicial. Falha de página preserva os itens e oferece Tentar carregar mais; sem próxima página, a ação desaparece. Durante fetch, busca, filtros e seleção ficam bloqueados; fechar permanece disponível. StatePanel usa o fundo da superfície do modal. Scrim protege o foco e a lista rola dentro do limite atual de 92% do viewport no runtime; o canvas expande o conteúdo para revisão.

## Foco e acessibilidade

Edição e foco acontecem no próprio formulário, sem uma tela separada de teclado. Aparência e altura do teclado são do sistema. Campo e unidade devem permanecer visíveis; controles seguintes são acessíveis por rolagem. Confirmar teclado, leitor de tela, estados selected/disabled, fonte ampliada e gestos na implementação MUV-40.

## Localização no canvas

O catálogo começa em y=77142. As telas ficam abaixo, com sete colunas e pelo menos 180 dp após a maior tela de cada linha. O contrato está à direita em `p3lVhN`.

As quatro páginas de bottom sheet de saída ficam na mesma linha, com a retomada do rascunho à direita. Elas usam instâncias conectadas ao componente existente `A571l` (`Sheet/SaídaSegura/Default`): texto, envio e erro são overrides, e os botões usam os estados da foundation. Todos os bottom sheets têm esse tipo explícito no nome do quadro. Não há componente de sheet paralelo para o MUV-31.

| Quadro | Node ID |
| --- | --- |
| Componentes · Treinos e exercícios | `xQNyH` |
| Lista · disponíveis | `v3bKo6` |
| Lista · nenhum treino | `yuoNo` |
| Lista · carregando | `K1Dv9W` |
| Lista · erro sem dados | `rBHC0` |
| Lista · indisponível · 404 | `Qd7zR` |
| Lista · aluno inválido | `R7JmlI` |
| Lista · atualizando com dados | `TFMmS` |
| Lista · erro ao atualizar | `N7NuF` |
| Lista · 320 dp | `aOYpS` |
| Lista · 430 dp | `eFds0` |
| Detalhe · ativo | `B6INq` |
| Detalhe · somente leitura | `KBxZ2` |
| Detalhe · campos opcionais ausentes | `eP9Dr` |
| Detalhe · carregando | `ibKMR` |
| Detalhe · erro sem dados | `bAUBx` |
| Detalhe · não encontrado · 404 | `uxdoZ` |
| Detalhe · identificador inválido | `E5Bhh` |
| Detalhe · outro aluno | `acywq` |
| Detalhe · atualizando com dados | `xCVTS` |
| Detalhe · erro ao atualizar | `l8z4yR` |
| Detalhe · 320 dp | `xwZAT` |
| Detalhe · 430 dp | `GdZqw` |
| Editor · novo · vazio | `OgWFW` |
| Editor · prescrição preenchida | `f81SIu` |
| Editor · alterações não salvas | `A8V2Ho` |
| Editor · dia sem exercícios após remoção | `inIel` |
| Editor · ordem alterada | `vW9k9` |
| Editor · limite de sete dias | `ZcRBb` |
| Editor · validação global | `WeRiD` |
| Editor · erro ao criar | `w3LH8M` |
| Editor · erro ao editar | `wwy1B` |
| Editor · salvando criação | `r0vXqL` |
| Editor · salvando alterações | `FFpKu` |
| Editor · criado · confirmação de sucesso | `RZSo3` |
| Editor · atualizado · retorno | `serqN` |
| Editor · 320 dp · nome extenso | `aybsK` |
| Editor · 430 dp | `GrgI2` |
| Editor · carregando edição | `z5yoK` |
| Editor · erro ao carregar edição | `Y0Xgq8` |
| Editor · não encontrado · 404 | `R3hDJ5` |
| Editor · identificador inválido | `tXy9z` |
| Editor · outro aluno | `puzY8` |
| Editor · arquivado · bloqueio | `ymhnO` |
| Bottom sheet · Catálogo · seleção por toque | `uRzoD` |
| Bottom sheet · Catálogo · busca aplicada e filtro | `R9b6pV` |
| Bottom sheet · Catálogo · nenhum resultado | `DzEKH` |
| Bottom sheet · Catálogo · carregando | `P5gA8` |
| Bottom sheet · Catálogo · erro inicial e retry | `HXKzG` |
| Bottom sheet · Catálogo · carregando próxima página | `G7rWM7` |
| Bottom sheet · Catálogo · erro na próxima página | `Z9qYM` |
| Bottom sheet · Catálogo · erro ao atualizar | `sGwns` |
| Bottom sheet · Catálogo · todos carregados | `gIT8O` |
| Bottom sheet · Catálogo · 320 dp | `yAacZ` |
| Bottom sheet · Catálogo · 430 dp | `o5gnUq` |
| Editor · exercício selecionado · valores iniciais | `pRl06` |
| Confirmação · remover dia · 390 dp | `P9njzq` |
| Confirmação · remover dia · 320 dp | `t7zTwC` |
| Fluxo e contrato de implementação | `p3lVhN` |
| Bottom sheet · Sair do editor · confirmação · 390 dp | `UFwPa` |
| Bottom sheet · Sair do editor · confirmação · 320 dp | `rRk8K` |
| Bottom sheet · Sair do editor · salvando rascunho | `Ip1XG` |
| Bottom sheet · Sair do editor · erro ao salvar rascunho | `osTYQ` |
| Editor · retomada do rascunho na conta | `CacGB` |

## Verificação

Revisão visual de 08/10/2026: a comparação estrutural dos 16 formulários confirmou headers, menus, títulos/contextos e referências de campos/prescrição idênticos antes e depois da reorganização. Capturas conferiram 320/390/430 dp, vazio, limite de sete dias, envio, validação global, valores iniciais e foco com teclado. Todos os botões substituídos estão em pais flex, com largura válida e altura de 58 dp; avisos emitidos durante `Replace` apontavam IDs antigos, ausentes na árvore final. Os 330 quadros raiz não se intersectam. A correção posterior de 44 botões restaurou as cores primárias/secundárias da foundation, incluindo loading/disabled, sem alterar headers ou menus; capturas adicionais conferiram 390/320 dp e envio. O salvamento do Pen permanece com o usuário.

A revisão posterior do dia de treino substitui especificamente a organização e as ações de adição descritas acima. A leitura MCP confirmou um cartão do dia, um cabeçalho contextual e uma adição de exercício por variante nos 16 formulários e em `pRl06`, com contagens correspondentes a zero, um ou dois exercícios. Capturas conferiram 320/390/430 dp, vazio, dois exercícios, sete dias, envio e valores iniciais. Foram preservados os overrides de carga 42 kg, os valores iniciais 3 séries/10 repetições e os bloqueios de remoção do único dia e durante envio. A comparação global continuou com 330 quadros raiz e zero interseções; o catálogo de componentes não reportou clipping. `git diff --check` não apontou erros e a busca de escapes Unicode no documento não encontrou ocorrências. O Pen continua aberto para salvamento pelo usuário.

Leitura MCP contou 60 quadros raiz e 510 referências, sem placeholders ou escapes Unicode no escopo novo. A comparação dos retângulos globais dos 325 quadros raiz retornou zero interseções. Capturas inspecionadas cobrem lista/detalhe, editor em 390/320 dp, catálogo em 390/320 dp, envio, confirmação destrutiva em 320 dp, valores iniciais, foco, validação global, erro de paginação, vazio, erro inicial, plano arquivado e limite de dias. Diagnósticos de bounds e warnings de elementos desabilitados em instâncias precisam ser confrontados com capturas; não equivalem a geometria interna automaticamente limpa.

O Pen foi salvo por Ctrl+S em 06/10/2026. O indicador Edited desapareceu e o arquivo local passou de 3231063 para 3873748 bytes, com atualização às 20:29:28. O status Git confirmou alteração somente do Pen e inclusão deste handoff. A verificação UTF-8 e a varredura de escapes/marcadores passaram; git diff --check retornou sem erros. Não houve commit, merge ou publicação remota nesta entrega.

Revisão de 07/10/2026: removidos dez botões de retorno e doze botões de atualização do conteúdo, em 22 telas, incluindo Qd7zR, R7JmlI e v3bKo6. O retorno e o reload ficam somente no header; a atualização em andamento usa seu ícone de progresso desabilitado. O header Alunos cobre contexto inválido, e Treino cobre edição confirmada e bloqueio por arquivamento. Os retries iniciais e de paginação continuam como recuperação dos respectivos erros.

A leitura MCP após a revisão confirmou os mesmos 60 quadros, com 488 referências e 45 headers contextuais. A varredura das 58 telas/estados, com instâncias resolvidas e elementos ocultos excluídos, encontrou zero ações de voltar ou atualizar fora do header. Os 325 quadros raiz continuam sem interseções; o escopo não contém placeholders ou escapes Unicode. Capturas adicionais conferiram retorno indisponível/inválido, lista disponível/erro, atualização com dados, detalhe sem campos opcionais, detalhe de 320 dp, edição confirmada e editor arquivado. Ctrl+S foi aplicado novamente em 07/10/2026; o indicador Edited está ausente e o arquivo tem 3865784 bytes, com atualização às 15:11:17.

Segunda revisão de 07/10/2026: o reload foi mantido visível nos 45 headers contextuais, com estados normal, desativado e carregando. Removidos os três botões Tentar novamente de rBHC0, bAUBx e Y0Xgq8; a recuperação dessas consultas fica no header. O retry do catálogo e o retry de paginação permanecem no modal, que não possui esse header. A leitura MCP confirmou 60 quadros e 485 referências; os 45 reloads estão visíveis, sendo 16 normais, 24 desativados e cinco carregando. Não há retries no conteúdo das telas com header, placeholders ou escapes Unicode no escopo; os 325 quadros raiz não se intersectam. Capturas conferiram os três erros corrigidos, carregamento inicial, editor novo e contexto inválido. O salvamento desta revisão fica com o usuário.

Testes, lint, typecheck e build do Expo não se aplicam: nenhum código do aplicativo foi alterado. Verificação textual usa UTF-8, busca por escapes Unicode e `git diff --check`. A aprovação visual e a implementação nativa são etapas distintas.

Revisão do rascunho e saída em 07/10/2026: removidos seletor e label de status de 15 variantes do editor. As quatro páginas de bottom sheet e a retomada da conta usam a foundation existente. A confirmação de saída, carregamento e erro reutilizam `A571l`, sem duplicar componentes de sheet. Capturas conferiram confirmação em 390/320 dp, envio com ações desativadas, falha com recuperação, editor sem seletor e retomada. A seção duplicada `x4XDv` e seus três componentes foram removidos após conectar as páginas ao componente compartilhado. O salvamento do Pen permanece com o usuário.

Revisão da seleção de dias em 07/10/2026: o padrão de aybsK foi corrigido e aplicado a 16 variantes do editor. Abas selecionam; uma única ação contextual Remover dia fica no cabeçalho do campo do dia selecionado. Capturas conferiram 320/390 dp, um dia, sete dias e envio. O desenho reutiliza tabs, campo e botões de texto da foundation, sem novos componentes reutilizáveis. A leitura contou 65 quadros MUV-31 e 464 referências, sem ações de remoção sob as abas, placeholders ou escapes Unicode; os 330 quadros raiz não se intersectam. O visitor de bounds reporta clipping no wrapper movido e no toolbar, divergindo das capturas completas após a reorganização; não é usado como prova de geometria interna limpa. O salvamento permanece com o usuário.

## Validação MUV-40 — execução run-34 (16/10/2026)

### Fluxo real em Android

Como a ponte de emulador do Orca estava indisponível, o QA usou ADB no AVD exclusivo `emulator-5554` (Android API 36), API/banco isolados por `.env.test` e as larguras de 320 dp (`wm size 840x2400`, densidade 420 dpi) e 390 dp (`wm size 1024x2400`, densidade 420 dpi). O fluxo autenticou o professor, abriu o aluno Dalila, salvou um rascunho válido pelo guard de saída, confirmou sua separação do plano ativo na lista, encerrou e reabriu o processo e retomou o rascunho pela conta. Em seguida, publicou o conteúdo e confirmou o consumo do rascunho e a exibição do plano ativo. A publicação também retornou HTTP 200 na API isolada. O AVD nativo de 430 dp não foi validado; essa largura foi comparada somente com os exports do Pen.

Capturas desta execução:

- [Editor em 320 dp](evidence/muv-40/editor-320dp.png) e [editor em 390 dp](evidence/muv-40/editor-390dp.png), incluindo o texto completo de “Adicionar dia”.
- [Rascunho salvo na lista](evidence/muv-40/draft-lista-salvo.png), [rascunho retomado após reabrir o app](evidence/muv-40/draft-retomado.png) e [lista após publicação](evidence/muv-40/draft-publicado.png).

O ciclo validado demonstra persistência remota após reinício do processo; não foi feita reinstalação nem teste em segundo aparelho. O restante dos estados de erro, concorrência e saída é coberto pelas suítes automatizadas.

### Verificações automatizadas

- API: 22 arquivos e 101 testes passaram; `migrate:test` executou antes da suíte.
- Mobile: 82 arquivos e 799 testes passaram com `--hookTimeout=30000 --maxWorkers=4`.
- Cobertura mobile: core 94,17% de statements; UI 86,16% de statements.
- Validators: dois arquivos e 36 testes passaram. Typecheck passou em mobile, API, validators e DB.
- Biome verificou 163 arquivos sem aplicar correções. `git diff --check` e a busca de escapes Unicode no diff também passaram.
- Revisão independente do código contra `develop`: aprovada sem achados após remover alterações incidentais do prebuild.

O Expo Doctor reportou 16/17 verificações. A única falha é o alinhamento de versões de `sentry-expo` (esperado `~7.0.0`, instalado `7.2.0`) e `@react-navigation/bottom-tabs` (esperado `^7.4.0`, instalado `7.16.0`); ambos já constam assim em `develop` e não são alterados por esta entrega.
