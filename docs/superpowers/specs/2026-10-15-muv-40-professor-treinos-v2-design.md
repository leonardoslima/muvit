# MUV-40 — Professor: treinos e exercícios v2

## Intenção e autoridade

Migrar lista, detalhe, editor e catálogo do professor ao design MUV-31, com proteção de saída e rascunho remoto retomável em outra instalação autenticada da mesma conta. A decisão de produto registrada no Linear em 15/10/2026 autoriza a persistência backend/banco e resolve a antiga exigência de conservar textos inválidos: somente um estado válido pelas regras existentes pode ser salvo como rascunho. Dados inválidos permanecem no editor para correção ou descarte; não são enviados nem provocam saída.

A decisão atual do Linear prevalece sobre os parágrafos antigos de `docs/mobile-v2-trainer-workouts.md` que exigem preservar estados incompletos ou textos inválidos. O handoff deve ser corrigido no mesmo diff. `assets/design/mobile.pen` e o restante desse documento continuam como referência visual. MUV-31/MUV-33 estão concluídas e disponíveis na base `develop` desta execução.

Mudança arquitetural: acrescenta persistência remota e interface HTTP específica, além da migração visual. Brainstorming e writing-plans são aplicados autonomamente conforme autorização expressa de muvit-autonomous, sem gate humano intermediário. O executor usa a worktree/branch já reservadas e entrega somente MUV-40.

## Fontes inspecionadas

- `AGENTS.md`, `apps/mobile/AGENTS.md`, `apps/api/AGENTS.md`, `packages/db/AGENTS.md` e `packages/validators/AGENTS.md`.
- `packages/validators/src/workouts.ts`, `packages/db/src/schema/workouts.ts`, rotas/use cases/repositório Drizzle de workouts.
- `trainer-workouts.tsx`, `trainer-workout-detail.tsx`, `trainer-workout-editor.tsx`, `workout-editor.ts`, `trainer-workout-data.ts` e componentes locais.
- Primitives v2, `TrainerScreen`, `use-prevent-remove.ts` e o guard/sheet da sessão guiada como padrões existentes.
- Base inspecionada: `53f25596b00c648ad103dc238bcedad76d678273`, branch `feat/muv-40-migrar-professor-treinos-e-exercicios`.

O Pen deve ser inspecionado pelo executor/QA via Pen CLI antes da avaliação visual final; a leitura do handoff não comprova leitura do canvas nem validação nativa.

## Abordagens e decisão

1. **Escolhida: draft separado de planos publicados.** Tabela própria guarda payload normalizado e validado, identificação do professor/aluno e vínculo opcional ao plano original. A publicação cria/atualiza o plano e consome o draft na mesma transação. Mantém os endpoints existentes compatíveis e torna o draft privado do professor.
2. Reutilizar um plano `status=draft` em `workout_plans`: não representa com segurança alterações separadas de um plano ativo e poderia expor pendências nos consumidores do aluno.
3. AsyncStorage ou cache persistente: não atende retomada em outro aparelho nem conservação remota na conta.

## Restrições globais

- Sem novas dependências ou mecanismos de autenticação; Better Auth e `RequestIdentity.profileId` mantêm suas responsabilidades.
- Textos visíveis, comentários e documentação em pt-BR com UTF-8 literal.
- Tokens de `src/lib/design-system/tokens.ts` e primitives de `src/components/ui/v2`; sem aliases para o legado.
- Gutter de 16 dp, campos de referência de 52 dp, CTA de 58 dp e alvos de ícone de 48 × 48 dp, permitindo crescimento do conteúdo.
- Conteúdo rolável em 320/390/430 dp, com teclado nativo e fonte ampliada; safe areas e inset da tab bar aplicados uma vez pelo shell.
- Sem autosave, CRUD de catálogo, exclusão de plano, datas editáveis, drag-and-drop, campo tempo editável, seleção múltipla ou mídia no catálogo.
- Preservar endpoints e schemas existentes; novos contratos são aditivos. Somente o fluxo novo de rascunho recebe validação completa adicional.
- Testes integrados usam exclusivamente API/banco/portas e AVD/serial desta execução.

## Contrato remoto e persistência

`workout_plan_drafts` contém `id`, `trainerId`, `studentId`, `sourcePlanId` opcional, `payload` JSONB validado, `selectedDayOrder`, `revision`, `createdAt` e `updatedAt`. O payload usa dados de plano completos: nome, notas, dias e prescrições normalizadas; não contém IDs locais, nomes ilustrativos do catálogo nem texto numérico inválido. `selectedDayOrder` identifica o dia selecionado e deve existir no payload. O vínculo original nunca é escolhido somente pelo cliente sem verificação de ownership.

