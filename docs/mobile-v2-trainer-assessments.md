# Professor — avaliações de alunos v2 — MUV-30

A fonte visual é `assets/design/mobile.pen`, editada pelo MCP do Pen. Esta entrega estende a foundation MUV-24 e a jornada da carteira MUV-29 para consulta e criação de avaliações do professor. Dados, datas e fotos das amostras são ilustrativos. A implementação Expo pertence à MUV-39.

O usuário aprovou o design inicial em 2026-10-06 e, depois, solicitou ajustes nas fotos e na organização do canvas. As correções estão registradas abaixo. Após revisar o resultado final, confirmou o salvamento do Pen e autorizou commit, integração e publicação de develop, exclusão da branch de trabalho e conclusão da MUV-30. A aprovação cobre o artefato visual e os contratos documentados; não valida a implementação nativa.

O salvamento do arquivo Pen foi realizado e confirmado pelo usuário em 2026-10-06. O arquivo local apresenta as alterações para versionamento; a revisão visual foi feita no canvas pelo MCP.

## Quadros

| Área | Node ID | Conteúdo |
| --- | --- | --- |
| Componentes | `foWU5` | Linha tocável de avaliação e métrica de leitura |
| Lista | `c3VpNz`, `YXjyd` | Histórico disponível e todos os registros carregados |
| Lista | `evn0d`, `BYEGy`, `w11Iq` | Vazio, loading e erro inicial com retry |
| Lista | `OWLNM`, `NKmVg` | Avaliações indisponíveis/404 e aluno inválido |
| Lista | `KceG0`, `mc2M2` | Atualização e falha preservando dados |
| Paginação | `xXxdZ`, `F0pc1F`, `VKaNn` | Carregar mais, loading e erro com retry |
| Detalhe | `vEb96`, `sUrBM` | Avaliação completa com três fotos e dados ausentes |
| Detalhe | `W1qNOs`, `kqQcX`, `kThhD` | Loading, erro inicial e 404 |
| Detalhe | `HV4GL`, `d3nI8` | Identificador inválido e avaliação de outro aluno |
| Detalhe | `ABuvm`, `P5Bqm` | Atualização e falha preservando dados |
| Formulário | `yFUlq`, `bCfoT` | Vazio e preenchido |
| Fotos | `iKraZ`, `EZXQt` | Uma foto e limite de três fotos selecionadas |
| Validação | `UN17U`, `iRPXB` | Data inválida e número inválido, com mensagem global |
| Falhas | `veT0i`, `FrRS5`, `AxLAp` | Formato de foto, upload e salvamento |
| Envio | `SK17R`, `eKD5z` | Salvando e sucesso transitório |
| Formulário | `UjtEg`, `NIy9m` | Aluno inválido e recorte de foco com teclado |
| Adaptação 320 dp | `umdvq`, `DdIMn`, `o6D0v` | Lista, detalhe e formulário |
| Adaptação 430 dp | `iDrh0`, `rMgrq`, `l18Mce` | Lista, detalhe e formulário |
| Conteúdo extenso | `xou7B` | Observações longas em 320 dp |
| Contratos | `ggVdz` | Jornada, estados e limites da implementação |

Os quadros começam em y=62863 e as telas em y=63429, com 180 dp entre o fim do quadro mais alto de uma linha e o início da seguinte. Cada tela é um frame independente, expandido verticalmente para apresentar o conteúdo rolável. A posição da tab bar no fim do quadro não define uma altura de dispositivo: no runtime, a navegação e os insets pertencem ao shell.

## Hierarquia e reutilização

