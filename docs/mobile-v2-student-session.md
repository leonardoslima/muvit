# Aluno — sessão guiada v2 · MUV-26

A entrega de design está em `assets/design/mobile.pen`, editada pelo MCP pen.dev. Completa o fluxo da sessão guiada usando a direção A e a foundation da MUV-24, descrita em `docs/mobile-v2-foundation.md`. A implementação pertence à MUV-36; esta entrega não altera código Expo, API, storage, journal ou regras de negócio.

## Quadros

As 35 telas originais começam em y=21760, em sete colunas e cinco linhas. A extensão aprovada de demonstração tem dez telas a partir de x=2880, y=29045, com a segunda linha em y=30165, totalizando 45 telas. O quadro de preparação do próximo exercício `Z4qiJX` fica em x=3840, y=30165. O guia `tnkmS` fica em x=3500, y=21760. Os nomes dos quadros e esta tabela identificam os estados; metadados herdados de cópias não devem orientar a implementação.

| Tela/estado | Node ID |
| --- | --- |
| Série — primeira, com valores digitados | `Zdwrv` |
| Série — referência anterior | `G1DF1d` |
| Descanso — em andamento | `Y37JQ` |
| Descanso — tempo zerado | `mtxt9` |
| Avanço — exercício concluído | `wu584` |
| Série — última do treino | `COILC` |
| Finalização — pronta | `SMZP4` |
| Resumo — sincronizado | `jt5lm` |
| Resumo — sincronização pendente | `e9moq` |
| Resumo — falha ao remover rascunho | `OE8Ju` |
| Finalização — em andamento | `LukrI` |
| Finalização — erro e retry | `jTKKd` |
| Próximo exercício — primeira série | `KBiXJ` |
| Retomada — série preservada | `XvAak` |
| Retomada — descanso em andamento | `NfmpI` |
| Retomada — descanso expirado | `WZfoX` |
| Retomada — exercício concluído | `RIPX8` |
| Retomada — pronta para finalizar | `zXQvi` |
| Série — registrando | `MJDGS` |
| Série — falha ao salvar progresso | `D76TD` |
| Série — falha ao avançar | `J225Zp` |
| Saída segura — decisão | `a3DQOn` |
| Saída segura — salvando | `q46Q3` |
| Saída segura — falha ao salvar | `L7h41Y` |
| Saída segura — descartando | `bKKKM` |
| Saída segura — falha ao descartar | `efcbW` |
| Carregamento — sem dados | `E4F2R8` |
| Carregamento — erro sem dados | `WN4Vz` |
| Carregamento — retry em andamento | `dk6D5` |
| Conclusão local — entrada repetida | `hmknp` |
| Adaptação — série em 320 dp | `ZGhII` |
| Adaptação — série em 430 dp | `n6C6X` |
| Adaptação — nome longo e fonte ampliada em 320 dp | `P36u7N` |
| Série — repetições ainda não informadas | `SigiQ` |
| Edição direta — teclado e foco | `uDcRQ` |
| Demonstração — pronta, aberta da série | `Yvlq4` |
| Demonstração — carregando | `xDF4S` |
| Demonstração — erro e retry | `O0OX1` |
| Demonstração — indisponível offline | `sQ123` |
| Demonstração — sem mídia cadastrada | `GB9Tc` |
| Demonstração — durante descanso | `gJW7e` |
| Demonstração — descanso expirado | `hMEyh` |
| Demonstração — 320 dp | `tRsEL` |
| Demonstração — em reprodução | `PsC4Y` |
| Demonstração — preparação do próximo exercício | `Z4qiJX` |

## Fluxo série a série

A sessão usa `/session/:dayId`. Início, visão geral e a ação de retomada em Hoje permanecem sob o contrato da MUV-25. As cinco fases existentes em `apps/mobile/src/application/workouts/guided-session.ts` são a autoridade das transições:

