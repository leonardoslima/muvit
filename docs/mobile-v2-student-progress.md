# Aluno — progresso e avaliações v2 — MUV-27

A fonte visual é `assets/design/mobile.pen`, editada pelo MCP pen.dev. Esta proposta estende a direção A e a foundation do MUV-24. O design foi aprovado pelo usuário em 2026-10-04 para commit e integração local na `develop`. A implementação pertence ao MUV-37; esta entrega não altera código Expo, API, validação, perfil ou autenticação. Na revisão de 2026-10-03, o usuário definiu seleção de fotos sem limite de quantidade, com conferência visual antes do envio. Esse requisito novo está representado no design e depende de adequação funcional separada, pois difere dos contratos atuais.

## Onde encontrar

Os componentes de avaliação começam em y=31129 e os de fotos em y=31049; as telas começam em y=32450. Cada tela é um frame independente. Os registros, datas, medidas e fotos nas amostras são ilustrativos.

| Tela ou quadro | Node ID |
| --- | --- |
| Componentes de avaliação | `XCKBa` |
| Componentes de fotos e orientação de implementação | `JXm9A` |
| Fluxo e contrato de implementação | `H02fJG` |
| Progresso — histórico | `R8DMP` |
| Progresso — uma avaliação | `xQCvZ` |
| Progresso — dados parciais | `E8gHIE` |
| Progresso — sem alteração | `d5Owa` |
| Progresso — variação a mais | `Eyq0q` |
| Progresso — informações já registradas | `SdMyc` |
| Progresso — registro sem medidas | `wD6Ex` |
| Progresso — carregando | `lECTq` |
| Progresso — nenhuma avaliação | `Y8WrQ1` |
| Progresso — erro sem dados | `Fbjmz` |
| Progresso — tentando novamente | `s7tXs` |
| Progresso — erro de atualização com dados | `cN2h4` |
| Nova avaliação — formulário vazio | `YQWga` |
| Nova avaliação — dados preenchidos | `pXdSR` |
| Nova avaliação — foto adicionada | `e34lmL` |
| Nova avaliação — uma foto selecionada | `hnvnM` |
| Nova avaliação — seleção extensa de oito fotos | `ZCD1f` |
| Conferir foto inteira antes do envio | `bUVFV` |
| Conferir foto registrada | `j5Le78` |
| Nova avaliação — salvando | `SDrcx` |
| Nova avaliação — erro ao salvar | `EjRT9` |
| Nova avaliação — sucesso transitório | `S1DV3j` |
| Nova avaliação — foco e teclado | `I887G` |
| Progresso — 320 dp | `GjYM3` |
| Progresso — 430 dp | `jbrY4` |
| Nova avaliação — 320 dp | `TwkHx` |
| Nova avaliação — 430 dp | `cs4M7` |
| Observações longas — 320 dp | `vg801` |

## Hierarquia e componentes

Progresso mantém o shell do aluno e a navegação Hoje/Progresso/Perfil, com Progresso selecionado. O título e o contexto precedem a ação **Nova avaliação**; o histórico agrupa cada registro por data, medidas e observações. Nova avaliação usa o header contextual de retorno, sem tab bar.

As telas reutilizam instâncias conectadas da foundation: headers, tabs, campos, botões, mensagens e StatePanel. Os novos símbolos `t3pxeT` (`Card/Avaliação/Aluno`) e `A34fEL` (`Card/Avaliação/Medidas existentes`) ficam no quadro `XCKBa`. O segundo apresenta somente informações de leitura; não é um novo formulário nem uma nova rota. No quadro `JXm9A`, os símbolos `FVzOO`, `bY2Om` e `p5TUr` representam fotos selecionadas, registradas e uma seleção extensa.

O artefato conserva DM Sans, papel, verde profundo, lima, gutter de 16 dp e os demais tokens existentes. Botões têm 58 dp; controles de entrada têm pelo menos 52 dp. Labels e unidades permanecem visíveis. Texto secundário, estados e comparações não dependem apenas de cor.

## Progresso e histórico

A fonte atual é `GET /students/me/assessments?limit=20`, usada em `apps/mobile/src/screens/progress.tsx`. Preservar a ordem retornada, o escopo da identidade autenticada e o limite atual. Não introduzir filtros, paginação, metas, gráficos, pontuação, edição, exclusão ou navegação para detalhe.