- A lista usa cabeçalho contextual com retorno ao aluno e atualização, título Avaliações, contexto e uma ação principal Nova avaliação. Cada linha inteira abre seu registro; não há botão Abrir separado ou atualização duplicada no rodapé.
- O detalhe retorna às avaliações e apresenta data, métricas principais, circunferências disponíveis, fotos e observações. A atualização fica no cabeçalho. O formulário retorna às avaliações e agrupa métricas, circunferências, fotos e observações, com Salvar avaliação ao final.
- Loading e erro inicial preservam o cabeçalho contextual e a navegação. Lista e detalhe mantêm reload visível em todos os estados: acionável no erro recuperável e estático/desativado durante a consulta, paginação, 404, identificador inválido ou avaliação de outro aluno. Tentar novamente não aparece no corpo; o erro orienta a recuperação pelo cabeçalho. O StatePanel ou indicador dedicado é o único progresso da consulta. Em contexto indisponível, a recuperação usa o retorno contextual, sem repetir um botão de voltar na área de estado. Formulários mantêm apenas o retorno, sem reload de consulta.
- As telas reutilizam instâncias conectadas de `Header/Contextual/Aluno`, tabs do professor, campos, botões, mensagens e StatePanel da foundation. As extensões `List/Avaliação/Professor` (`gwq9N`) e `Metric/Avaliação/Leitura` (`NtjQg`) ficam no catálogo `foWU5` e usam tokens existentes.
- Os oito formulários com fotos selecionadas seguem a seção `Photos/Avaliação/Selecionadas` (`FVzOO`) da MUV-27, composta por instâncias do componente de imagem `CfWyw`: contagem, miniaturas em duas colunas, rótulo Foto N e remoção por ícone de 48 dp. Não há botões largos Remover foto N.
- A linha de avaliação apresenta data, peso, gordura e observações resumidas. Ela não herda as comparações do card do aluno da MUV-27: essas comparações não existem no fluxo atual do professor.
- A composição conserva DM Sans, papel, verde profundo, lima, gutter de 16 dp, botões de 58 dp, campos de 52 dp e alvos contextuais de 48 dp. Títulos usam 30 dp em 390/430 dp e 26 dp em 320 dp. Labels e unidades permanecem visíveis.

## Navegação

| Origem / ação | Destino ou efeito |
| --- | --- |
| Detalhe do aluno / Ver histórico, já desenhado na MUV-29 | `/trainer/students/[studentId]/assessments` |
| Lista / registro | Push `/trainer/students/[studentId]/assessments/[assessmentId]` |
| Lista ou detalhe do aluno / Nova avaliação | Push `/trainer/students/[studentId]/assessments/new` |
| Lista / retorno contextual Aluno | Dismiss to `/trainer/students/[studentId]` |
| Detalhe ou formulário / retorno contextual Avaliações | Dismiss to `/trainer/students/[studentId]/assessments` |
| Contexto sem `studentId` / retorno contextual Alunos | Dismiss to `/trainer/students` |
| Consulta / reload do cabeçalho, inclusive no erro inicial | Refetch do recurso existente |
| Lista / Carregar mais ou Tentar carregar mais | Próxima página, preservando os itens anteriores |
| Formulário / sucesso | Retorno automático às avaliações após o feedback existente |

As rotas de avaliações estão dentro do Stack de alunos, que pertence à tab Alunos; o shell mantém Início/Alunos/Perfil. O quadro de teclado é um recorte de interação, sem repetir toda a extensão do formulário nem a tab bar coberta pelo teclado. Os quadros documentam a jornada; não constituem um protótipo clicável.

## Lista e consulta

Fontes funcionais: `apps/mobile/src/screens/trainer-assessments.tsx` e `src/application/assessments/assessment-data.ts`.

