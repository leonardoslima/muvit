# Professor — Home e alunos v2 — MUV-29

A fonte visual é `assets/design/mobile.pen`, editada pelo MCP do Pen. A entrega estende a foundation MUV-24 e cobre a jornada Início → Alunos → Detalhe do aluno. Os valores e identidades dos exemplos são ilustrativos. A implementação Expo pertence à MUV-38.

## Quadros

| Área | Node ID | Conteúdo |
| --- | --- | --- |
| Componentes | `FajXL` | Linha de aluno, resumo da carteira, indicador e identidade do aluno |
| Home | `sPhAW` | Carteira e indicadores disponíveis |
| Home | `dbhmp`, `jqTj2`, `Cr9tG` | Loading, erro inicial e carteira vazia |
| Home | `HuTlv`, `liel6`, `vVpIO` | Atualização, erro com dados e retry |
| Alunos | `opQby`, `fIFid` | Lista e busca aplicada |
| Alunos | `QO8T8`, `blDRz`, `uMGJl`, `h70FO`, `F6PJD` | Loading, erro inicial, carteira vazia, busca vazia e retry |
| Alunos | `oqdnt`, `i596lh` | Atualização e erro preservando a lista |
| Paginação | `p545B`, `tSDT8`, `vBo1r`, `o7n5Z` | Fim da página, loading, erro com retry e todos carregados |
| Detalhe | `wyzdn`, `E8ZoR`, `b1dC0` | Dados completos, ausentes e contato parcial |
| Detalhe | `g1mCwr`, `vce5L`, `lRg5y`, `iVunx`, `j9QNG` | Loading, erro inicial, 404, identificador inválido e retry |
| Detalhe | `A8i1E`, `qWh5g` | Atualização e erro com dados |
| Adaptação 320 dp | `RSFzR`, `iJPiO`, `e2KHo` | Home, lista e detalhe |
| Adaptação 430 dp | `f9HmDi`, `uZVU6`, `oesMk` | Home, lista e detalhe |
| Conteúdo extenso | `e1IV7`, `w3M1bf` | Nomes, contatos e informações longas em 320 dp |
| Foco e teclado | `Xttp3` | Busca explícita e ação Search |
| Contratos | `ZYBVM` | Jornada, estados e limites da implementação |

Os quadros começam em y=50541. As telas são expandidas verticalmente para expor o conteúdo rolável. A tab bar permanece fixa no shell no runtime; sua posição no fim do quadro não define uma altura de dispositivo. Os quadros de paginação representam o fim da lista após rolagem: as linhas anteriores não são repetidas, e os 25 itens da página continuam sendo o contrato funcional.

## Hierarquia e reutilização

