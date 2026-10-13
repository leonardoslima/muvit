# Professor — Home e alunos v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar Início, Alunos e Detalhe do aluno do professor para o Pen aprovado da MUV-29, preservando busca, paginação, refresh, estados e navegação.

**Architecture:** Manter TanStack Query, services e rotas existentes. Compor o shell Screen com primitives v2 e componentes de apresentação do professor; estender somente props opcionais de Header/Button necessárias aos overrides aprovados. A camada de refresh vive no viewport e não substitui os dados nem duplica progresso.

**Tech Stack:** TypeScript, Expo 54, React Native 0.81, Expo Router 6, TanStack Query 5, NativeWind 4, Lucide, Vitest e React Native Testing Library existentes.

**Spec:** `docs/superpowers/specs/2026-10-13-muv-38-professor-home-alunos-v2-design.md`.

## Global Constraints

- Sem dependências novas, alterações de API, schema, ownership, status ou regras de acesso.
- Textos visíveis e documentação em pt-BR, com UTF-8 literal; não representar acentuação com escapes Unicode.
- Tokens canônicos em `src/lib/design-system/tokens.ts`; DM Sans, papel `#F6F5EF`, texto `#15372E`, verde `#2F6B50`, lima `#C9F36C` e superfícies existentes.
- Primitives visuais em `src/components/ui/v2`; sem aliases ou shims do legado.
- `Screen` existente continua sendo a borda de layout/safe area do shell; a migração não duplica inset, tab bar, gutter ou padding inferior.
- Gutter de 16 dp; ações de ícone com alvo mínimo de 48 × 48 dp; textos essenciais sem truncamento imposto.
- Layout rolável em 320/390/430 dp, preservando escala de fonte do sistema e teclado nativo.
- Consultas, query keys, AbortSignal, identidade Better Auth e rotas existentes permanecem sob seus contratos atuais.

## Review Focus

1. Total positivo com ativos zero deve renderizar carteira e indicadores, sem falso vazio: teste na tarefa 2.
2. Falha ou loading da próxima página deve conservar itens e impedir refresh concorrente, sem overlay de refresh: teste na tarefa 3.
3. Um 404 depois de dado carregado deve ocultar o aluno anterior e seus acessos: teste na tarefa 4.
4. Retry sem dados deve manter header e um progresso; a ação do StatePanel não deve duplicar reload/retorno: testes nas tarefas 1–4.
5. Nomes/contatos extensos e status pausado/inativo não devem truncar texto nem bloquear destinos existentes: testes nas tarefas 3/4 e comparação nativa na tarefa 5.

## Arquivos e responsabilidades

Todos os caminhos abaixo são relativos à raiz; comandos partem da raiz. A worktree atual já está isolada e pertence ao executor principal; não criar outra. Antes de setup/testes/build, confirmar os `.env` ignorados copiados da origem conforme AGENTS.

| Arquivo | Responsabilidade |
| --- | --- |
| `apps/mobile/src/components/ui/v2/header.tsx` | `titleClassName` opcional, sem alterar defaults |
| `apps/mobile/src/components/ui/v2/button.tsx` | `leading` e `labelClassName` opcionais, preservando controle/loading |
| `apps/mobile/src/components/ui/v2/actions.test.tsx` e `README.md` | Contratos/events e documentação das props novas |
| `apps/mobile/src/components/trainer/trainer-screen.tsx` e `.test.tsx` | Composição de header/shell e overlay de refresh |
| `apps/mobile/src/components/trainer/trainer-metric-card.tsx` | Indicador informativo v2 |
| `apps/mobile/src/screens/trainer-home.tsx` e `.test.tsx` | Carteira, indicadores e estados de Home |
| `apps/mobile/src/components/trainer/student-list-item.tsx` e `.test.tsx` | Linha tocável v2 e status compartilhado |
| `apps/mobile/src/components/trainer/student-status-badge.tsx` | Badge de status v2 e apresentação compacta |
| `apps/mobile/src/screens/trainer-students.tsx` e `.test.tsx` | Busca, lista, paginação, refresh e estados |
| `apps/mobile/src/components/trainer/student-action-button.tsx` e `.test.tsx` | Acessos do detalhe com ícones e cores aprovados |
| `apps/mobile/src/screens/trainer-student-detail.tsx` e `.test.tsx` | Identidade, dados, destinos e estados de detalhe |