- A consulta usa `GET /students/:studentId/assessments?limit=25&offset=...`. O próximo offset corresponde à quantidade de itens já carregados. Preservar a ordem retornada e a condição de existência de próxima página.
- Datas aparecem em DD/MM/AAAA; valores usam apresentação pt-BR, com kg e %. Valores ausentes ou inválidos usam Não informado, sem transformar ausência em zero. Observações da lista mantêm o resumo em até duas linhas definido no componente atual.
- Loading e erro sem dados usam StatePanel na área principal, sem superfície própria de card ou botão de recuperação. O reload do cabeçalho recupera o erro inicial e fica estático/desativado durante a nova tentativa, com StatePanel de loading como único progresso.
- Vazio mantém Nova avaliação como única ação de criação; o estado explica a ausência do histórico sem repetir a mesma ação.
- Durante atualização com dados, o feedback de progresso acompanha o viewport, preservando o conteúdo anterior ao fundo, como na composição da MUV-29. É feedback, sem botão. A geometria expandida do canvas não define o tamanho do overlay no runtime.
- Falha de atualização mantém a lista e apresenta mensagem contextual. Falha da próxima página mantém os itens e oferece Tentar carregar mais. A atualização e as ações de paginação ficam desabilitadas enquanto `isFetching`.
- Carregar mais aparece somente enquanto há itens restantes. Os quadros de paginação ilustram o fim da página; três registros de amostra não substituem o contrato de 25 itens.
- Identificador ausente retorna para Alunos. O 404 tem prioridade sobre dados anteriores e não apresenta avaliações indisponíveis.

Não introduzir busca, filtros, gráficos, comparação, edição ou exclusão. A tela não promete cache offline persistente ou fila de sincronização.

## Detalhe

Fontes funcionais: `apps/mobile/src/screens/trainer-assessment-detail.tsx`, `assessment-measurements-card.tsx` e `assessment-photo-list.tsx`.

- Consultar `GET /assessments/:assessmentId` e manter a checagem `assessment.studentId === studentId` antes de apresentar os dados. Avaliação de outro aluno oferece retorno ao histórico sem expor seu conteúdo.
- Peso, altura e gordura ausentes usam Não informado. As circunferências aparecem somente quando a chave foi recebida: peito, cintura, quadril, braços direito/esquerdo, coxas direita/esquerda e panturrilhas direita/esquerda. Sem circunferências, apresentar Não informado na seção.
- IMC não aparece no detalhe, pois não faz parte da apresentação atual dessa tela. O cálculo existente permanece apenas no formulário.
- Sem fotos válidas, a seção Fotos não aparece. Com fotos, mostrar todas as URLs não vazias retornadas, sem limitar a leitura às três permitidas na seleção do professor. O layout cresce com o conjunto recebido.
- Fotos preservam a referência de 4:3. As imagens de amostra do canvas reutilizam `assets/design/assessment-photo-samples/assessment-views.png`; não são fotos de um aluno real nem especificam poses obrigatórias.
- Observações ausentes ou em branco usam Não informado. Texto extenso cresce e permite rolagem.
- Loading, erro inicial, 404 e identificador inválido preservam o contexto de retorno e o reload visível no header. O erro inicial recuperável usa somente esse reload; consulta em andamento ou contexto indisponível mantém o controle estático/desativado. Falha de atualização conserva a avaliação com mensagem contextual; o 404 tem prioridade sobre conteúdo anterior.

Não criar visor de fotos, carousel, remoção de anexos registrados, compartilhamento, edição ou exclusão.

## Nova avaliação

Fontes funcionais: `apps/mobile/src/screens/trainer-new-assessment.tsx`, `src/application/assessments/assessment-form.ts`, `src/lib/uploads.ts` e `packages/validators/src/assessments.ts`.