- Home apresenta alunos ativos, total de vinculados, pausados e inativos no resumo; novos na semana, planos ativos e avaliações em 30 dias são indicadores informativos. “Ver alunos” fica dentro do card da carteira disponível como ação principal. Na carteira vazia (`Cr9tG`), o acesso aos alunos usa somente a tab Alunos, sem botão duplicado no conteúdo. Não há agenda, atividade recente, filtros por métrica ou ações de gestão inventadas.
- Lista apresenta nome, iniciais, contato e status em uma linha inteira tocável. A apresentação do contato mantém a precedência e-mail → telefone → “Sem contato cadastrado”. Ativo, Pausado e Inativo são informativos, sem edição ou filtro de status.
- Detalhe usa cabeçalho contextual com voltar e atualizar, identidade compacta com status, contato, nascimento e gênero em uma linha, objetivo e restrições. Os acessos Ver histórico/Nova avaliação e Ver treinos/Novo treino são agrupados em pares; os destinos internos pertencem aos designs MUV-30/MUV-31. Essa composição também aparece nas variantes estreita, larga e de conteúdo extenso.
- Os quatro acessos usam `Button/Aluno/Ação` (`D0UIi`), variante reutilizável no catálogo `FajXL` derivada das propriedades de `Button/Secondary/Default`. A referência enviada pelo usuário orienta somente cores e ícones: consultas usam superfície branca, texto verde e ícone de documento ou halter sobre fundo sutil; criação usa verde escuro, texto branco e “+” sobre lima. A variante preserva altura de 52 dp, raio de 29 dp, padding de 12/20 dp, gap interno de 8 dp e distância de 12 dp entre os botões. Ícones Lucide de 16 dp ficam em fundos circulares de 24 dp. Os labels continuam em DM Sans 14 dp e podem ocupar duas linhas na largura disponível, mantendo o alvo de toque. A composição foi aplicada aos oito detalhes com conteúdo (`wyzdn`, `E8ZoR`, `b1dC0`, `A8i1E`, `qWh5g`, `e2KHo`, `oesMk`, `w3M1bf`), totalizando 32 instâncias.
- Os 13 quadros de detalhe usam `Header/Contextual/Aluno` (`B32I3H`), com retorno de 48 dp e rótulo “Alunos”. Reload e retorno ficam visíveis somente no cabeçalho, inclusive em loading, erro inicial, retry, 404 e identificador inválido. A atualização fica acionável no erro recuperável e desativada durante a consulta, no aluno não encontrado ou no identificador inválido. O título grande “Aluno” e os botões de voltar separados foram retirados desses estados. A busca com teclado mantém a atualização no cabeçalho, como as demais listas com dados.
- O badge da identidade ocupa a largura do conteúdo, com 24 dp de altura, padding de 4/8 dp e distância de 6 dp do nome. A composição compacta se aplica também à variante de conteúdo extenso, preservando “Pausado”.
- A paleta, DM Sans, safe areas, raios e alvos de toque seguem `docs/mobile-v2-foundation.md`. As telas instanciam botões, campos, badges, StatePanel, mensagens, cabeçalho e tabs existentes. As extensões `List/Aluno/Default` (`mRJyD`), `Card/Professor/Carteira` (`xw43b`), `Metric/Professor/Default` (`mSaYx`) e `Card/Aluno/Identidade` (`WvvbK`) ficam no quadro MUV-29 e usam tokens existentes.

## Navegação e interações

| Origem / ação | Destino ou efeito |
| --- | --- |
| Home com carteira disponível / Ver alunos; tab Alunos em todos os estados | `/trainer/students` |
| Linha do aluno | Push `/trainer/students/[studentId]` com o ID existente |
| Detalhe / Voltar para alunos | Replace `/trainer/students`, conforme o fluxo atual |
| Ver histórico | `/trainer/students/[studentId]/assessments` |
| Nova avaliação | `/trainer/students/[studentId]/assessments/new` |
| Ver treinos | `/trainer/students/[studentId]/workouts` |
| Novo treino | `/trainer/students/[studentId]/workouts/new` |
| Digitar na busca | Após 400 ms sem alteração do termo, consultar a API pelo nome em toda a carteira; remover espaços das extremidades e cancelar a consulta anterior ao mudar o termo |
| X dentro do campo | Limpar imediatamente o texto e o filtro, cancelar a busca pendente e retornar à lista sem filtro |
| Carregar mais / Tentar carregar mais | Carregar a próxima página sem substituir os itens atuais |
| Ícone de atualizar no cabeçalho | Refetch do recurso da tela; Home, lista e detalhe recuperam o erro inicial somente pelo ícone do cabeçalho |

Os quadros documentam a navegação; não constituem um protótipo clicável. A tab bar mantém Início/Alunos/Perfil. O professor não ganha cadastro, convite, alteração de ownership ou alteração de status neste card. Nenhum status bloqueia os acessos do detalhe no fluxo atual.

## Contratos e estados

Fontes funcionais: `apps/mobile/src/screens/trainer-home.tsx`, `trainer-students.tsx`, `trainer-student-detail.tsx`, `src/application/trainer/trainer-data.ts`, os componentes de aluno e o schema compartilhado de alunos.

