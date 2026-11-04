# MUV-37 — Progresso e avaliações do aluno v2

## Intenção e autoridade

Migrar Progresso e Nova avaliação do aluno para a UI/UX v2 aprovada, incluindo os estados funcionais e o fluxo de fotos definido no Pen. O usuário autorizou expressamente seguir os critérios do design e modificar o schema após a identificação do conflito com o texto original do ticket. Essa autorização permite seleção cumulativa sem teto, conferência e remoção antes do envio, e ampliação do contrato de quantidade de fotos. As demais regras permanecem.

Classificação Superpowers brainstorming: escopo multi-tela de um único domínio, com evolução de contrato compartilhado; usar a trilha arquitetural de spec e plano. Não há subsistemas independentes que exijam outras specs. O fluxo autônomo delegado dispensa aprovação humana intermediária e commits pelo planner.

Fontes atuais: `AGENTS.md`, `apps/mobile/AGENTS.md`, `apps/api/AGENTS.md`, `packages/validators/AGENTS.md`, `apps/web/AGENTS.md`, `docs/mobile-v2-student-progress.md`, `docs/mobile-v2-foundation.md` e `docs/mobile-v2-design-gate.md`. A fonte visual é `assets/design/mobile.pen`, acessível por MCP; o planner consultou o handoff textual, sem declarar inspeção visual do canvas ou execução nativa.

O executor principal confirmou exportações PNG atuais dos frames `R8DMP`, `YQWga`, `ZCD1f` e `bUVFV` durante este planejamento. Essas referências visuais disponíveis devem ser reutilizadas; a comparação final com o app continua necessária.

Referências para comparação durante a implementação:

| Área | Frames do Pen |
| --- | --- |
| Catálogo, fotos e guia | `XCKBa`, `JXm9A`, `H02fJG` |
| Histórico e dados parciais | `R8DMP`, `xQCvZ`, `E8gHIE`, `d5Owa`, `Eyq0q`, `SdMyc`, `wD6Ex` |
| Loading, vazio, erro, retry, falha com dados | `lECTq`, `Y8WrQ1`, `Fbjmz`, `s7tXs`, `cN2h4` |
| Formulário e seleção | `YQWga`, `pXdSR`, `e34lmL`, `hnvnM`, `ZCD1f` |
| Conferência selecionada/registrada | `bUVFV`, `j5Le78` |
| Envio, erro, sucesso, teclado | `SDrcx`, `EjRT9`, `S1DV3j`, `I887G` |
| 320/430 dp e texto longo | `GjYM3`, `jbrY4`, `TwkHx`, `cs4M7`, `vg801` |

## Limites globais

- Não adicionar dependências, métricas, campos de entrada, filtros, paginação, metas, edição ou exclusão de avaliações.
- Não alterar Perfil, Hoje, sessão guiada, autenticação, ownership ou shell de navegação.
- Preservar TypeScript estrito, UTF-8 literal pt-BR, Zod, Vitest/RNTL e os padrões existentes.
- Usar primitives `src/components/ui/v2` e tokens `src/lib/design-system/tokens.ts`; não importar estilos/primitives legados nas telas migradas, exceto o wrapper estrutural `Screen` existente.
- Preservar DM Sans, gutter de 16 dp, ações principais de referência 58 dp, campos com mínimo 52 dp e alvos de ícone de 48 dp.
- Reservar safe area e tab bar uma única vez pelo `Screen`; não copiar alturas do canvas para a viewport.
- O GET continua `/students/me/assessments?limit=20`, query key `['assessments', 'me']`, na ordem recebida.
- O POST continua `/students/me/assessments`; fotos continuam URLs em `photos?: string[]`, com validação de URL e sem teto de quantidade no schema.
- Preservar data obrigatória, peso positivo até 500 kg, gordura entre 0 e 80% e observações até 2000 caracteres; altura e circunferências são somente leitura no aluno.
- Preservar upload → criação → invalidação → `Avaliação salva!` → `router.back()` após 150 ms; não prometer idempotência, fila offline ou limpeza de uploads órfãos.
- O professor continua selecionando no máximo três fotos, uma por vez; não ganha visor ou seleção múltipla por esta entrega.

## Estado atual e evolução escolhida

`src/screens/progress.tsx` consulta a API diretamente e renderiza cards legados com data, peso, gordura, comparação com o próximo registro e observações. Não apresenta altura, circunferências ou fotos recebidas. Loading/erro/vazio são condicionais independentes; erro com dados ainda usa StatePanel.

`src/screens/new-assessment.tsx` mantém uma foto opcional, usa `assets[0]`, permite edição/crop no picker e substitui a seleção anterior. `src/application/assessments/new-assessment.ts` monta o payload e realiza um upload. O schema `packages/validators/src/assessments.ts` limita fotos a seis; `updateAssessmentSchema` deriva dele. Ambos os endpoints de criação e o PATCH usam esses schemas. O banco já persiste array de URLs em JSONB, sem teto adicional.