- Data inicia com a data local atual e usa entrada AAAA-MM-DD. Somente a data é obrigatória. Peso, altura, gordura corporal, nove circunferências, fotos e observações permanecem opcionais.
- Campos numéricos usam teclado decimal e continuam aceitando vírgula pela normalização existente. IMC é somente leitura: calculado com peso e altura positivos, com uma casa decimal; sem valores válidos, exibir Informe peso e altura. Não criar um campo novo no payload.
- O formulário vazio `yFUlq` mostra placeholders nos 12 campos numéricos e em Observações, em `color/text/secondary`. Os exemplos numéricos usam Ex.: e vírgula decimal quando aplicável; Observações usa Adicione observações sobre a avaliação. São dicas de campos vazios, não valores preenchidos ou dados enviados. Labels e unidades continuam visíveis, e a data inicial permanece preenchida.
- Preservar os limites atuais: peso positivo até 500 kg; altura positiva até 300 cm; gordura de 0 a 80%; circunferências positivas; observações até 2000 caracteres.
- A validação atual apresenta uma mensagem global, referente à primeira falha. Os quadros de data/número inválidos preservam os campos e apresentam essa mensagem antes de salvar; não introduzem erros por campo, validação a cada digitação ou novos requisitos.
- Observações usam entrada multiline. O conteúdo extenso permanece visível no quadro de 320 dp; no runtime, a entrada pode rolar conforme o comportamento nativo existente.

### Fotos do professor

Adicionar foto abre a biblioteca nativa, com seleção de uma imagem por vez, edição habilitada e qualidade atual de 0,7. Cancelar preserva a seleção anterior. O suporte atual é JPEG ou PNG; formato inválido produz Selecione uma imagem JPEG ou PNG.

O formulário do professor aceita até três fotos selecionadas. A ação Adicionar foto usa o componente de upload `S8jXyf`: com nenhuma foto, ocupa a primeira posição da grade; com uma ou duas, aparece logo após a última foto; ao atingir três, fica oculta. O label permanece no singular, o texto de apoio se refere à evolução do aluno e a biblioteca mantém a seleção de uma imagem por vez. A seleção segue o frame `FVzOO` da MUV-27, com contagem e miniaturas em duas colunas; cada imagem reutiliza o componente `CfWyw`. Uma foto ocupa toda a largura de sua coluna, sem se expandir por toda a seção; sua altura acompanha a proporção real, sem faixas laterais ou corte do corpo. A terceira inicia uma nova linha. A amostra do canvas tem proporção 1:2 por foto: 173 × 346 dp em 390 dp, 138 × 276 dp em 320 dp e 193 × 386 dp em 430 dp; outras imagens devem preservar suas próprias proporções.

As 13 telas do professor com upload são `yFUlq`, `bCfoT`, `iKraZ`, `UN17U`, `iRPXB`, `veT0i`, `FrRS5`, `AxLAp`, `SK17R`, `eKD5z`, `o6D0v`, `l18Mce` e `xou7B`. As adaptações de 320 e 430 dp redimensionam também a borda tracejada do componente. `SK17R` e `eKD5z` mantêm o upload visível e desabilitado; `EZXQt`, com três fotos, permanece sem upload. Histórico, detalhes e visores de leitura não recebem a ação.

Cada miniatura tem o rótulo Foto N abaixo da imagem e o X de remoção dentro dela, no canto superior direito, com círculo verde sólido de 28 dp e ícone branco de 16 dp, sem transparência. A área de toque de 48 dp é transparente e não aumenta o círculo visível. O label acessível Remover foto N identifica a ação sem criar um botão largo. A remoção atua somente antes do envio; retirar a última foto volta à apresentação sem fotos. Durante envio e sucesso, o ícone e a ação de adicionar ficam desabilitados; o X permanece legível em verde escuro sobre fundo de ação desabilitada, sem redução de opacidade. A orientação de toque para conferir, presente no símbolo do aluno, fica oculta nesta instância porque este card não introduz um visor de fotos.

Esse limite de três é do formulário atual; o schema compartilhado aceita até seis URLs. Esta entrega não altera nenhum desses contratos e não replica o requisito novo de fotos sem limite do fluxo do aluno na MUV-27. Não criar câmera, seleção múltipla simultânea ou um visor de conferência neste card.

### Envio e feedback

Preservar a sequência: validar dados antes do upload → enviar fotos selecionadas → validar payload com URLs → criar avaliação → invalidar histórico do aluno e resumo do professor → confirmar sucesso → retornar às avaliações.