FKs de professor/aluno usam cascade. O vínculo opcional ao plano deve impedir reaproveitar um draft de edição como criação se o original desaparecer: usar cascade ou bloquear publicação quando o plano não existir, nunca converter silenciosamente. Índices atendem consulta por professor/aluno. Uma constraint única por professor/aluno/contexto de edição impede duplicatas causadas por requests concorrentes; o contexto de criação também precisa tratar `NULL` corretamente. Migration gerada pelo fluxo Drizzle, sem reescrever migrations anteriores.

Novos schemas compartilhados em `packages/validators/src/workout-plan-drafts.ts` exportam `workoutPlanDraftPayloadSchema`, `saveWorkoutPlanDraftSchema`, `publishWorkoutPlanDraftSchema`, `workoutPlanDraftSchema` e tipos inferidos. O payload reutiliza os limites atuais e exige pelo menos um exercício em cada dia, como o editor atual. Séries 1–20 inteiras, repetições 1–20 caracteres, carga opcional 0–1000 kg, descanso opcional 0–600 s inteiro, nome 1–200, dia 1–50, 1–7 dias, notas de plano até 2000, notas de exercício até 500 e tempo recebido até 10 caracteres. Textos obrigatórios aparados não podem ficar vazios. Ordens são normalizadas pela aplicação. Nenhuma regra é relaxada para salvar rascunho.

Superfície HTTP proposta, restrita ao papel `trainer`:

| Operação | Contrato |
| --- | --- |
| `GET /students/:studentId/workout-plan-drafts` | `{ items: WorkoutPlanDraft[] }`, somente drafts do professor no aluno autorizado |
| `POST /workout-plan-drafts` | `{ studentId, sourcePlanId?, draftId?, payload, selectedDayOrder, revision? }`; cria sem ID/revisão ou atualiza por ID+revisão; devolve draft confirmado |
| `GET /workout-plan-drafts/:id` | Draft autorizado para retomada; não oferece dados de outra conta |
| `POST /workout-plan-drafts/:id/publish` | `{ payload, revision }`; publica o estado atual completo como ativo e consome draft atomicamente; devolve plano completo |

`revision` inteiro inicia em 1 e incrementa em cada save. Atualização exige o `draftId` exato e sua revisão; os dois campos são enviados juntos. Criação omite ambos. ID inexistente/consumido ou revisão stale retorna 409 e preserva qualquer draft atual do contexto. Isso impede uma instalação antiga de sobrescrever um draft recém-criado depois da publicação/consumo do anterior. Listagem/obtenção permitem retomar e obter revisão atual. Erro de contexto/ownership usa 404; papel incorreto 403; payload inválido 400. Draft de edição exige plano original do mesmo professor e aluno, não arquivado, tanto ao salvar como ao publicar.

`WorkoutPlanDraft` devolve também `exerciseReferences: Array<{ id: string; name: string; muscleGroup: string }>`, resolvidos pelo servidor para os IDs usados. A retomada não depende da primeira página do catálogo nem conserva nomes arbitrários enviados pelo cliente. IDs inexistentes ou exercícios privados de outro professor devem ser rejeitados antes da persistência/publicação.

Repository Drizzle concentra transação de publicação: bloqueia a linha do draft, confirma revisão/contexto, grava o plano, remove o draft e devolve plano completo. Repetição após consumo retorna 404/409 e jamais cria outro plano. Falha em qualquer escrita faz rollback e mantém draft/publicado. Casos de uso dependem de portas pequenas; não chamam outros casos de uso concretos. Se necessário, extrair operações de escrita já existentes para helper transacional de repositório, sem duplicar regra em rotas.

Publicar uma edição não pode apagar o histórico de treino. `workout_days` recebe `isCurrent` com default `true`; ao substituir a prescrição, as linhas atuais passam a `false` e novas linhas atuais são inseridas na mesma transação. Consultas de planos expõem somente dias atuais, enquanto consultas de logs continuam lendo as referências históricas. Início de um novo log com um dia antigo é recusado. O update existente de planos usa a mesma estratégia; excluir um plano continua fora deste escopo.

## Comportamento do editor e navegação

Criação começa com nome/notas vazios e um Treino A sem exercícios. O seletor Ativo/Rascunho desaparece; salvar normalmente sempre conclui como ativo. Valores iniciais do catálogo permanecem 3 séries e 10 repetições, com opcionais vazios. Edição preserva `tempo` recebido, datas e vínculo original. Não há navegação automática após salvar; feedback de criação/edição permanece no editor, e retorno existe somente no header.