- Home usa `/trainer/summary` com `students.total`, `active`, `paused`, `inactive`, `newThisWeek`, `workouts.activePlans` e `assessments.last30d`. Carteira vazia depende de `total === 0`, e não de ativos igual a zero. Atualizar bloqueia reentrada durante `isRefetching`.
- Lista usa `/students?q=...&limit=25&offset=...`, omitindo `q` sem filtro. A busca cobre toda a carteira pela API e inicia na primeira página de cada termo; Carregar mais pagina os resultados desse termo pelo número de itens já carregados. A query inclui o termo aplicado e encaminha o AbortSignal até a requisição, impedindo respostas antigas de substituir a busca atual. O intervalo de 400 ms é reiniciado a cada mudança do termo; apagar tudo ou tocar no X limpa imediatamente. Enviar pelo teclado não duplica a busca automática. Atualizar mantém o filtro aplicado.
- Loading inicial e erro sem dados usam StatePanel na área principal, sem superfície própria de card. Header e navegação permanecem como referência do shell v2.
- Na Home e na lista, os controles reutilizam `IconButton/Refresh/Default` (`fQXup`) e `IconButton/Refresh/Disabled` (`nqQdX`), com alvo de 48 × 48 dp. O detalhe usa overrides do reload existente em `B32I3H`, sem alterar a foundation. `dbhmp`, `vVpIO`, `QO8T8`, `F6PJD`, `g1mCwr` e `j9QNG` mantêm reload estático e desativado, com StatePanel de loading como único progresso da consulta. Em `jqTj2`, `blDRz` e `vce5L`, o reload fica acionável e o StatePanel de erro não mostra Tentar novamente; a descrição indica a recuperação pelo cabeçalho. `lRg5y` e `iVunx` mantêm retorno somente no header, sem botão Voltar para alunos no conteúdo, e reload visível desativado.
- O ícone do cabeçalho é a única ação de atualização. O campo de busca permanece montado durante carregamento e erro, com o X de “Limpar busca” dentro dele quando há texto. Não há botões externos de buscar ou limpar. Durante a espera pelo termo atual, resultados antigos e paginação ficam ocultos; o campo continua disponível. A contagem usa o total filtrado retornado pela API.
- Durante a atualização com dados, Home, lista e detalhe apresentam feedback de progresso sobre a tela inteira, mantendo o conteúdo anterior visível ao fundo. O feedback é um estado, sem botão. Em `HuTlv`, `oqdnt` e `A8i1E`, esse indicador dedicado é o único progresso da consulta; o reload do header permanece visível, com ícone estático e desativado, preservando alvo de 48 dp e posição. A composição expandida do canvas ilustra essa camada; no runtime ela acompanha o viewport do shell. O bloqueio de reentrada das operações de fetch permanece o existente. Nas novas tentativas sem dados (`vVpIO`, `F6PJD` e `j9QNG`), StatePanel de loading comunica o progresso e o reload fica desativado, sem botão no conteúdo.
- Falha de atualização com dados usa mensagem contextual e preserva conteúdo. A falha de paginação possui mensagem e “Tentar carregar mais” próprios; não é tratada como erro de refresh. Atualizar e as ações de paginação ficam desabilitados enquanto `isFetching`.
- Detalhe usa `/students/:studentId`. Identificador ausente e 404 oferecem retorno aos alunos somente pelo header. O 404 tem prioridade sobre conteúdo anterior e não expõe dados de um aluno indisponível. Erro genérico com dados usa mensagem contextual.
- Contato ausente apresenta “Sem contato cadastrado”; contato parcial apresenta “Não informado” para o campo ausente. Nascimento e gênero ausentes usam “Não informado”; gênero mantém Masculino/Feminino/Outro. Objetivo e restrições ausentes usam “Sem objetivo cadastrado” e “Sem restrições cadastradas”.
- Nenhum estado promete operação offline, persistência local da carteira ou mudança na política de cache. A recuperação usa as operações existentes.

## Ergonomia e validação

Referência de 390 dp, com Home/lista/detalhe em 320 e 430 dp. Nas cinco variantes de 320 dp, o título principal usa 26 dp, o nome no card de identidade 20 dp, os títulos de seção 16 dp e o corpo 14 dp; nomes de linhas usam 16 dp. A variante de detalhe extenso segue essa escala, sem simular fonte ampliada. As margens e os espaçamentos permanecem preservados, e o conteúdo continua rolável. Controles de ação têm pelo menos 48 dp; status é comunicado por texto e ícone/cor. Nomes, contatos, objetivos e restrições quebram linha e aumentam o conteúdo. O teclado desenhado é uma referência do sistema, não um teclado customizado para implementar.

