# Aluno — Hoje e visão geral v2 · MUV-25

A entrega de design está em `assets/design/mobile.pen`, editada pelo MCP pen.dev. Usa a direção A e a foundation da MUV-24, descrita em `docs/mobile-v2-foundation.md`. Não altera código Expo, contratos ou regras de negócio. A implementação pertence à MUV-35.

## Quadros

### Referência de Hoje no polimento MUV-9

As 16 variantes de Hoje e a tela Expo seguem a composição de `vIyJ8` (MUV-24): marca e identidade, saudação, título “Seu ritmo, seu dia.”, data, card de treino e lista com quantidade de exercícios. No app, a saudação usa o primeiro nome da sessão e o período do dia; a data é local. O card destaca o nome real do plano, mantém o dia na legenda e apresenta os grupos musculares abaixo. A ação mantém o texto centralizado e a seta à direita; a lista usa chevrons para abrir os detalhes existentes.

O cabeçalho acompanha o gutter da tela, sem o antigo padding horizontal adicional de 6 dp. Os paddings internos dos cards são preservados. Retomada, conclusão local, offline, loading e retry mantêm suas ações e feedbacks; essa adaptação visual não altera navegação, cache ou regras de treino.

A seção **Sua evolução** aparece entre o resumo do treino e os exercícios nos estados com treino disponível, inclusive retomada e conclusão. Reutiliza a composição de `vIyJ8`: dois cards, “Sequência” com ícone de chama e “Na semana” com ícone de atividade, mais **Ver histórico**, que abre a aba Progresso existente. A referência original `vIyJ8` permanece preservada no Pen.

Os indicadores vêm de `GET /students/me/workout-evolution?date=YYYY-MM-DD`, com requester vinculado à sessão e cache separado por usuário e data local. A API agrega somente registros concluídos até a data consultada, sem paginação de histórico no app. A semana começa na segunda-feira. “Sequência” conta semanas consecutivas com pelo menos uma conclusão; se a semana atual ainda não tiver conclusão, a sequência da semana anterior continua válida até o fim da semana atual. “Na semana” conta conclusões na semana atual. A consulta refaz a leitura ao retornar à tela e após conclusão confirmada ou sincronização da fila offline. Conclusões locais pendentes entram nos números após sincronizar com o servidor. Durante carregamento sem dados, os cards usam “—”; erro oferece atualização e preserva números anteriores quando disponíveis.

A meta semanal é opcional e configurada no Perfil do aluno, de 1 a 7 treinos, com opção de remoção. `GET/PATCH /students/me/workout-goal` consultam e persistem essa preferência; `null` significa sem meta. O segundo card mostra “de XX treinos” apenas quando existe uma meta explícita. Quantidade de dias do plano e semana do plano não são presumidas. Os números do Pen são exemplos de apresentação; no app, usar exclusivamente os dados reais. As rotas são exclusivas do próprio aluno e usam o `profileId` autenticado. Persistência fica na tabela independente `student_workout_goals`, migration `0006_cold_lenny_balinger.sql`, gerada pelo Drizzle; aplicar com `pnpm.cmd --filter @muvit/db migrate:test` antes de `pnpm.cmd --filter @muvit/db migrate` no banco local confirmado.

O salvamento cancela leituras antigas da meta antes de atualizar seu cache. Invalidações dos indicadores capturam o proprietário da operação e não bloqueiam a confirmação do treino ou da meta; falhas de atualização não desfazem uma operação já confirmada. O drain preserva o journal e seus tombstones. Não há processo de background adicional: o resumo é calculado na API e atualizado no app após sincronização e retorno à tela.

### Mapa de estados

No polimento MUV-9, a Visão geral implementada acompanha `aXvE4`: título de 29 dp, nome do treino de 25 dp, resumo em superfície sutil e exercícios em cards brancos separados por 12 dp. Número e chevron ficam centralizados verticalmente; cada card apresenta nome, prescrição, descanso e acesso aos detalhes, sem repetir o grupo muscular já disponível no resumo e no rótulo acessível. O contrato resumido do treino não informa URL de vídeo; o app mantém “Ver detalhes” e a navegação existente, sem presumir disponibilidade de mídia.

