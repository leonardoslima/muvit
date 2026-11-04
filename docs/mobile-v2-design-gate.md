# Gate de design mobile v2 — MUV-41

## Escopo e situação

A fonte visual é `assets/design/mobile.pen`. Este relatório reúne os contratos e a auditoria transversal das entregas MUV-24 a MUV-31 para validar a consistência dos layouts do aluno e do professor, os estados aplicáveis, a ergonomia e a organização do canvas. A base da revisão é o commit `b6b1a4e`, na branch `feat/muv-41-validacao-polish-mobile-v2`, em 07/10/2026.

A correção da caixa de período foi aplicada, salva no arquivo original e revalidada. A revisão seguinte incorporou os refinamentos de loading, imagens, upload, perfil, headers e editor descritos nos handoffs. O usuário aprovou o resultado visual e confirmou o salvamento manual do Pen em 09/10/2026. As evidências abaixo permanecem identificadas pela etapa auditada; os registros anteriores de salvamento pendente são históricos.

O escopo é exclusivamente design no Pen e seu relatório. Implementação Expo, API, regras de negócio e funcionalidades novas pertencem aos respectivos cards de implementação. Os quadros e guias existentes documentam os fluxos; não são um protótipo navegável nem aprovação de comportamento nativo.

## Consolidação aprovada — 09/10/2026

- Fotos selecionadas e registradas usam o componente de imagem `CfWyw`; fotos de leitura ocultam a remoção. O upload `S8jXyf` ocupa a próxima posição da grade nas telas aplicáveis de aluno e professor, preservando seus limites e estados próprios.
- Perfis concentram identidade, dados da conta e saída, sem o bloco Treinos e evolução. Home, alunos e avaliações do professor centralizam recuperação no header, sem ações redundantes no corpo ou progresso duplicado. Os botões de consulta e criação do detalhe do aluno preservam a foundation, com cores e ícones por categoria.
- O editor agrupa nome, contagem e ações no cartão do dia, prescrição em duas colunas e adição de exercício tracejada ao final. Edição inline usa borda verde e Editando exercício; alterações locais usam a cor de atenção e Alterações não salvas. O botão Ver treino de `RZSo3` e a tela separada de foco `EFk9m` foram removidos.
- O formulário vazio `yFUlq` recebeu dicas de preenchimento nos 12 campos numéricos e em Observações. Esses placeholders de entrada são intencionais e não representam conteúdo provisório ou valores preenchidos.

As capturas e leituras MCP realizadas durante os ajustes cobriram 320/390/430 dp e os estados pertinentes de vazio, edição, alteração, erro, envio e limites. A última comparação global, após a remoção do recorte de teclado, registrou 329 quadros raiz e zero interseções. Alertas de bounds em referências continuam sujeitos à ressalva documentada nos handoffs; não se presume geometria interna automaticamente limpa.

Após a confirmação do usuário, a leitura do arquivo local registrou 4.165.288 bytes, modificação em 09/10/2026 às 07:44:17 e SHA-256 `0747DAAF2AD111E1F974BBC2FD92753E732A0E32BC5F9FD82964054D3F090A03`. Essa evidência identifica o arquivo incluído no commit; não substitui os ensaios nativos dos cards de implementação. O usuário autorizou o commit nesta branch; integração, publicação e transição do card permanecem etapas separadas.

## Mapa das entregas

| Card | Handoff | Cobertura de design | Implementação |
| --- | --- | --- | --- |
| MUV-24 | [Foundation](mobile-v2-foundation.md) | Tokens, componentes, ações e campos; estados default, pressed, focus, disabled e loading; mensagens, StatePanel, composição e adaptação | Foundation de design; aplicação executável nos cards dos fluxos |
| MUV-25 | [Hoje e visão geral](mobile-v2-student-today.md) | Disponível, retomada, conclusão local, sem plano/dia sem treino, loading, erro/retry, atualização com conteúdo, cache offline e estados de mídia | MUV-35 |
| MUV-26 | [Sessão guiada](mobile-v2-student-session.md) | Série, descanso, avanço, retomada, saída segura, envio/erro, conclusão e sincronização; demonstração com retorno ao contexto preservado | MUV-36 |
| MUV-27 | [Progresso e avaliações do aluno](mobile-v2-student-progress.md) | Histórico, dados parciais, loading/vazio/erro, atualização com dados; fotos selecionadas/registradas, conferência, remoção, envio/erro/sucesso | MUV-37 |
| MUV-28 | [Autenticação e perfil](mobile-v2-auth-profile.md) | Login/cadastro, solicitação/erros, perfis por papel, loading/fallbacks, saída em andamento e erro ao sair | MUV-34 |
| MUV-29 | [Home e alunos do professor](mobile-v2-trainer-students.md) | Carteira, busca aplicada, detalhe, loading/vazio/erro, atualização com dados, paginação/erro, identificador inválido e 404 | MUV-38 |
| MUV-30 | [Avaliações do professor](mobile-v2-trainer-assessments.md) | Lista/detalhe/formulário, consultas e paginação, identidade, validação agregada, fotos, upload, envio/erro e sucesso transitório | MUV-39 |
| MUV-31 | [Treinos e exercícios do professor](mobile-v2-trainer-workouts.md) | Lista/detalhe/editor, consultas, prescrição, catálogo, paginação, confirmações, envio/erro/sucesso, saída protegida e rascunho na conta | MUV-40 |