Alternativas examinadas: manter uma foto preservaria o comportamento antigo, mas não cumpriria o design; permitir seis preservaria a validação HTTP antiga, mas não cumpriria o design sem teto; implementar o fluxo aprovado e remover somente o limite de quantidade atende à autorização atual. Escolhida a terceira opção. A mudança amplia entradas aceitas, mantendo payload, rotas, respostas e entradas previamente válidas.

## Fronteiras de implementação

1. Contratos: remover somente `.max(6)` de `photos` no schema compartilhado. API continua fina, consumindo o mesmo schema, use case e repositório. Adicionar testes HTTP reais para criação/leitura e atualização com oito URLs; não há motivo identificado para mudar código de rota, banco ou migrations.
2. Aplicação: adaptar `new-assessment.ts` para `photos: readonly AssessmentPhotoInput[]` e `photoUrls?: readonly string[]`, preservando parsing numérico, trim e omissão dos opcionais vazios. Uploads sequenciais preservam ordem e evitam abrir uma requisição por foto simultaneamente em seleção extensa. Falha de upload impede POST; falha de POST impede invalidação; falha de invalidação continua erro da operação completa.
3. Borda nativa: `src/lib/use-new-assessment.ts` concentra estado, picker, bloqueios de reentrada, upload/query client e timer; a screen renderiza campos e chama callbacks. Tipos do picker não atravessam application. Um helper puro normaliza os assets recebidos, mantendo a ordem e selecionando apenas formatos suportados por um lote válido.
4. Apresentação das fotos: extrair a grade visual existente de `TrainerAssessmentPhotos` para `AssessmentPhotoGrid`, compartilhada entre seleção do aluno, fotos registradas do aluno e wrapper do professor. Limite, cópia, remoção e abertura são props; o wrapper conserva sua API, labels, testID e máximo três. O componente não importa picker, API ou router.
5. Conferência: `AssessmentPhotoViewer` usa Modal nativo e primitives v2; recebe URLs, índice e callbacks. Não cria rota, upload, remoção de fotos registradas, compartilhamento ou download.
6. Progresso: um módulo puro `src/application/assessments/student-progress.ts` concentra formatação e comparação; `StudentAssessmentCard` apresenta o registro com primitives v2, medidas já recebidas e a grade de leitura. Reutilizar `AssessmentMetric` e `AssessmentMeasurementsCard` onde sua composição corresponda ao Pen, sem alterar o visual do professor.

## Progresso

Preservar shell Hoje/Progresso/Perfil e Progresso selecionado. Marca/contexto, título e Nova avaliação precedem o histórico. Datas são DD/MM/AAAA, números pt-BR, peso em kg e gordura em %. Ausências usam traço e não zero. Comparar somente a métrica válida dos registros adjacentes, com `a mais`, `a menos` ou `Sem alteração`; gordura usa p.p. Não introduzir avaliação de resultado bom/ruim.

Altura e as nove circunferências já existentes no contrato aparecem somente quando recebidas; omitir seções sem valores. Observações existentes crescem sem truncamento. Fotos retornadas aparecem em duas colunas sem upload ou remoção; tocar abre a imagem inteira. Não limitar a renderização a seis ou três fotos. A resposta aceita `photos: null`; normalizar para ausência de seção. Não usar assets de demonstração como conteúdo real.

| Condição | Apresentação |
| --- | --- |
| Sem resposta, consulta inicial ou retry em andamento | Um StatePanel loading; manter header, Nova avaliação e tabs |
| Sem resposta, erro | StatePanel error com Tentar novamente |
| Resposta vazia bem-sucedida | StatePanel empty, sem duplicar Nova avaliação |
| Histórico disponível | Todos os registros da resposta em ordem |
| Atualização em andamento com resposta anterior | Preservar conteúdo; bloquear retry repetido, sem substituir por loading inicial |
| Falha de atualização com resposta anterior | Preservar conteúdo e Message contextual com Tentar novamente integrado |

Loading e erro inicial não coexistem. `isFetching` sem dados deve prevalecer sobre erro anterior durante retry. Com resposta vazia anterior e falha de atualização, preservar a orientação vazia e apresentar a falha contextual. Retentativas não disparam requests concorrentes.

## Nova avaliação e seleção

Header contextual com retorno, sem tab bar. Campos permanecem data (AAAA-MM-DD, inicialmente `todayIsoDate()`), peso, gordura e observações multiline. Peso/gordura aceitam vírgula pela conversão atual. Usar Field v2 simples, sem controles +/- e sem novos erros por campo. Campos continuam editáveis durante envio conforme o handoff; payload usa snapshot dos valores/fotos no início da operação.

`Adicionar fotos` abre biblioteca somente para imagens, com `allowsMultipleSelection: true`, `selectionLimit: 0`, `allowsEditing: false`, `quality: 0.7`. A versão instalada do Expo documenta que crop e múltipla seleção são incompatíveis e zero usa o máximo permitido pelo sistema, sem teto do produto. Não solicitar câmera. Cancelamento mantém dados/fotos anteriores. Uma nova seleção acrescenta imagens em ordem; fotos repetidas não são deduplicadas implicitamente.