- Datas dos registros aparecem em DD/MM/AAAA; números usam apresentação pt-BR.
- Peso e gordura corporal permanecem separados, com kg e %. Ausência de valor aparece como traço, nunca como zero.
- Comparar com o registro imediatamente seguinte da lista, somente quando os dois valores da métrica forem válidos. Sem referência anterior ou com dado ausente, omitir aquela comparação.
- Variação de peso usa kg; variação de gordura usa pontos percentuais. Usar **a mais**, **a menos** e **sem alteração** sem classificar o resultado como bom, ruim ou meta atingida.
- Observações aparecem apenas quando existentes e crescem sem truncamento.
- A amostra de informações existentes apresenta altura e as circunferências de `assessmentSchema`: peito, cintura, quadril, braços, coxas e panturrilhas direita/esquerda. Esses campos já são retornados pela API, embora a tela atual do aluno renderize somente peso, gordura e observações. A apresentação v2 é condicional aos valores recebidos; não calcula IMC, não cria métricas e não permite ao aluno preencher campos adicionais.
- Fotos retornadas com a avaliação aparecem como miniaturas no registro correspondente. Tocar uma miniatura permite conferir a imagem inteira, preservando sua proporção. O visor de leitura permite percorrer as fotos e retornar ao Progresso; não oferece remover anexos registrados, comparar corpos, editar, compartilhar ou baixar imagens.

Loading, vazio e erro sem dados ocupam a área principal, sem superfície própria de card. Marca, título, ação de avaliação e tabs permanecem visíveis. O erro oferece **Tentar novamente**, que refaz a consulta existente. O retry sem dados usa a apresentação de carregamento.

Se uma atualização falhar com dados já carregados, preservar o histórico e apresentar mensagem contextual com **Tentar novamente** integrado na mesma superfície de aviso, sem um botão separado abaixo. A tela `cN2h4` segue a composição de `fsBiz` e `ClZZn` do MUV-25: mensagem sem padding próprio dentro do aviso, ação de 48 dp sem borda ou cápsula e fundo compartilhado. A foundation do MUV-24 define o feedback; essa composição não altera a requisição. Não prometer cache offline persistente, fila de avaliações ou sincronização pendente: o fluxo atual de avaliações não oferece esses contratos.

## Nova avaliação

Preservar os campos atuais de `apps/mobile/src/screens/new-assessment.tsx`: data, peso, gordura corporal e observações. A data inicia com a data local atual e mantém entrada AAAA-MM-DD. Peso e gordura usam teclado decimal; vírgula continua aceita pela conversão existente. Observações usam entrada multiline. Os traços da amostra vazia representam ausência de conteúdo; não devem ser enviados como texto.

Somente a data é obrigatória no schema. Peso, gordura, observações e foto são opcionais. Os limites existentes permanecem: peso positivo até 500 kg, gordura entre 0 e 80%, observações até 2000 caracteres. O design não cria uma nova camada de validação local: a tela atual retorna mensagem genérica de falha, representada no estado de erro, e não oferece erros específicos por campo.

**Adicionar fotos** abre a biblioteca nativa para seleção múltipla. A seção de fotos mostra a quantidade selecionada e miniaturas de todas as imagens, em duas colunas. Novas seleções acrescentam fotos ao conjunto já escolhido; cancelamento mantém a seleção anterior. Tocar uma miniatura abre a imagem inteira, com indicação **Foto N de M**, ações anterior/próxima e retorno ao formulário sem perder os dados. Nas extremidades, a navegação indisponível deve ficar desabilitada; com uma só foto, não é necessário mostrar os controles de percurso.

A ação de remover atua somente na seleção ainda não enviada. Cada ação tem alvo de 48 dp e label acessível que identifica a foto. Remover atualiza a contagem e reorganiza a grade; retirar a última foto volta ao estado sem seleção. O label **Adicionar fotos** permanece disponível para incluir mais imagens. Não são exigidas poses ou quantidades específicas.

Não há teto de quantidade no design solicitado. Mais fotos criam novas linhas e rolagem, sem truncar a lista ou trocar os anexos por um contador de imagens ocultas. A amostra com oito fotos valida a apresentação de um conjunto maior; seus assets se repetem apenas como ilustração de layout. O produto deve representar cada imagem efetivamente selecionada.

Essa seleção múltipla, a conferência e a remoção da seleção são requisitos novos. Atualmente, `new-assessment.tsx` guarda uma foto, consome apenas `result.assets[0]` e `createAssessmentSchema` limita `photos` a seis. A implementação precisa adequar app, serviço de envio e contrato de validação/API antes de oferecer o comportamento sem limite. O MUV-27 apenas registra e desenha a orientação; não altera esses arquivos nem declara que a API atual aceita o novo fluxo. Suporte de arquivo, permissões e aparência do seletor devem ser resolvidos nessa implementação; o design não acrescenta câmera ou compartilhamento.