Os handoffs incluem referências de 320/390/430 dp, com exemplos de conteúdo extenso, foco ou teclado conforme o fluxo. A foundation usa 390 dp como base. As referências de teclado ilustram composição e acesso ao conteúdo; aparência, altura e funcionamento do teclado são do sistema.

## Contratos comuns preservados

- A direção v2 usa DM Sans, papel, verde profundo, lima e os tokens existentes. A paleta imersiva pertence à sessão e não introduz um modo escuro global.
- Reutilizar instâncias conectadas da foundation e suas extensões existentes, preservando referências e overrides. Diferenças de composição aprovadas não justificam criar outro componente ou token.
- A base tem gutter de 16 dp, CTA principal de referência de 58 dp e alvos de ícone de 48 × 48 dp. Labels, unidades, texto de estado e conteúdo significativo permanecem legíveis; texto e componentes crescem quando necessário.
- Sem dados, StatePanel ocupa a área principal sem superfície própria de card, preservando header e navegação conforme o shell. Com dados, falha de atualização usa mensagem contextual e conserva o conteúdo. Erros de formulário seguem o contrato do fluxo, sem introduzir validação nova.
- Ações existentes de retorno, atualização, criação e recuperação não são duplicadas no mesmo contexto. Loading, disabled e sucesso respeitam os bloqueios e a navegação já definidos em cada handoff.
- Cada operação tem uma única indicação de carregamento quando há StatePanel ou indicador dedicado: o retry do erro sai temporariamente dessa apresentação e o reload do header permanece visível, estático e desativado. Loading no botão continua válido quando ele é o único feedback de progresso; navegação, outras ações e conteúdo já carregado são preservados.
- Aluno mantém Hoje/Progresso/Perfil; professor mantém Início/Alunos/Perfil. Telas sem tab bar e a sessão imersiva conservam suas exceções documentadas.
- Safe areas, teclado e inset de tab bar são reservados uma única vez pelo shell. Conteúdo extenso permanece acessível por rolagem. A altura expandida dos quadros permite inspeção do conteúdo e não define uma altura fixa de dispositivo.
- Canvas organizado mantém os grupos identificáveis e os quadros separados, incluindo instâncias que crescem após alterações em componentes compartilhados. A ausência de interseções entre raízes não comprova ausência de clipping interno.

## Diferenças contextuais deliberadas

### Retorno, atualização e recuperação

Na MUV-29 e nas consultas de lista/detalhe da MUV-30, o reload permanece no header inclusive sem dados: acionável no erro recuperável e estático/desativado durante carregamento ou nova tentativa. Contexto indisponível, identificador inválido ou avaliação de outro aluno também preserva reload desativado. StatePanel mostra erro ou progresso sem botão duplicado de recuperação ou retorno; voltar fica somente no header. A paginação mantém sua recuperação própria, preservando os itens anteriores; durante a consulta da próxima página, o reload fica desativado. Formulários da MUV-30 mantêm somente retorno, sem reload de consulta.

MUV-31 mantém retorno e reload somente no header das telas que possuem esse cabeçalho, inclusive no erro inicial. O reload permanece visível nos estados normal, desativado e carregando; quando já existe loading dedicado para a consulta, permanece estático e desativado. Contexto inválido e edição local não tornam a ação acionável. No catálogo, que não possui esse header, o retry inicial e o retry de paginação continuam no modal.

Os fluxos do aluno conservam os retries próprios: StatePanel sem dados e mensagens contextuais quando há conteúdo, conforme os handoffs. Esses padrões recuperam as operações existentes. A diferença de localização é uma exceção contextual aprovada; este gate não uniformiza as ações por preferência estética nem muda as consultas.