Safe areas e inset de tab bar são consumidos uma vez pelo shell. Conteúdo permanece rolável quando teclado, texto longo ou escala de fonte exigirem. Implementação, gestos, leitor de tela, foco real, teclado e comportamento Android/iOS precisam ser verificados na MUV-38.

Testes, lint, typecheck e build do Expo não se aplicam a esta entrega exclusivamente de design.

O ajuste de 08/10/2026 centralizou a recuperação da Home no cabeçalho: adicionou reload a `dbhmp`, `jqTj2` e `vVpIO`, removeu a ação do StatePanel de erro e substituiu o botão de nova tentativa por StatePanel de loading. Também retirou Ver alunos da carteira vazia `Cr9tG`, preservando a tab Alunos. As quatro capturas foram conferidas; o guia `ZYBVM` acompanha o novo desenho. O runtime Expo ainda precisa acompanhar esses ajustes de composição.

A verificação seguinte dos 30 quadros de lista e detalhe identificou oito estados divergentes: `QO8T8`, `blDRz`, `F6PJD`, `g1mCwr`, `vce5L`, `j9QNG`, `lRg5y` e `iVunx`. Todos passaram a preservar reload visível no header, respeitando os estados acionável/desativado descritos acima. As ações duplicadas dos StatePanels foram ocultadas e as novas tentativas passaram a usar loading dedicado. Busca, paginação, conteúdo carregado e navegação foram preservados.

A revisão pelo MCP registrou 41 quadros (39 telas, componentes e contrato), 218 referências diretas, nenhum placeholder e nenhum escape Unicode. A revisão anterior das ações removeu 20 controles redundantes: ações “Ver alunos” externas ao card, botões de atualização no rodapé e botões usados para representar progresso. A segunda ação “Limpar busca” do StatePanel foi ocultada. A revisão de cabeçalhos corrigiu cinco estados de detalhe e retirou três botões de voltar separados; também incluiu a atualização no cabeçalho da busca com teclado. Erro inicial e falha de próxima página mantêm seus retries específicos. O detalhe de conteúdo longo mantém o status “Pausado”, sem herdar o texto padrão do badge da foundation.

O diagnóstico `ctx.bounds` reporta divergências de posição em nós novos; as capturas precisam ser usadas para distinguir clipping real de alertas geométricos. Esses alertas não sustentam uma afirmação de geometria limpa. A nova revisão independente inspecionou as 41 capturas e identificou uma ação redundante restante (`pDceH`) e o texto do status no detalhe extenso (`RyU3Z`). A ação foi removida e o status foi corrigido para “Pausado”; a revisão das duas recapturas classificou ambos os ajustes como resolvidos, com disposition `ship` limitada a essas correções. Essa revisão substitui a anterior, que não identificou as duplicatas apontadas pelo usuário. Os oito pares de texto/fundo anteriormente medidos têm contraste entre 4,81:1 e 11,88:1; essa amostra não constitui uma auditoria completa de contraste.

A revisão independente posterior, limitada aos cabeçalhos, leu os 39 headers pelo MCP e inspecionou nove capturas de estados corrigidos e referências. Confirmou os 13 detalhes com cabeçalho contextual de 48 dp, retorno de 48×48 dp e rótulo “Alunos” na mesma posição. Os outros 26 mantêm a estrutura de título/contexto, com atualização de 48 dp quando aplicável; a busca com teclado segue a lista normal. O resultado foi `ship` nesse escopo. Após essa revisão, as variantes de 320 dp receberam a escala menor descrita acima, conforme o feedback do usuário.

A revisão visual independente da tipografia inspecionou as cinco capturas atuais de 320 dp e retornou `ship` nesse escopo. Não identificou cortes, sobreposições ou conteúdo espremido; nomes e contato extenso quebram linha com espaço adequado. Essa inspeção visual não verifica medidas exatas nem comportamento nativo de escala de fonte.

O arquivo Pen foi salvo pelo usuário e reaberto para conferência antes da integração. A leitura pelo MCP confirmou os 41 quadros, os 13 cabeçalhos contextuais do detalhe e a escala corrigida de 320 dp, sem placeholders ou escapes Unicode. A verificação de whitespace passou e a busca por escapes Unicode no handoff não encontrou ocorrências. A aprovação se limita ao artefato de design e aos contratos documentados; não valida o runtime nem representa um protótipo clicável.