Durante envio e sucesso, os campos, as ações de fotos, o retorno contextual e salvar estão desabilitados. Salvando avaliação... mantém a largura do botão e apresenta progresso. Avaliação salva! é feedback transitório no mesmo formulário, com retorno automático após os 150 ms atuais; não criar tela permanente de sucesso nem ação Continuar.

Falha de formato, upload ou salvamento mantém valores e fotos. As mensagens atuais são específicas para formato e upload, e genéricas para salvamento; o design não infere outras causas. Não prometer que nenhum registro foi criado quando a operação falha: uma falha de invalidação após a criação também pode cair no erro de salvamento. Não adicionar garantia de idempotência, fila offline, rascunho persistente ou confirmação de saída.

## Ergonomia e verificação

Em 08/10/2026, a verificação dos 25 quadros de lista/detalhe identificou 12 estados com reload oculto ou sem apresentação desativada durante a consulta. Os headers foram ajustados em `BYEGy`, `w11Iq`, `OWLNM`, `NKmVg`, `KceG0`, `F0pc1F`, `W1qNOs`, `kqQcX`, `kThhD`, `HV4GL`, `d3nI8` e `ABuvm`. Os dois erros iniciais perderam Tentar novamente no corpo e passaram a orientar recuperação pelo header. Seis capturas de loading, erro e contexto indisponível foram conferidas; a leitura final confirmou os 25 headers visíveis, nenhum retry duplicado e preservação de Tentar carregar mais na paginação. O guia `ggVdz` acompanha a composição. Este ajuste é de design; implementação nativa e salvamento do Pen permanecem separados.

Referências de 320/390/430 dp mantêm navegação, labels e unidades. Texto pode quebrar e componentes crescem verticalmente; os quadros expandidos não definem altura de dispositivo. Safe areas e inset da tab bar devem ser consumidos uma única vez pelo shell.

`NIy9m` representa um recorte do formulário com Peso em foco e um teclado decimal ilustrativo. A anotação do teclado é orientação do canvas, não texto do produto. Os campos seguintes continuam no mesmo formulário por rolagem; aparência, altura e teclas são definidas pelo sistema. Validar foco visível, área útil e acesso aos controles na implementação.

A revisão visual e estrutural usa capturas do canvas e leituras pelo MCP. O diagnóstico `ctx.bounds` registra divergências em árvores de flex layout e instâncias; esses alertas não comprovam clipping e devem ser confrontados com as capturas. Não declarar geometria limpa apenas a partir do diagnóstico.

Testes, lint, typecheck e build do Expo não se aplicam à entrega exclusivamente de design. Navegação real, leitor de tela, estados acessíveis, teclado, fonte ampliada, gestos e comportamento Android/iOS precisam ser verificados na MUV-39.

### Evidência final — 2026-10-06

A revisão independente inicial inspecionou as 43 capturas: 41 telas, o catálogo `foWU5` e o contrato `ggVdz`. O parecer favorável não identificou a divergência da composição de fotos apontada posteriormente pelo usuário. Essa divergência foi corrigida nos oito quadros abaixo; o parecer inicial não serve como aprovação da composição de fotos substituída. A revisão inicial cobriu 320/390/430 dp, estados de consulta, paginação de 25 itens, checagem de identidade, primeira falha em mensagem global, IMC somente leitura, seleção de até três fotos e schema de até seis URLs, além da sequência de upload, criação, invalidação e sucesso transitório de 150 ms. O mundo visual continua definido pela foundation MUV-24; esta entrega documenta sua extensão.

A leitura determinística pelo MCP após a correção de fotos contou 43 frames e 435 referências de instâncias, sem placeholders ou escapes Unicode. O diagnóstico inicial `ctx.bounds` produziu 397 alertas em árvores de flex layout e referências; as capturas não confirmaram esses alertas como problemas visuais. Esse resultado não permite declarar a geometria automaticamente limpa.