As telas começam em y=16100, crescem para a direita e ocupam cinco linhas. A linha de estados de Hoje sem treino disponível começa em y=17448, reservando espaço para os indicadores na linha anterior. O guia de fluxo fica em x=3500, y=16100. Nomes de quadros, esta tabela e o guia definem seus estados; metadados históricos de cópia não são contrato de renderização ou navegação.

| Tela/estado | Node ID |
| --- | --- |
| Hoje — disponível | `pSQsB` |
| Hoje — retomada | `FYxOo` |
| Hoje — pronto para concluir (100%) | `wauwJ` |
| Hoje — conclusão local | `Zc8xa` |
| Hoje — cache offline | `nea49` |
| Hoje — retomada offline | `s7ZS7E` |
| Hoje — conclusão local offline | `iiLaF` |
| Hoje — erro de atualização com conteúdo | `W1Xnpl` |
| Hoje — retry com conteúdo preservado | `OdLyK` |
| Hoje — sem plano | `GQf0x` |
| Hoje — dia sem treino | `KJcQR` |
| Hoje — sem plano offline | `UVoa7` |
| Hoje — dia sem treino offline | `gpaxa` |
| Hoje — loading | `yopRv` |
| Hoje — erro sem dados | `H3fEs6` |
| Hoje — retry em andamento | `M6SGyl` |
| Visão geral — disponível | `aXvE4` |
| Visão geral — loading | `OLvaz` |
| Visão geral — erro sem dados | `PcK5W` |
| Visão geral — retry em andamento | `kHbic` |
| Visão geral — erro de atualização com conteúdo | `GMYDi` |
| Visão geral — retry com conteúdo preservado | `MOT1w` |
| Exercício — vídeo e observação | `ZOLSM` |
| Exercício — vídeo sem observação | `fARgC` |
| Exercício — carregando vídeo | `zYpzT` |
| Exercício — erro de vídeo com retry | `K9WocR` |
| Exercício — vídeo indisponível offline | `BudfQ` |
| Exercício — sem mídia cadastrada | `H6asb` |
| Visão geral — 320 dp | `cp7Y4` |
| Visão geral — 430 dp | `ljtm0` |
| Exercício — 320 dp | `UDYZV` |

## Navegação e ações

- Hoje disponível: **Iniciar treino** abre a visão geral existente em `/log/:dayId`; o CTA da visão geral abre `/session/:dayId`.
- Hoje com rascunho: **Continuar treino** abre `/session/:dayId` diretamente, preservando o snapshot e o progresso. Com 100% dos exercícios concluídos, apresentar **Treino pronto para concluir**, mantendo a mesma ação de retomada; isso não confirma a conclusão local.
- Conclusão local prevalece sobre rascunho: não apresentar iniciar/continuar. A mensagem confirma somente persistência local e informa sincronização quando necessária; não presume confirmação do servidor.
- Cada linha de exercício abre uma tela própria com vídeo e detalhes, sem sheet. A lista continua disponível na retomada e após a conclusão local, inclusive offline quando os dados estão salvos. Voltar pelo header, gesto de navegação ou voltar Android pausa a mídia e retorna à mesma lista/posição, sem mudar progresso ou prescrição. Ao trocar de usuário/dia, o exercício anterior deixa de ser exibido.
- Voltar na visão geral retorna à origem; entrada direta pode usar Hoje como fallback. A tela não usa tab bar. Hoje mantém Hoje/Progresso/Perfil; as telas dessas outras abas estão fora desta entrega.
- **Tentar novamente** refaz a consulta. Enquanto aguarda, impedir reentrada e anunciar carregamento. Sucesso apresenta o estado correspondente; nova falha reapresenta o erro.

As transições estão descritas no guia `OncCJ` do canvas e nesta documentação; os nomes das camadas identificam as ações. O arquivo não é um protótipo navegável.

## Estados e dados

Loading, sem plano, dia sem treino e erro sem dados usam StatePanel na área principal, centralizado e sem superfície de card. Header e navegação continuam visíveis. Sem plano e recuperação não ganham ações inexistentes. Os textos de loading/erro da visão geral não presumem nome de plano ainda não carregado.

Nos retries sem dados `M6SGyl` e `kHbic`, o StatePanel de loading é o único indicador da consulta. Os botões Tentar novamente ficam ocultos somente nessa apresentação em andamento e reaparecem no erro recuperável. A recuperação usa a mesma consulta e bloqueia reentrada; não altera navegação ou outras ações.