1. **`set`:** apresentar exercício, prescrição, série atual e valores realizados. **Concluir série** registra os valores e a série; enquanto processa, impedir novas ações concorrentes.
2. **`rest`:** entre séries do mesmo exercício, mostrar o tempo restante, **+15 s** e **Pular descanso**. A extensão adiciona 15 segundos ao horário de término existente. Pular avança para a próxima série. Em 00:00, permanecer nesta fase e conservar as ações; não avançar automaticamente nem criar nova fase.
3. **`exercise-complete`:** a última série de um exercício, quando há outro, apresenta a confirmação do exercício e a prescrição do próximo. **Próximo exercício** abre sua primeira série. Não inserir descanso adicional entre exercícios.
4. **`ready-to-finish`:** a última série do último exercício apresenta **Pronto para finalizar**. Todas as séries registradas e progresso de 100% não equivalem à conclusão do treino. **Concluir e finalizar treino** executa a conclusão existente.
5. **`summary`:** depois de registrar a conclusão, apresentar duração, exercícios, séries, volume e **Voltar ao início**. Não criar histórico, novas métricas ou edição retrospectiva das séries.

O progresso representa exercícios cujas séries foram concluídas, não séries/total. A referência anterior é a última série concluída do mesmo exercício nesta sessão; não é o último treino histórico. A primeira série não apresenta referência anterior.

Os exemplos usam Treino A: Supino reto, 3 séries de 10 repetições, carga de 40 kg e descanso de 60 s; Crucifixo inclinado, 3 séries de 12 repetições, carga de 16 kg e descanso de 45 s. Os valores realizados nos quadros preenchidos representam digitação pelo aluno, sem definir preenchimento automático. `SigiQ` representa repetições inicialmente vazias. O resumo é ilustrativo: 12 minutos, 2 exercícios, 6 séries e 1.776 kg de volume. A duração real vem dos intervalos ativos da sessão e exclui o período entre salvar/pausar e retomar.

## Saída e retomada

- Fechar pelo header, voltar Android e gesto de voltar na sessão usam a mesma proteção de saída enquanto houver rascunho ativo. Fora de tela cheia, retornar da demonstração leva à fase preservada, sem oferecer saída segura. Quando a mídia está em tela cheia, sair primeiro da apresentação ampliada e permanecer na demonstração. Sem rascunho ativo, a navegação segue normalmente. Na conclusão/resumo, voltar não oferece descartar ou retomar.
- **Continuar treinando** fecha a confirmação e preserva a sessão. O fechamento permitido da confirmação também corresponde a continuar; não encerra o treino.
- **Salvar e sair** pausa e persiste a sessão antes de executar a navegação pendente, ou retornar a Hoje quando não há ação pendente. Se falhar, permanecer na confirmação com o aviso e as ações disponíveis após liberar a operação.
- **Descartar treino** é a apresentação v2 da ação existente **Encerrar treino**: remover o rascunho e abandonar o progresso parcial. Não enviar uma conclusão nem adicionar outra confirmação. Durante o descarte, as outras ações ficam indisponíveis; falha conserva a confirmação e permite tentar novamente.
- Retomar restaura o snapshot particionado por aluno/dia antes de depender da rede. A tela acompanha a fase recuperada: série, descanso, exercício concluído ou pronta para finalizar. Valores, índices e séries concluídas não reiniciam. As mensagens de retomada descrevem a recuperação existente e não criam uma etapa de confirmação ou uma nova fase.
- O descanso restaurado conserva o horário original. Se esse horário passou, mostrar 00:00 com as mesmas ações. Não reiniciar o descanso nem descontar automaticamente o período salvo do horário de término.

## Feedback e persistência

Loading, erro sem dados, retry e conclusão local já registrada usam StatePanel na área principal, sem superfície própria de card. O header oferece saída normal nessas entradas sem rascunho ativo. Erros com sessão carregada preservam conteúdo, valores e a ação correspondente; não substituir a sessão por um estado global.

Falha de salvamento apresenta aviso contextual e não confirma que o progresso está seguro. Falha de ação mantém a fase real e permite repetir a ação existente. O exemplo `J225Zp` cobre a apresentação do erro de ação; o mesmo padrão vale para descanso e avanço, usando a mensagem real do controlador. Erro ao finalizar usa **Tentar novamente**, ligado à conclusão existente, sem criar sessão ou registro duplicado.