O envio conserva a sequência de upload dos anexos, criação da avaliação, invalidação da query de avaliações e confirmação de sucesso. O serviço atual precisa ser adequado para o conjunto selecionado. Durante o envio, as miniaturas permanecem visíveis e as ações de adicionar/remover fotos e salvar ficam desabilitadas. O botão de salvar exibe **Salvando avaliação...** com largura estável. O design não bloqueia os demais campos que o fluxo atual mantém editáveis.

No erro, preservar data, valores, observações e todas as fotos selecionadas; mostrar **Não foi possível salvar sua avaliação.** e permitir novo envio. Não inferir causa específica nem prometer idempotência, descarte ou salvamento offline. Como o fluxo existente inclui invalidação depois da criação, uma falha da operação completa não constitui prova de que nenhum registro foi criado.

**Avaliação salva!** é feedback transitório no mesmo formulário, com ações desabilitadas. Preservar o retorno automático existente ao Progresso; não criar tela permanente de sucesso ou ação adicional para continuar.

## Adaptação e implementação

As referências de 320/390/430 dp mantêm gutter, unidades e navegação. O histórico e as observações crescem verticalmente. Alturas do canvas mostram todo o conteúdo e não definem a altura do dispositivo: no runtime, usar rolagem e reservar insets reais uma única vez.

O quadro de foco inclui uma anotação da área de teclado nativo; esse texto não pertence à interface do produto. Aparência e altura do teclado são determinadas pelo dispositivo. Manter o campo focado visível e permitir alcançar as ações por rolagem, sem encobrir conteúdo.

Validar na implementação navegação de retorno, leitor de tela, labels/unidades, estado ocupado e desabilitado, escala de fonte, teclado, seleção múltipla e cancelamento da biblioteca, remoção de uma/última seleção, conferência da imagem inteira, ordem dos anexos e reentrada no envio. As amostras não são um protótipo navegável nem evidência de execução Android/iOS.

As fotos fictícias foram geradas com Imagegen e estão em `assets/design/assessment-photo-samples/assessment-views.png`; origem e prompt estão no README do diretório. O Pen usa recortes de fill sem modificar o bitmap. No runtime, usar as imagens reais escolhidas pelo usuário ou retornadas com a avaliação. Não há foto nem dado de aluno real nesses assets.

## Verificação do artefato

As 24 telas iniciais foram verificadas por capturas do MCP, com conferência de componentes, conteúdo e contratos. A revisão de fotos acrescenta quatro telas, totalizando 28, e traz 165 instâncias conectadas nas telas e quadros da proposta. A busca nos textos do canvas não encontrou escapes Unicode; `git diff --check` e a busca correspondente nos documentos também ficaram limpos. As flags de bounds do MCP apresentaram offsets divergentes da renderização, inclusive em descendentes desabilitados; não devem ser usadas isoladamente para declarar clipping ou ausência dele. Algumas capturas múltiplas mostraram somente fragmentos; os quadros afetados foram recapturados individualmente. A revisão visual e suas limitações são a evidência desta etapa.

Na revisão de fotos, as telas alteradas e as quatro novas representações foram conferidas por captura: seleção vazia, uma/três/oito fotos, envio, erro, sucesso, foco, 320/430 dp, fotos no histórico e conferência da imagem inteira. As miniaturas usam o asset local, sem imagens pendentes de geração. A gravação das alterações do canvas fica a cargo do usuário, conforme sua preferência.

A conferência dos 31 frames de topo do MUV-27 (28 telas, dois quadros de componentes e guia) não encontrou sobreposição ou placeholders ativos. Os contrastes pontuais calculados foram 4,81:1 para texto secundário sobre papel, 5,25:1 sobre branco e 10,21:1 para texto primário sobre lima. Esses pares não constituem auditoria completa de todos os estados.

Na conferência final de 2026-10-04, o MCP confirmou 31 frames, 165 instâncias, nenhuma sobreposição, nenhum placeholder ativo e nenhum escape Unicode no texto do canvas. A captura de `e34lmL` confirmou a apresentação das fotos selecionadas. Os documentos também passaram por `git diff --check` e busca de escapes Unicode antes do commit.

Testes, lint, typecheck, build e execução Expo não se aplicam a este diff de design. A aprovação visual foi recebida; a implementação e a validação nativa do MUV-37 permanecem pendentes.