Os sete pares medidos de contraste foram: texto primário/papel (11,88:1), secundário/papel (4,81:1), texto/CTA (10,21:1), campo/branco (12,98:1), texto desabilitado/fundo (4,54:1), erro/fundo (5,79:1) e sucesso/fundo (5,44:1). A medição é uma amostra, sem equivaler a uma auditoria completa de acessibilidade.

O handoff foi verificado como UTF-8 válido, sem escapes Unicode, marcadores de trabalho pendente ou espaços ao fim das linhas; `git diff --check` passou. O parecer independente cobre o design do canvas aberto e não confirma implementação ou persistência do Pen. A aprovação inicial do usuário e a correção solicitada depois foram registradas acima. O salvamento permanece sob responsabilidade do usuário; o código Expo está intacto.

### Correção da composição de fotos — 2026-10-06

O feedback do usuário identificou fotos grandes empilhadas e botões largos de remoção que não seguiam o design anterior. A correção substituiu essa composição por instâncias conectadas de `FVzOO` em `FrRS5`, `AxLAp`, `SK17R`, `eKD5z`, `EZXQt`, `iKraZ`, `veT0i` e `xou7B`, preservando os IDs das telas. A referência visual é a seção `JZwgP` da tela `hnvnM` da MUV-27.

A leitura pelo MCP confirmou um componente `FVzOO` e nenhum botão largo de remoção em cada um dos oito quadros. `EZXQt` mantém três fotos e não apresenta adicionar; os outros sete mantêm uma foto. As colunas têm 173 dp em 390 dp e 138 dp em 320 dp, com gap de 12 dp. Campos, feedbacks, limite de fotos e contratos de envio foram preservados; o salvamento da correção no Pen permanece com o usuário.

A nova revisão independente inspecionou os oito quadros completos, suas seções de fotos e as referências `FVzOO`/`JZwgP`. O parecer foi favorável à correção, sem defeito visual bloqueante: composição consistente com a referência, terceira foto em nova linha, controles visualmente desabilitados em envio e sucesso e seção sem corte em 320 dp. Os quadros completos foram a evidência principal, pois alguns recortes isolados apresentaram diferenças de renderização. O parecer se limita à composição visual corrigida e não confirma comportamento nativo ou persistência do arquivo.

### Ajuste compartilhado do X — 2026-10-06

Por solicitação posterior do usuário, o componente original `FVzOO` foi alterado para posicionar o X dentro da imagem e tornar a ação claramente visível. Os três controles foram movidos para suas respectivas miniaturas, preservando os IDs, o tamanho de toque de 48 dp e a proporção das fotos. A mudança se propagou às 16 instâncias conectadas da MUV-27 e da MUV-30. A leitura das árvores resolvidas confirmou os controles dentro das imagens e opacidade 1 em todas as instâncias, incluindo envio e sucesso, que mantêm a remoção bloqueada. Capturas do componente e de instâncias de aluno, professor e 320 dp confirmaram a composição. Esse ajuste posterior foi verificado diretamente no canvas e não está coberto pelo parecer independente anterior. O salvamento do Pen permanece com o usuário.

Após novo feedback, o círculo visível foi reduzido para 28 dp e o X para 16 dp. As faixas laterais foram retiradas: a altura das miniaturas acompanha a proporção da amostra e a foto preenche toda a coluna, mantendo o corpo inteiro e o X sobre a área fotografada. A correção continua no componente compartilhado e nas adaptações de 320/430 dp, sem alterar contagem, seleção ou regras de envio.

### Revisão global da propagação de fotos — 2026-10-06

A varredura de todas as imagens do documento identificou 35 telas com fotos de avaliação e dois catálogos de componentes, incluindo instâncias aninhadas e quadros ocultos. São 17 telas de seleção, 16 de histórico/detalhe e dois visores. As demais imagens do documento são capas de demonstração de exercícios e não usam esse padrão de avaliação.