`trainer-data.ts`, schemas, API, autenticação, layouts de navegação e telas internas de avaliações/treinos são referências, sem alteração planejada. O único import mantido de `components/ui` nas telas migradas é indireto pelo TrainerScreen para o componente de shell `Screen`; os controles visuais usam v2.

### Task 1: Composição de tela e overrides de primitives v2

**Files:** Modificar `header.tsx`, `button.tsx`, `actions.test.tsx` e `README.md` acima; criar `trainer-screen.tsx` e `trainer-screen.test.tsx`.

**Interfaces:**
- Consome: `ScreenProps`, `HeaderProps`, `ButtonProps`, `Action` e tokens existentes.
- Produz: `HeaderProps.titleClassName?: string`, `ButtonProps.leading?: ReactNode`, `ButtonProps.labelClassName?: string`.
- Produz: `TrainerScreen(props: TrainerScreenProps): React.JSX.Element`, com `TrainerScreenProps = { title: string; subtitle?: string; contextual?: boolean; onBack?: () => void; onRefresh: () => void; refreshDisabled: boolean; refreshing?: boolean; children: ReactNode }`.

- [ ] **Step 1: Adicionar testes que falhem para os contratos de composição.**

Em `actions.test.tsx`, renderizar Header com `titleClassName="text-[15px]"` e conferir a classe no título, preservando callbacks e defaults da sessão. Renderizar Button com leading identificável e label longo; o leading aparece em repouso, loading o substitui por exatamente um progressbar, disabled bloqueia callback e label completo permanece. Em `trainer-screen.test.tsx`, verificar header em repouso/loading/erro, rótulo “Voltar para alunos” no modo contextual, reload acessível “Atualizar” estático/desativado, overlay “Atualizando” somente quando `refreshing`, um progressbar, conteúdo anterior ainda presente e callbacks de retorno/atualização.

- [ ] **Step 2: Executar os testes focados e registrar o RED relevante.**

Run: `pnpm.cmd --dir apps/mobile test src/components/ui/v2/actions.test.tsx src/components/trainer/trainer-screen.test.tsx`.
Expected: falhas dos contratos ainda ausentes; erro de ambiente não conta como RED funcional.

- [ ] **Step 3: Implementar os contratos e documentá-los.**

Adicionar as props opcionais sem modificar apresentação dos consumidores que não as usam. Button com leading dispensa slots vazios de balanceamento; loading mantém um único progresso. TrainerScreen recebe estado pronto do caller, compõe Screen e Header, passa `titleClassName` contextual de 15 dp ou título principal 30 dp/26 dp em largura até 320 dp, subtítulo 14 dp e gap do header 12 dp. Usar largura real disponível, sem armazenar estado visual global. A altura mínima contextual é 48 dp; não impor altura máxima com fonte ampliada.

Overlay absoluto cobre o viewport da tela, conservando shell/conteúdo e sem Modal; `pointerEvents="none"` permite navegação existente. Usar tokens para superfície, texto e espaçamento, com live region e um ActivityIndicator acessível. Não passar loading ao reload. Remover padding inferior específico de telas; Screen já reserva tab bar/safe area. Atualizar README das props públicas.

- [ ] **Step 4: Reexecutar a seleção da Step 2.**

Expected: PASS, incluindo os testes prévios de default/session/disabled/events.

- [ ] **Step 5: Registrar checkpoint de implementação no fluxo do executor.**

Commit sugerido após revisão do diff: `refactor(mobile): compor consultas do professor com primitives v2`.

### Task 2: Home e carteira do professor

**Files:** Modificar `trainer-metric-card.tsx`, `trainer-home.tsx`, `trainer-home.test.tsx`.

**Interfaces:**
- Consome: TrainerScreen da tarefa 1; `getTrainerSummary(api: ApiRequester, signal?: AbortSignal): Promise<TrainerSummary>` existente.
- Produz: `TrainerHomeScreen(): React.JSX.Element` e contrato existente `TrainerMetricCard({ label, value, description }: TrainerMetricCardProps)` preservado; nenhuma query nova.

- [ ] **Step 1: Adaptar e completar testes de Home antes da migração.**