Quando já existe conteúdo, falha de atualização usa Message/Error com retry textual centralizado dentro do aviso, conforme a foundation. Durante o retry, a ação passa a **Atualizando…**, bloqueia reentrada e mantém treino e exercícios disponíveis. Isso especifica a apresentação v2 para MUV-35; a MUV-25 não modifica o comportamento atual de renderização do Expo.

Offline é informação contextual sobre a origem dos dados. Hoje admite cache válido de treino, sem plano e dia sem treino. Sem cache válido, falha é erro com retry. Rascunho continua particionado por usuário e dia. A conclusão local offline conserva a informação de salvamento e não abre nova sessão.

**Limite atual:** o cache de Hoje não torna a visão geral offline. `loadWorkoutDay` ainda consulta a rede. Iniciar a partir de Hoje offline segue para visão geral e pode resultar em erro/retry; retomada usa o snapshot existente. Não prometer início offline, criar cache novo ou alterar navegação para contornar esse limite.

O estado “dia sem treino” acompanha `no-workout-today`; não representa uma nova regra de calendário ou descanso semanal. O progresso usa exercícios concluídos/total e o próximo exercício/série derivados do rascunho, conforme `getWorkoutDraftProgress`.

A visão geral usa somente dados devolvidos por `loadWorkoutDay`: o subtítulo não pressupõe nome de plano, que não faz parte do retorno. Dia sem exercícios executáveis é rejeitado pelo loader e usa o estado de erro já representado; não criar um vazio com nova regra de início.

Os exemplos são demonstrativos: aluno LM, Plano A, Treino A; Supino reto com 3 séries de 10 repetições e 60 s de descanso; Crucifixo inclinado com 3 séries de 12 e 45 s. O total estimado é ~11 min pela fórmula existente. Progresso exemplifica 1 de 2 exercícios concluídos (50%), com próximo passo na série 2 de 3 do Crucifixo. Não há métricas históricas nem semana de plano inventadas.

## Reutilização e adaptação

As telas usam instâncias conectadas dos headers, card de treino, preview de exercícios, tabs, botões, mensagens e StatePanel da MUV-24. As extensões `Q4dha` (`List/Exercício/Detalhado`) e `RL1fy` (`Media/Exercício/Demonstração`) estão organizadas no quadro `i9KQa` da biblioteca MUV-24 e usam tokens v2. A linha apresenta prescrição, descanso e acesso ao vídeo e detalhes. Progresso e tela do exercício são composições locais com os mesmos tokens.

Base de 390 dp, gutter 16 dp, DM Sans, controles com alvo mínimo 48 dp e CTA de 58 dp. As amostras de visão geral em 320/430 dp e exercício em 320 dp demonstram quebra de título e dimensionamento das linhas e capas. O chevron acompanha o centro da linha conforme ela cresce. No runtime, conteúdo e observações crescem, permitem rolagem e respeitam escala de fonte. Não fixar a altura da área de estado; safe areas e inset da tab bar pertencem ao shell e são reservados uma vez. CTA sucede o conteúdo na rolagem, sem esconder a última linha. Quadros mais altos mostram conteúdo completo para inspeção; não representam uma nova altura de viewport.

Linhas inteiras são tocáveis; ícone sozinho não delimita o alvo. A tela do exercício mantém nome, grupo, séries/repetições e descanso; observação só aparece com conteúdo. Leitor de tela deve anunciar progresso textual, estados e nome do exercício; mensagens não dependem apenas de cor. Ao abrir a tela, o foco vai para o título; voltar restaura o foco no exercício de origem.

## Vídeo demonstrativo por exercício