Suporte continua JPEG/PNG, conforme upload atual. Suposição técnica explícita: um lote com URI ausente ou MIME não suportado é rejeitado inteiro com `Selecione imagens JPEG ou PNG.`, preservando a seleção anterior; não descartar silenciosamente uma parte do lote. Rejeição/erro de abertura do picker preserva os dados e apresenta `Não foi possível abrir a biblioteca de fotos. Tente novamente.`. O picker moderno de biblioteca não exige solicitar permissão ampla antecipadamente; tratar negação/erro da operação no ponto de uso, seguindo a API instalada. Sem política nova de acesso ao storage.

Fotos selecionadas usam grade de duas colunas, contagem e upload na próxima posição mesmo após oito ou mais anexos. A largura é calculada a partir do container e gap, sem medidas fixas de dispositivo. Proporções vêm das dimensões válidas do asset ou do carregamento da imagem; fallback visual 1:2. Nenhuma imagem é recortada na conferência. Eventos de dimensão inválida mantêm fallback.

Remover uma foto antes do envio atualiza a contagem/ordem; remover a última retorna à seleção vazia. X de 16 dp sobre círculo verde sólido de 28 dp, alvo 48 dp, label `Remover foto N`. Estado desabilitado mantém legibilidade sem transparência global. Fotos repetidas recebem chaves distintas por URI/posição.

Tocar foto abre conferência com `Foto N de M`, imagem `contain`, retorno e anterior/próxima; nas extremidades bloquear a ação indisponível, sem wrap. Com uma foto, omitir controles de percurso. O retorno nativo Android fecha primeiro o Modal; fechar preserva formulário e seleção. Não oferecer remoção dentro do visor. Em leitura, nenhuma ação modifica anexos registrados.

## Envio e falhas

Adicionar/remover/salvar ficam desabilitados durante envio e sucesso. O botão mantém largura estável e label `Salvando avaliação...`, como única indicação de progresso da operação. Guard síncrono impede envio duplicado e picker concorrente. Uma resposta atrasada do picker não pode alterar a seleção de uma operação já iniciada nem atualizar tela desmontada.

No erro de upload, POST ou invalidação, conservar campos e fotos, apresentar `Não foi possível salvar sua avaliação.` e permitir retentativa. Um upload anterior pode ter sido concluído e um POST pode ter sido criado antes de falhar a invalidação; não apresentar garantia de rollback. Sucesso apresenta `Avaliação salva!` no mesmo formulário, bloqueia reentrada e retorna após 150 ms, cancelando timer ao desmontar.

## Compatibilidade e sequência operacional

A API ampliada deve estar disponível antes do app que envia mais de seis fotos. Clientes antigos continuam válidos. O response schema já usa array sem teto; dados com oito ou mais URLs não exigem novo tipo. Web usa `Array<string>` no SDK e formulários existentes; regenerar com `pnpm.cmd --dir apps/web api:gen` pela regra local e conservar somente diferenças de contrato pertinentes. Não editar arquivos gerados manualmente ou alterar limites deliberados do formulário do professor.

Rollback do app mantém dados legíveis, pois a resposta antiga já aceita array. Reintroduzir máximo seis no servidor bloquearia alterações que reenviem coleções maiores; não usar essa reversão sem avaliar registros criados. Não há migração ou corte destrutivo de fotos.

Remover o teto de produto não remove limites de transporte, memória, storage ou plataforma. Não aumentar bodyLimit, alterar rate limit nem adicionar fila nesta issue sem falha comprovada. Registrar tais limites se observados. Upload sequencial limita concorrência, mas não garante duração curta; seleções extensas precisam permanecer roláveis e recuperáveis.

## Verificação e revisão

Testes de schema: zero/uma/seis/oito/muitas URLs válidas, inválidas e demais limites preservados. Testes HTTP: POST self-scoped com oito URLs, GET em ordem, PATCH com oito e ownership/papéis existentes. Testes de serviço: ordem, vazio, falha parcial de upload, POST/invalidação e snapshot. RNTL: estados de Progresso, comparações parciais, leitura de medidas/fotos, seleção cumulativa, cancelamento, remoção, visor, reentrada, falhas, sucesso e retorno.

Medir cobertura core e UI existentes (piso 85%), executar testes/typecheck mobile/API/validators e regressões de avaliações do professor/web. Não reduzir thresholds ou mudar configuração global para acomodar falhas. Validar fonte, teclado, safe areas, rolagem, picker real, imagem inteira, permissão/erro e sucesso em Android com Maestro quando disponível. Comparar capturas reais com Pen em 320/390/430 dp; RNTL e CI não comprovam fidelidade visual.

Self-review brainstorming: intenção, autorização, alternativas, dados, limites, estados, riscos e critérios estão explícitos; não há requisito crítico de produto pendente. As cópias adicionais de feedback são decisões técnicas verificáveis e não prometem causa ou persistência. A spec não afirma testes ou inspeção nativa executados pelo planner. A validação do executor deve registrar SHA, comandos, resultados, capturas e limitações reais.