Preservar as provas de endpoint, indicadores, navegação e erro tardio. Retry passa a pressionar somente o reload “Atualizar” no header; conferir ausência de Tentar novamente no corpo. Testar `total: 0` sem Ver alunos e `total: 2, active: 0, paused: 1, inactive: 1` com carteira/Ver alunos. Com promise pendente de refresh, conferir valores anteriores, um progresso, reload desativado e callback sem reentrada; após erro, mensagem v2 e valores preservados. Loading inicial conserva título Início e reload desativado.

- [ ] **Step 2: Rodar `pnpm.cmd --dir apps/mobile test src/screens/trainer-home.test.tsx` e registrar falhas esperadas.**

- [ ] **Step 3: Migrar composição e indicadores.**

Usar TrainerScreen e v2 Text/Card/Button/StatePanel/Message, sem imports de styles legados. Conservar query key `['trainer', 'summary']`. Carteira destacada com padding 24, raio 26, valor 50/44 dp, total, pausados e inativos e Ver alunos interno de 52 dp. Indicadores em superfície sutil, gap 12, padding 16, valores 30/26 dp e labels 14. Usar `penTokens` existentes para os tamanhos presentes no catálogo; 44 dp é override documentado do Pen estreito, sem criar um token global novo. Textos e contagens vêm da API. Manter Link/rota existente e total como definição de vazio.

- [ ] **Step 4: Rodar novamente o teste focado; resultado esperado PASS.**

- [ ] **Step 5: Revisar o diff e registrar checkpoint.**

Commit sugerido: `feat(mobile): migrar carteira do professor para UI v2`.

### Task 3: Lista, busca e paginação

**Files:** Modificar `student-list-item.tsx`, `student-status-badge.tsx`, `student-list-item.test.tsx`, `trainer-students.tsx` e `trainer-students.test.tsx`.

**Interfaces:**
- Consome: TrainerScreen da tarefa 1; `listTrainerStudents(api, input: ListTrainerStudentsInput): Promise<TrainerStudentsPage>` e `TRAINER_STUDENTS_PAGE_SIZE = 25` existentes.
- Produz: `StudentListItem({ student, onPress }: StudentListItemProps): React.JSX.Element`, com props existentes.
- Produz: `StudentStatusBadge({ status, compact = false }: { status: TrainerStudent['status']; compact?: boolean }): React.JSX.Element`.
- Produz: `TrainerStudentsScreen(): React.JSX.Element`, com query keys e parâmetros existentes.

- [ ] **Step 1: Atualizar testes de lista para a recuperação pelo header e os casos omitidos.**

Conservar testes existentes de busca explícita/Search, offsets reais, limpezas, vazio, retry de próxima página e bloqueios concorrentes. Acrescentar trim (`'  Ana Júlia  '` → `q=Ana%20J%C3%BAlia&limit=25&offset=0`), busca nova depois de páginas carregadas começa em offset 0 e busca vazia apresenta exatamente um Limpar busca. Durante próxima página/retry: itens preservados, reload desativado, ausência de overlay Atualizando, um progresso próprio da paginação. Refresh com dados: um overlay, paginação bloqueada, sem spinner no reload. Loading/erro inicial: Alunos/header presentes, reload desativado/acionável, sem Tentar novamente no corpo. Fim da lista sem Carregar mais e com mensagem Todos os alunos carregados.

Em `student-list-item.test.tsx`, preservar precedência de contato, iniciais AL, três status e callback Abrir nome. Acrescentar nome/e-mail extensos sem `numberOfLines`, linha com um único alvo e status pausado/inativo com texto/ícone; badge compacto não muda o texto.

- [ ] **Step 2: Executar seleção focada e registrar o RED.**

Run: `pnpm.cmd --dir apps/mobile test src/screens/trainer-students.test.tsx src/components/trainer/student-list-item.test.tsx`.

- [ ] **Step 3: Migrar lista e componentes sem reescrever a consulta.**

Compor Field search, Button compact, mensagens e StatePanel v2. Manter `searchInput`/`appliedSearch`, paginação pelo número real de itens, flags distintas de erros de refresh e próxima página e limite 25. O overlay usa `query.isRefetching && !query.isFetchingNextPage && Boolean(query.data)`; reload e ações de paginação recebem `disabled={query.isFetching}`. Contagem e status informativos; um Limpar busca junto ao formulário.