O resumo **sincronizado** acompanha o journal em estágio terminal. **Sincronização pendente** confirma somente a persistência local, conserva as métricas e permite voltar ao início. Não oferecer sincronização manual, badge de conectividade ou confirmação de servidor sem suporte no controlador. Retomada offline usa o snapshot; iniciar uma sessão sem dados locais continua dependendo do loader existente.

Falha ao remover o rascunho depois de concluir não desfaz a conclusão. Manter o resumo e a informação de salvamento, com aviso contextual; não permitir reabrir ou finalizar novamente o treino. Uma entrada repetida bloqueada pelo journal usa `hmknp`, sem reconstruir métricas que o controlador não disponibiliza nessa entrada.

## Demonstração durante a sessão

Decisão aprovada pelo usuário em 2026-10-01, depois de pesquisa dos concorrentes e das referências no Notion: disponibilizar **Ver execução** junto à prescrição do exercício em foco e ao contexto do descanso. A ação secundária tem ícone de reprodução e alvo mínimo de 48 dp. A consulta é opcional e não compete com a conclusão da série. No avanço, a ação pertence ao próximo exercício mostrado no card, sem antecipar a transição da sessão.

A ação reutiliza a tela própria do exercício da MUV-25 e o componente `RL1fy`, com vídeo, prescrição e observação quando cadastrada. A tela se abre no contexto da sessão, sem autoplay. O retorno usa **Voltar à série** em `set`, **Voltar ao descanso** em `rest` e **Voltar ao treino** em `exercise-complete`. O estado sem mídia conserva a prescrição e as observações, sem oferecer reprodução. Durante `busy`, o acesso fica indisponível. O quadro de teclado continua priorizando o campo focado e o registro; o acesso faz parte da composição completa do exercício.

Abrir a demonstração não executa salvar/sair, descarte, pausa, conclusão ou avanço. Fora de tela cheia, voltar pelo header, gesto ou botão Android interrompe a mídia e restaura a mesma fase, exercício, série, posição de rolagem e valores em edição, inclusive os que ainda não foram registrados. Não recarregar a sessão nem reconstruir seu controlador ao abrir/fechar a mídia. Preservar também valores vazios; a consulta não registra uma série nem transforma os exemplos preenchidos em valores iniciais. Ao abrir, o foco acessível vai para o título; ao voltar, retorna à ação **Ver execução** do exercício consultado. O nome acessível da ação inclui o nome do exercício.

O descanso continua usando o horário original enquanto a demonstração está aberta. O contexto acompanha o tempo restante; se expirar, mostrar 00:00 e retornar à fase `rest` com **+15 s** e **Pular descanso**, sem iniciar automaticamente a série seguinte. A consulta permanece dentro do tempo ativo da sessão; não equivale a salvar e pausar. Na fase `exercise-complete`, a demonstração pertence ao próximo exercício apresentado no card. `Z4qiJX` mostra o Crucifixo inclinado enquanto a confirmação do Supino reto permanece como origem. **Voltar ao treino** conserva essa confirmação e a ação **Próximo exercício**, sem abrir a primeira série antecipadamente.

Reprodução, pausa, busca, áudio e tela cheia usam controles nativos acessíveis e compatíveis com o formato recebido. A mídia começa pausada; o exemplo de reprodução usa áudio desativado. Os controles de `PsC4Y` ilustram a função e os alvos de toque, não um player customizado nem a aparência obrigatória do player nativo. Em tela cheia, o primeiro voltar fecha a apresentação ampliada e permanece na mesma demonstração; depois, voltar retorna à origem na sessão. Sair da demonstração interrompe sua reprodução. As capas existentes são imagens de design da MUV-25, sem arquivo de vídeo associado.

Carregamento, erro com **Tentar novamente**, indisponibilidade offline e ausência de mídia preservam o contexto e o retorno à sessão. Retry refaz somente a mídia e bloqueia reentrada enquanto aguarda; não refaz o treino ou seus registros. Falha de mídia não bloqueia o registro das séries. O snapshot offline da sessão não garante cache de vídeo: reproduzir offline apenas quando houver mídia local disponível; caso contrário, usar `sQ123`. Respeitar o formato real recebido, inclusive GIF quando aplicável.

### Referências da decisão