Requisito do [PRD no Notion](https://app.notion.com/p/32254a606c3781deae5cc4258140ef18): seção 2.1, vídeo/GIF demonstrativo (P0); seção 4.1, `Exercises.video_url`; seção 7.1, demonstrações desde o primeiro dia.

O vídeo fica na tela própria do exercício, acima da prescrição. **Assistir demonstração** inicia a mídia por ação explícita, sem autoplay ao abrir. Durante a reprodução, usar controles nativos acessíveis para reproduzir/pausar, buscar e abrir/sair de tela cheia; sair de tela cheia retorna ao mesmo exercício. O vídeo não inicia uma sessão, não conclui séries e não modifica o rascunho.

Na implementação MUV-9, `WorkoutExerciseVideo` consulta a mídia pelo ID do catálogo do exercício, reutilizando `useSessionExerciseMedia` e o player existente. Segue `zYpzT` (Carregando vídeo…), `K9WocR` (erro com Tentar novamente), `BudfQ` (Vídeo indisponível offline) e `H6asb` (Demonstração indisponível), incluindo os textos de orientação do Pen. Apenas o erro oferece retry; durante a nova consulta, a ação dá lugar ao loading. O retry atualiza somente mídia, preservando a prescrição. O quadro segue 16:9 e pode crescer para acomodar texto/escala de fonte. A reprodução usa URL real; capas geradas do design não são mídias do runtime. Ao sair da tela ou enviar o app para segundo plano, desmonta o player e exige nova ação para reproduzir. GIF real usa os controles acessíveis de animação já existentes.

Na lista, exercícios com URL de mídia válida usam **Ver vídeo e detalhes**; os demais usam **Ver detalhes**. A capa respeita proporção 16:9, enquanto estados de mídia crescem se o texto exigir. O alvo de reprodução tem no mínimo 48 dp.

Carregamento, erro com **Tentar novamente**, indisponibilidade offline e ausência de mídia preservam os dados do exercício. Retry refaz somente o carregamento da mídia e bloqueia reentrada enquanto aguarda. O cache de Hoje não garante cache de vídeo: sem mídia local disponível, apresentar o estado offline. A ausência de URL válida usa o estado sem mídia, sem ação de reprodução. O PRD prevê vídeo/GIF; respeitar o formato real recebido.

As capas de Supino reto e Crucifixo inclinado foram geradas com `imagegen` para este design e ficam em `assets/design/exercise-video-covers/`; os prompts e a origem estão no README desse diretório. Elas representam a aparência das capas, sem arquivo de vídeo associado. No runtime, usar mídia e poster reais do exercício. Leitor de tela, rotação/tela cheia e retorno à lista precisam ser validados na implementação.

## Verificação

A validação desta entrega é do artefato Pencil: capturas, referências de componentes, conteúdo, ações e cobertura de estados. Testes, lint, typecheck e execução Expo não se aplicam ao diff de design. Gestos, leitor de tela, escala de fonte, teclado e evidência Android/iOS precisam ser verificados na implementação; as amostras não constituem aprovação nativa.

Os 23 quadros originais e o guia foram inspecionados por captura MCP, incluindo revisão independente somente leitura. A correção substitui os dois sheets por telas próprias de exercício e adiciona quatro estados de vídeo, totalizando 27 quadros. As telas corrigidas, Hoje e as listas em 320/390/430 dp foram conferidas por novas capturas e revisão independente, sem defeitos materiais reportados. As capas geradas foram conferidas nas telas após sua inclusão. Os contrastes pontuais medidos na entrega inicial foram 4,81:1 para texto secundário sobre papel, 5,25:1 sobre branco e 10,21:1 para verde sobre lima; isso não substitui auditoria completa de acessibilidade. As flags automáticas de bounds apresentaram offsets inconsistentes com a renderização e não foram usadas para declarar ausência de clipping. A busca de escapes Unicode nos textos novos e a conferência de placeholders não encontraram ocorrências.

Na revalidação de 2026-10-01, o card MUV-25 foi consultado novamente e comparado com o canvas, o PRD e os loaders existentes. As 27 telas foram capturadas na revisão independente; as correções e quatro quadros adicionais foram conferidos em nova rodada, totalizando 31 telas. Foram corrigidos o CTA cortado na visão geral com erro, o retry contextual divergente, a ausência de exercícios na retomada/conclusão, o contexto de plano que o loader não retorna e as referências antigas ao sheet. A cobertura adicional representa retomada pronta para concluir, retry com conteúdo em Hoje/visão geral e exercício em 320 dp. O resultado da segunda rodada foi `ship`, sem achados materiais remanescentes nas capturas. `git diff --check`, busca de escapes Unicode e inspeção de placeholders ficaram limpos; testes Expo não se aplicam ao artefato.