StudentListItem torna-se linha com separador, avatar 48, nome 17/16, contato 13, status abaixo do contato e chevron lateral, sem card individual. Pressable/controle v2 preserva foco e feedback de toque, sem alvos aninhados. Badge v2 mapeia active→Ativo, paused→Pausado e inactive→Inativo; aplicar overrides informativos do Pen para Inativo, mantendo o nome do status. `compact` ajusta padding 4/8 e mínimo 24 somente para identidade. Texto extenso quebra e cresce; sem ellipsis. O hint herdado do Field fica oculto, conforme as capturas. A screen não recebe regra de domínio nova.

- [ ] **Step 4: Reexecutar seleção focada; resultado esperado PASS.**

- [ ] **Step 5: Revisar o diff e registrar checkpoint.**

Commit sugerido: `feat(mobile): migrar alunos e busca do professor para UI v2`.

### Task 4: Detalhe e acessos do aluno

**Files:** Criar `student-action-button.tsx` e `student-action-button.test.tsx`; modificar `trainer-student-detail.tsx` e `trainer-student-detail.test.tsx`.

**Interfaces:**
- Consome: TrainerScreen, StudentStatusBadge compacto e Button v2 das tarefas anteriores; `getTrainerStudent(api, studentId: string, signal?: AbortSignal): Promise<TrainerStudent>` existente.
- Produz: `StudentActionButton({ label, kind, onPress }: { label: string; kind: 'history' | 'assessment' | 'workouts' | 'workout'; onPress: () => void }): React.JSX.Element`.
- Produz: `TrainerStudentDetailScreen(): React.JSX.Element`, preservando os quatro destinos e `router.replace('/trainer/students')` no retorno.

- [ ] **Step 1: Completar testes do detalhe e ações antes da implementação.**

Conservar fallbacks, data/gênero, erro genérico com dados e navegação já cobertos. Retry inicial usa reload no header, sem Tentar novamente no corpo. ID ausente não chama API; header Alunos/retorno presente e reload desativado. 404 inicial e 404 após sucesso escondem nome/contato/quatro acessos, mantêm retorno e reload desativado. Testar primeiro sucesso seguido de 404 por refetch com QueryClient real do teste. Loading/retry e refresh mostram exatamente um progresso, com header estático. Dados parciais mostram Não informado apenas nos campos ausentes.

Parametrizar status paused/inactive e nomes/contatos longos: quatro botões continuam presentes e cada um faz push com o mesmo `studentId`, sem requests extras; retorno faz replace. `student-action-button.test.tsx` confere os quatro labels/callbacks, ícones decorativos sem nome acessível concorrente, ausência de truncamento e Button compact com leading.

- [ ] **Step 2: Executar seleção focada e registrar o RED.**

Run: `pnpm.cmd --dir apps/mobile test src/screens/trainer-student-detail.test.tsx src/components/trainer/student-action-button.test.tsx`.

- [ ] **Step 3: Implementar identidade, seções e acessos aprovados.**

Header contextual 48 dp mínimo, rótulo Alunos de 15, retorno/reload com 48. Identidade verde profundo, avatar lima 56, nome branco 24/20, badge compacto abaixo. Seções abertas, nascimento/gênero em linha adaptável, títulos 18/16 e conteúdo 15/14, gap de seção 20. Os pares de ações usam gap 12, Button compact, leading circular 24 com ícone 16 e label 14. Consultas usam branco/verde; criação verde profundo/branco e Plus/lima, sem mudar ações de negócio.

Conservar enabled por presença de ID, query key e formatadores. Calcular 404 antes de renderizar dados anteriores e impedir refresh inválido. O header precisa ser retornado por todos os branches. Remover retorno e atualizar do corpo, título grande Aluno e retry duplicado. Erro genérico com dados usa Message v2; sem dados usa StatePanel e recuperação no header. Não alterar arquivos internos de avaliações/treinos.

- [ ] **Step 4: Reexecutar seleção focada; resultado esperado PASS.**

- [ ] **Step 5: Revisar o diff e registrar checkpoint.**

Commit sugerido: `feat(mobile): migrar detalhe do aluno do professor para UI v2`.

### Task 5: Integração, verificação e revisão do resultado atual

**Files:** Revisar somente o conjunto das tarefas 1–4 e esta especificação/plano. Evidências temporárias externas ao repo; novos relatórios persistentes somente se o executor os exigir no seu fluxo.