### Formulários, fotos e feedback

Os campos de autenticação usam controles de 58 dp. Outros formulários conservam suas referências de 52 dp ou o mínimo documentado. As composições aprovadas permanecem ligadas à mesma foundation.

O aluno possui seleção de fotos sem teto no design aprovado da MUV-27, com conferência visual. O professor conserva até três fotos selecionadas, uma por vez, sem visor de conferência na MUV-30. O componente visual compartilhado mantém proporção das fotos e remoção sobre a imagem; seus overrides preservam as diferenças de cada fluxo. Adequações funcionais da seleção do aluno pertencem à MUV-37.

Validação agregada, campos editáveis durante determinadas operações e ações desabilitadas seguem cada contrato existente. Sucesso não exige uma tela genérica: avaliações usam feedback transitório com retorno existente; saída da conta retorna ao login; treino do professor conserva confirmação e navegação explícita.

O rascunho na conta e a saída protegida da MUV-31 são escolhas já aprovadas. A confirmação reutiliza o sheet existente; persistência e retomada funcional pertencem à MUV-40. O gate não cria outra gestão de rascunhos ou contrato de API.

### Cores literais

A auditoria identificou 67 ocorrências de `#FFFFFF` na MUV-31 como cor de conteúdo sobreposto, incluindo hora, contexto, dia e ícones de status. Essas ocorrências são intencionais e devem ser preservadas. Não representam superfícies que precisem ser substituídas por outra cor; não há necessidade de acrescentar um token apenas para eliminar o literal.

## Primeira revalidação — caixa de período, 07/10/2026

A revalidação após o ajuste da caixa de período, anterior ao refinamento de loading, registrou:

- 330 quadros raiz globais, com zero interseções.
- 306 raízes do escopo MUV-24 a MUV-31 e 16.328 nós resolvidos.
- 6.699 textos, todos com DM Sans, e 1.862 referências, incluindo overrides aninhados, sem alvo inexistente.
- Zero clipping ativo, placeholders ou escapes Unicode no escopo.
- 15 instâncias conferidas após o ajuste; os dez períodos visíveis acompanham as larguras úteis de 248/318/358 dp em 320/390/430 dp, com datas e status completos.

A revisão documental leu os oito handoffs e confirmou seus contratos e limites de implementação. As diferenças contextuais registradas acima são preservadas.

O auditor do canvas inspecionou 20 capturas de 19 alvos únicos, incluindo a lista de 320 dp antes e depois do ajuste:

| Amostra visual | Node IDs |
| --- | --- |
| Recuperação contextual do aluno e do professor | `H3fEs6`, `vce5L`, `w11Iq`, `rBHC0` |
| Adaptação de fluxos e perfis | `cp7Y4`, `ZGhII`, `TwkHx`, `bs3r4`, `c8aPy`, `xdMmY`, `iJPiO`, `o6D0v`, `aybsK`, `yAacZ` |
| Foco e teclado | `uDcRQ`, `NIy9m`, `EFk9m` |
| Componente corrigido | `aOYpS` antes/depois e `uBz7j` em 430 dp |

O coordenador também capturou `pSQsB`, `R8DMP`, `sPhAW`, `wyzdn` e `v3bKo6` antes da correção. Essas cinco capturas adicionais não entram na contagem do auditor. A revalidação estrutural do ajuste conferiu as 15 referências do componente.

O responsável do Pen confirmou o salvamento em `assets/design/mobile.pen`: a interface apresentou `Edited=false` e `SaveDialog=false`, e o arquivo original passou a ter 3.911.964 bytes, com atualização local em 07/10/2026 às 17:58:56.634. A leitura MCP após o salvamento confirmou `ywwuK` com largura `fill_container`, sem placeholder. O status Git confirmou somente o Pen modificado e este relatório novo. A entrega aguarda revisão humana; esse resultado não aprova a implementação nativa.

## Ajuste da caixa de período

Os dois alertas iniciais em `aOYpS`, nos caminhos `pvlAw/ywwuK` e `f5pKfu/ywwuK`, tinham a mesma origem: o texto Período (`ywwuK`) do símbolo `List/Treino/Professor` (`RTkQU`) tinha largura fixa de 318 dp. Na instância de 320 dp, o card tem 288 dp e padding de 20 dp, deixando 248 dp úteis. A captura mostrava os glifos das datas completos; o defeito era a caixa sem adaptação de largura.