A divergência de seleção estava em `ZCD1f`: sua instância `Q2oZe` usa `p5TUr`, um componente separado de `FVzOO`, que ainda tinha altura de 210 dp e remoção abaixo da foto. As oito miniaturas do componente original `p5TUr` receberam altura de 346 dp para a amostra em colunas de 173 dp, X de 16 dp dentro de círculo de 28 dp sobre a imagem e alvo transparente de 48 dp. Os IDs das fotos e controles foram preservados. A contagem de oito, a seleção extensa do aluno e a ação Adicionar fotos permanecem conforme a MUV-27.

As 17 telas de seleção verificadas são `e34lmL`, `SDrcx`, `EjRT9`, `S1DV3j`, `TwkHx`, `cs4M7`, `I887G`, `hnvnM`, `ZCD1f`, `iKraZ`, `EZXQt`, `veT0i`, `FrRS5`, `AxLAp`, `SK17R`, `eKD5z` e `xou7B`. A inspeção visual cobriu suas seções de fotos; recortes com diferenças de renderização foram conferidos nos quadros completos. A leitura das árvores resolvidas não encontrou remoção fora da imagem, ícones em tamanho antigo ou redução de opacidade nos controles de seleção visíveis. Foram preservadas as diferenças de cor dos estados de envio/sucesso.

As 16 telas de histórico/detalhe foram verificadas estruturalmente: `R8DMP`, `xQCvZ`, `E8gHIE`, `d5Owa`, `Eyq0q`, `cN2h4`, `SdMyc`, `wD6Ex`, `GjYM3`, `jbrY4`, `vg801`, `vEb96`, `ABuvm`, `P5Bqm`, `DdIMn` e `rMgrq`. Elas exibem fotos registradas sem ação de remover; seus enquadramentos de leitura foram preservados. Os visores `bUVFV` e `j5Le78` mantêm a imagem ampliada e a navegação própria. A revisão é do design no canvas; não confirma implementação nativa nem persistência. O salvamento permanece com o usuário.

### Espaçamento externo após o ajuste das fotos — 2026-10-06

A revisão das fotos não verificou inicialmente a ocupação externa dos quadros no canvas. O crescimento das miniaturas aumentou as alturas dos formulários e produziu três interseções entre quadros raiz: `EjRT9`/`vg801` (36 dp), `S1DV3j`/`I887G` (18 dp) e `ZCD1f`/`RqlBV` (220 dp). A correção reposicionou os nove quadros da última linha da MUV-27 de y = 37950 para y = 38200; `ZCD1f` também passou de x = 2880 para x = 4320, à direita dos visores. Nenhum quadro foi redimensionado e o conteúdo interno permaneceu intacto.

A nova comparação dos retângulos globais dos 265 quadros raiz não encontrou interseções. Após qualquer mudança em componente que altere a altura de suas instâncias, verificar também o espaço ocupado pelas telas no canvas, incluindo a linha seguinte e os catálogos de outros cards; a inspeção isolada de uma tela não cobre esse risco. O salvamento permanece com o usuário.

### Compactação da organização da MUV-30 — 2026-10-06

Por solicitação do usuário, as 41 telas da MUV-30 foram aproximadas no canvas. A organização conserva as seis linhas, a ordem e as colunas existentes; o intervalo fixo de 4100 dp entre o início de cada linha foi substituído por 180 dp após o quadro mais alto da linha anterior. A primeira linha também começa 180 dp abaixo do catálogo de componentes. Catálogo, contrato e conteúdo interno das telas foram preservados. A área vertical ocupada pelas telas caiu de 23094 para 13533 dp, aproximadamente 41% menor.

A leitura após o reposicionamento confirmou as 41 posições previstas, nenhuma alteração de dimensões e nenhuma interseção entre os 265 quadros raiz do documento. O salvamento permanece com o usuário.