**Interfaces:** Consome o diff integrado; produz evidência por comando/cenário/SHA, sem alterar contratos de produto.

- [ ] **Step 1: Conferir escopo, imports e UTF-8 do diff.**

Run: `git diff --check`.
Run: `rg -n '\\u[0-9a-fA-F]{4}'` com a lista explícita dos arquivos alterados.
Run: `rg -n 'lib/styles|components/ui/(button|card|field|inline-message|state-panel)' apps/mobile/src/screens/trainer-home.tsx apps/mobile/src/screens/trainer-students.tsx apps/mobile/src/screens/trainer-student-detail.tsx apps/mobile/src/components/trainer`.
Expected: whitespace limpo, nenhum escape usado para acentuação e nenhum controle migrado dependente de styles/primitives legados. A referência de Screen em TrainerScreen é a borda de shell documentada.

- [ ] **Step 2: Executar gates mobile e lint do diff.**

Run: `pnpm.cmd --dir apps/mobile test`.
Run: `pnpm.cmd --dir apps/mobile typecheck`.
Run: `pnpm.cmd --dir apps/mobile test:coverage:core`.
Run: `pnpm.cmd --dir apps/mobile test:coverage:ui`.
Run: `pnpm.cmd --dir apps/mobile doctor`.
Run: `pnpm.cmd exec biome check` com os caminhos TypeScript/TSX alterados.
Expected: todos os comandos passam, cobertura atende ao piso existente de 85%. Se houver falha preexistente, registrar saída, separá-la da mudança e corrigir apenas o necessário ao escopo. Não ampliar timeout/configuração global silenciosamente.

- [ ] **Step 3: Exportar bundle Android e executar jornada nativa com Maestro.**

Run: `pnpm.cmd --dir apps/mobile exec expo export --platform android --output-dir "$env:TEMP\muv-38-android-export"`.
Expected: export Metro/Android bem-sucedido; isso não substitui executar o app.

Usar a sessão trainer e a infraestrutura Android existentes do executor. Registrar Maestro em conta de teste autorizada para Home→Alunos→busca/Search→limpar→paginação/refresh→detalhe→quatro destinos→retorno. Verificar que status pausado/inativo não bloqueia acessos. Não alterar conta/ownership/status para fabricar cenários; dados e erros controlados em testes cobrem casos não reproduzíveis nativamente, que precisam ser identificados como limites.

- [ ] **Step 4: Comparar capturas atuais com Pen e verificar ergonomia.**

Referências temporárias: `C:/Users/Leonardo/AppData/Local/Temp/muv-38-pen-reference/{sPhAW,opQby,wyzdn,RSFzR,iJPiO,e2KHo}.png`. Comparar 390 e 320 dp e realizar adaptação 430 dp conforme `f9HmDi/uZVU6/oesMk`; testar fonte ampliada, teclado nativo, rolagem, ultimo acesso, header e tab bar. Registrar screenshots de normal/loading/erro/refresh, quando reproduzíveis, mais conteúdo extenso/contato parcial. A referência expandida do canvas não define altura fixa de aparelho. Anotar SHA e cenários indisponíveis; não afirmar aprovação visual com base só em testes ou export.

- [ ] **Step 5: Encaminhar revisão independente de código e UI/UX ao coordenador.**

Revisores avaliam o SHA atual e a matriz da especificação. Tratar findings no escopo, repetir somente os gates afetados após correções e entregar resultado concreto ao executor principal. A execução autônoma já define o método e dispensa confirmação humana intermediária. Publicação/PR/Linear permanecem responsabilidade do executor principal conforme a skill Muvit; este planner não os modifica.

## Self-review do plano

Cobertura da especificação: composição/estados comuns na tarefa 1; carteira/métricas na tarefa 2; busca/páginas/status na tarefa 3; detalhe/fallbacks/rotas/404 na tarefa 4; ergonomia/gates/evidência atual na tarefa 5. Interfaces foram reconciliadas entre tarefas; nomes e props de v2 conferidos no código. Os cinco riscos de Review Focus possuem teste e responsável. O plano não exige alteração de API, testes executados pelo planner, refatoração de fluxo fora do card ou nova aprovação intermediária. Passos de execução são verificações a realizar, não evidência de sucesso já obtido.