- [PRD no Notion](https://app.notion.com/p/32254a606c3781deae5cc4258140ef18): seção 2.1, vídeo/GIF demonstrativo como P0; seção 4.1, `Exercises.video_url`; seção 7.1, demonstrações desde o primeiro dia. O PRD prevê a mídia, sem determinar sua disposição durante a sessão.
- [Análise BeFit × Muvit no Notion](https://app.notion.com/p/3e354a606c3781c4a4ddefc0234cb2b8): destaca a execução na academia, registro por série, descanso e edição rápida. É uma referência exploratória, sem definição específica de vídeo na sessão.
- [Stronglifts](https://support.stronglifts.com/article/129-videos): demonstração acessível pelo exercício durante o treino e instrução mais longa na área de técnica.
- [Fitbod](https://help.fitbod.me/hc/en-us/articles/30721437384215-How-to-Navigate-the-Exercise-Details-Screen): detalhes abertos do treino, vídeo no topo e reprodução por toque; o artigo também informa indisponibilidade de vídeo offline.
- [Hevy — biblioteca](https://www.hevyapp.com/features/exercise-library/) e [registro do treino](https://www.hevyapp.com/features/track-workouts/): animação nos detalhes e links de instrução acessíveis durante o registro.
- [BeFit — descrição do desenvolvedor na App Store](https://apps.apple.com/br/app/befit-plano-e-treino-academia/id6504535443): biblioteca com vídeos e instruções; a fonte consultada não esclarece a posição exata do vídeo na sessão.

A pesquisa foi feita em documentação pública, sem teste prático dos concorrentes. A disposição e as regras de continuidade acima são decisões do Muvit aprovadas nesta conversa.

## Reutilização, adaptação e acessibilidade

Header `EyQ6K`, progresso `wkcvs`, exercício `n83VQ`, repetições `Wbi6r`, carga `nE3zB`, sheet `A571l`, demonstração `RL1fy`, botões, mensagens e StatePanels são instâncias conectadas da foundation. Overrides adaptam conteúdo, composição, tamanho e apresentação imersiva; não alteram os componentes originais, as telas MUV-23/MUV-24 ou os quadros MUV-25. A extensão aprovada acrescenta o acesso à demonstração dentro da sessão, com retorno próprio ao contexto preservado.

DM Sans, paleta imersiva e tokens existentes permanecem. A sessão não usa tab bar nem introduz dark mode global. Carga e repetições mantêm os alvos de 48×48 dp e passos de 1 kg/1 repetição; o centro é editável por teclado decimal/numérico. O passo não redefine os valores aceitos por API/validators e o design não adiciona validação, limites ou obrigatoriedade de preenchimento.

Campos empilham em 320 dp e quando a escala de texto exige. Os textos quebram e os quadros crescem com o conteúdo. `P36u7N` combina nome longo, aumento aproximado de 30% nos textos do app e campos empilhados, preservando alvos de toque. Na composição compacta, o nome longo usa título de 20 sp antes da escala do sistema, representado por 26 sp em `WqarY`; mantém largura disponível, quebra natural, nome completo e altura automática, sem reduzir a escala escolhida pelo usuário para forçar uma linha. `uDcRQ` mostra a edição com foco e uma área neutra reservada ao teclado nativo, sem teclas desenhadas pelo app. A borda, os textos dessa área e os 240 dp são anotações do design, não elementos da interface nem altura fixa do teclado. A MUV-36 deve solicitar teclado decimal/numérico nativo, usar os insets reais do IME, rolar para o campo focado e preservar a ação principal acessível. A aparência do teclado é definida pelo sistema e pelo teclado escolhido pelo usuário.

As barras de status, os 62 dp superiores e o espaço inferior dos quadros são referências visuais. O runtime aplica safe areas e insets reais, permite rolagem e reserva teclado/inset uma única vez. A altura variável dos quadros não é altura fixa de uma tela nativa. Durante operações, o botão mostra andamento, preserva largura e bloqueia reentrada; campos, saída e ações concorrentes respeitam `busy`. Nomes acessíveis distinguem diminuir/aumentar, edição direta, série e exercício; erros, sucesso e sincronização incluem texto, sem depender somente de cor.

## Verificação e limites

A verificação desta entrega é do artefato de design: capturas MCP, conteúdo, vínculos de instâncias, transições, cobertura dos estados críticos e checagens de documentação/Git. O arquivo contém telas estáticas e guia de transições, não um protótipo navegável.

A revisão independente inicial inspecionou uma rodada de capturas MCP das 35 telas originais e do guia `tnkmS` e concluiu **SHIP para o design**, sem problemas materiais. Essa avaliação antecede a extensão de demonstração. Os contratos de pausa, descanso, retomada e finalização pelo journal permaneceram preservados. O estado `SigiQ`, com repetições vazias, e a identificação dos quadros preenchidos como exemplos digitados distinguem o estado inicial dos exemplos de uso.

A checagem inicial via MCP confirmou 35 telas, o guia e 172 instâncias conectadas, sem placeholders nem escapes Unicode nos textos inspecionados. O arquivo `.pen` foi salvo e sua persistência confirmada no diff Git. `git diff --check` passou sem erros. A verificação da extensão é registrada separadamente abaixo.

Na extensão aprovada em 2026-10-01, as nove telas de demonstração foram inspecionadas por captura MCP, incluindo reprodução, falha, offline, ausência de mídia, descanso em andamento/expirado e largura de 320 dp. Também foram capturados os acessos na série, descanso, avanço, registro em andamento, saída segura e adaptações em 320/390/430 dp e com texto ampliado. As capturas conferidas não apresentaram problemas materiais de layout. A checagem estrutural confirmou 44 telas e o guia, 194 instâncias diretas, ausência de placeholders e escapes Unicode nos textos e ausência de sobreposição entre os quadros MUV-26. As referências dentro das substituições de descendentes não entram na contagem de instâncias diretas. A extensão recebeu revisão do próprio agente; a revisão independente inicial não foi reaplicada a ela.

O salvamento da extensão no arquivo original foi confirmado pelo editor sem indicador de alterações pendentes, pela atualização do arquivo em disco e pelo diff Git. `git diff --check` e a busca de escapes Unicode na documentação passaram. Essas verificações antecederam a finalização Git e a atualização do card; a integração aprovada em `develop` é local, sem publicação remota.

Na segunda revisão solicitada pelo usuário, duas avaliações somente leitura conferiram separadamente UX/visual e contratos/estrutura do snapshot de 44 telas. A avaliação visual capturou as 44 telas e o guia, sem defeitos materiais. A avaliação de contratos identificou uma inconsistência documental de baixa severidade: faltava definir o rótulo de retorno da demonstração aberta em `exercise-complete`. A correção explicita **Voltar ao treino** e adiciona `Z4qiJX`; também esclarece a precedência de retorno quando a mídia está em tela cheia. O quadro novo e a seção corrigida do guia foram recapturados na checagem independente direcionada, sem inconsistências ou clipping observado. A checagem estrutural final confirmou 45 telas e o guia, 196 instâncias diretas, nenhum placeholder, escape Unicode ou sobreposição entre quadros MUV-26. O detector de markup não se aplica ao arquivo `.pen`; a inspeção do artefato foi feita exclusivamente pelo MCP.

No ajuste direcionado de 2026-10-03, o título longo de `WqarY` passou de 36 para 26 sp na variante compacta com texto ampliado; sua altura calculada em 320 dp passou de 235 para 99 dp, preservando o nome completo. As teclas desenhadas em `uDcRQ` foram substituídas pela indicação neutra da área do teclado nativo. Os dois quadros foram recapturados pelo MCP e não reportaram clipping nos bounds inspecionados. A validação funcional com teclado real e escala do sistema continua na MUV-36.

Seis pares pontuais de texto/fundo tiveram contraste medido entre 6,17:1 e 17,09:1: texto e apoio no fundo imersivo, apoio na superfície imersiva, verde profundo sobre lima, erro sobre branco e aviso sobre sua superfície clara. Essas medições não abrangem todas as combinações ou estados e não constituem auditoria completa de acessibilidade.

Testes, lint, typecheck e build Expo não se aplicam a este diff de design. Leitor de tela, comportamento do teclado, gestos de saída, escala de fonte do sistema e evidência Android/iOS devem ser validados na MUV-36. As amostras de adaptação não constituem aprovação nativa.