Estado semântico inicial e baseline confirmado permitem calcular dirty sem depender de IDs locais. Restaurar valores originais limpa a alteração; uma hidratação/refetch tardia não sobrescreve edição local. Na retomada de draft, informar `Rascunho recuperado da sua conta`; o draft não é consumido só por abrir o editor.

Header, Back/gesto e mudança de tela passam pelo mesmo guard existente de React Navigation. Sem alterações, sair diretamente. Com alterações, abrir sheet com `Salvar rascunho e sair`, `Continuar editando` e `Descartar e sair`. Dispensar por scrim/Back equivale a continuar. Save valida primeiro; inválido mantém valores e apresenta primeira falha global, com caminho claro para voltar ao editor. Save em andamento bloqueia reentrada, campos, descarte, dispensa e saída. Somente resposta confirmada libera a ação de navegação capturada. Falha mantém sheet/valores e oferece `Tentar salvar e sair`.

Descartar abandona somente alterações locais pendentes. Não apaga nem modifica o plano publicado, nem apaga um draft confirmado anteriormente. Salvar um draft existente em saída envia sempre seu `draftId` exato e `revision` atuais; um draft ainda não persistido omite ambos. Save normal de draft retomado chama a publicação transacional com o estado atual; save normal sem draft usa create/update existentes. Após sucesso, guardar baseline confirmado e invalidar listas, detalhes e resumos pertinentes. Falha de invalidação após gravação não deve ser apresentada como se nenhum dado tivesse sido salvo; manter evidência do sucesso e permitir recuperação de consulta.

Retomada é descoberta na lista de treinos do professor: uma seção/linha identificada como rascunho da conta oferece continuar, com nome e contexto de criação/edição. Abrir encaminha `draftId` ao editor existente e hidrata payload e dia selecionado. Drafts separados nunca são misturados ao retorno `/students/me/workout-plans`.

## Apresentação e estados preservados

Lista/detalhe/editor usam header contextual com retorno e reload únicos. Reload fica visível e desabilitado em fetch, contexto inválido, indisponibilidade definitiva ou edição local. Loading principal possui um único indicador. Falha de atualização mantém dados anteriores; 404 e divergência de aluno ocultam dados anteriores antes de qualquer conteúdo privado. Arquivado é leitura e bloqueia acesso direto ao editor.

Lista mostra nome/status/período/criação, sem busca/filtro/paginação. Detalhe respeita ordem recebida, notas não vazias e opcionais ausentes sem zeros inventados; carga pt-BR até duas casas. Editor usa cartão branco de dia selecionado com nome/contagem/lápis/lixeira; abas somente selecionam e rolam horizontalmente. Adicionar dia seleciona o novo, limita sete. Único dia não pode ser removido; dia vazio remove diretamente e dia preenchido pede Alert nativo. Remover seleciona primeiro restante.

Prescrição fica em cartão claro com identificação/posição, duas colunas de campos, notas e ações compactas. Lápis foca edição inline. Estado de foco usa borda verde e `Editando exercício`; alteração de valores ou posição usa borda de atenção e `Alterações não salvas`, com prioridade sobre foco e conservação durante envio/falha. Restaurar baseline limpa essa indicação. Remover exercício é direto e reordenação bloqueia extremos.

Catálogo mantém busca local/aplicada, grupos existentes, limit 50, offset acumulado e seleção unitária. Fetch bloqueia busca/filtro/seleção; fechar permanece disponível. Retry inicial/paginação continua dentro do catálogo, sem reload de header. Fechar mantém busca/filtro do componente montado. Modal usa SheetSurface existente e altura máxima de 92% do viewport.

## Validação e riscos observáveis

Testes de contrato cobrem válidos/limites/invalidade, sem mudança no comportamento público dos schemas antigos. Testes de rota com PostgreSQL isolado cobrem ownership, papel, plano arquivado, persistência entre sessões, versão stale, rollback, repetição de publicação e conservação do ativo até publicar. Testes puros/UI cobrem dirty, normalização, guard compartilhado, bloqueio por promises adiadas, retomada e feedback. QA Android real via Maestro/ADB comprova teclado, scroll e saída; retomada usa nova instalação/sessão sem cache local, contra a mesma API/banco isolados.

O update atual de planos substituía dias e apagava logs e séries por cascade. A implementação desta issue arquiva logicamente os dias anteriores, preservando essas referências e expondo apenas a prescrição atual; testes verificam logs existentes e bloqueio de novos logs em dias antigos. Exclusão explícita do plano ainda remove seu histórico por cascade e permanece fora do escopo. Não declarar atomicidade, retomada cross-device ou QA visual sem evidência correspondente.

Entrega exige revisão independente do diff atual, checks/CI verdes e PR para `develop`, pronta para revisão humana, sem merge nem estado Done.