O ajuste no Pen alterou somente a largura de Período para `fill_container`, seguindo Title, Status e Date do mesmo símbolo. Os dez períodos visíveis acompanham as larguras úteis, com datas e status completos. Conteúdo, tokens, demais dimensões e ações foram preservados. A revalidação final não encontrou clipping ativo nem interseções globais.

A revisão independente direcionada conferiu as 15 instâncias em `aOYpS`, `v3bKo6`, `eFds0`, `TFMmS` e `N7NuF`. Os cinco períodos ocultos de rascunho conservam os overrides preexistentes `enabled: false` e largura de 100 dp, sem conteúdo; não foram modificados e não apresentaram regressão.

## Refinamento do feedback de carregamento

A varredura das 330 raízes identificou oito apresentações com dois progressos para a mesma consulta. Os ajustes no canvas preservam o indicador dedicado e retiram somente o progresso redundante:

| Quadros / controles | Ajuste |
| --- | --- |
| `M6SGyl/J92QjD`, `kHbic/dVecM` | Ocultar o retry do conteúdo somente durante o StatePanel de loading; manter a recuperação no erro |
| `HuTlv/AtANd`, `oqdnt/lMC2C`, `A8i1E/vOHMS` | Manter reload do header visível, estático e desativado durante o indicador dedicado, com alvo de 48 dp e posição preservados |
| `K1Dv9W/F24hs`, `ibKMR/fQkAU`, `z5yoK/WoVmX` | Manter reload do header visível, estático e desativado durante o StatePanel de loading, com alvo de 48 dp e posição preservados |

Os retries `dk6D5`, `vVpIO`, `F6PJD` e `j9QNG` conservam o botão em Loading, pois é o único feedback de progresso. Paginação com feedback único, envio, login, outras ações e conteúdo já carregado também permanecem preservados. Os ajustes são de apresentação no Pen; consultas, contratos e código Expo não são alterados.

Nas oito telas corrigidas, os loaders passaram de 16 para oito: dois labels de retry redundantes foram ocultos e seis reloads de header permaneceram visíveis e estáticos. A nova varredura das 330 raízes não encontrou múltiplos loaders nas telas de consulta. As cinco variantes Loading legítimas do catálogo `ApsEA` foram preservadas, assim como 24 controles comparados por hashes estruturais idênticos.

As correções desta etapa são conferidas no canvas. Conforme instrução do usuário, o salvamento manual do Pen fica a seu cargo; não foi confirmada a persistência deste refinamento no arquivo original. As métricas da primeira revalidação acima não representam o snapshot após esses ajustes.

## Critérios de aceite do gate

1. Os fluxos de aluno e professor permanecem reconhecíveis e consistentes com a foundation e suas diferenças contextuais aprovadas.
2. Loading, vazio, erro, sucesso e disabled estão representados onde se aplicam às operações do fluxo, sem criar ações, dados ou etapas inexistentes.
3. Headers, campos, botões, listas, mensagens, fotos e sheets mantêm hierarquia, labels, alvos e referências válidas; não há ações redundantes no mesmo contexto.
4. As referências estreitas, largas e de conteúdo extenso preservam texto e controles. Safe area, scroll e teclado têm orientação clara, sem interpretar os quadros expandidos como dimensões fixas de runtime.
5. O canvas mantém grupos e jornadas identificáveis, sem interseções entre raízes. Alertas geométricos são confrontados com capturas para determinar clipping interno real.
6. A evidência final registra as disposições dos alertas e as verificações do snapshot resultante, sem placeholders, escapes Unicode usados para acentuação ou decisões visuais pendentes.

## Limites da aprovação

A aprovação deste gate cobre o artefato Pen e os contratos de design documentados. Não comprova execução Android/iOS, navegação real, gestos, leitor de tela, escala de fonte do sistema, IME, reprodução de mídia ou integrações de dados. Esses ensaios pertencem aos cards de implementação indicados no mapa.

No MUV-31, busca, rolagem e edição inline estão documentadas; o recorte separado de teclado foi removido. A cobertura do design não equivale a um ensaio de foco e IME real no editor ou no catálogo, que pertence à MUV-40.

Testes, lint, typecheck e build do Expo não verificam este diff de design/documentação e não são exigidos como evidência do gate. A verificação textual usa UTF-8 estrito, busca por escapes e marcadores de trabalho e `git diff --check`. A verificação visual usa o Pen, capturas e leitura estrutural do canvas; flags de bounds não substituem a inspeção visual.
