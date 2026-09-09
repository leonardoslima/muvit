## Objetivo

Auditar e corrigir inconsistências relevantes de UX, interação e apresentação nos fluxos mobile de aluno e professor/personal, deixando o app pronto para a validação E2E da <issue id="a4aefb83-c2da-4dd7-a6ab-3b45bbeb067d" href="https://linear.app/muvit/issue/MUV-14/criar-e2e-dos-fluxos-principais-de-aluno-e-professor-no-mobile">MUV-14</issue> sem ampliar o escopo funcional do MVP.

## Base e referências

* Branch base: develop, contendo <issue id="a0cd3a3d-93da-4392-ae17-c31d6be0985d" href="https://linear.app/muvit/issue/MUV-8/implementar-e-refinar-experiencia-do-aluno-no-expo-com-impeccable">MUV-8</issue>, <issue id="d20f40a7-2db8-4dd2-a9e3-8df7f6f6d642" href="https://linear.app/muvit/issue/MUV-16/habilitar-acesso-e-navegacao-do-professor-no-app-mobile">MUV-16</issue>, <issue id="b8ac518f-83c7-43f6-bd46-7d5fc40ac92f" href="https://linear.app/muvit/issue/MUV-17/implementar-home-e-gestao-de-alunos-do-professor-no-mobile">MUV-17</issue>, <issue id="580d4ce4-e25a-424c-9f22-bcbddd26e6c7" href="https://linear.app/muvit/issue/MUV-18/implementar-avaliacoes-de-alunos-para-professor-no-mobile">MUV-18</issue>, <issue id="9e8c211d-7268-43e0-b45c-73d8aa0557e7" href="https://linear.app/muvit/issue/MUV-19/implementar-gestao-de-treinos-e-exercicios-do-professor-no-mobile">MUV-19</issue> e <issue id="dd7c0698-d086-4c28-b67b-bf2e593e765c" href="https://linear.app/muvit/issue/MUV-20/consolidar-foundation-visual-mobile-com-impeccable">MUV-20</issue> concluídas.
* Referências normativas: PRODUCT.md, DESIGN.md, apps/mobile/AGENTS.md e o próprio card <issue id="e8c6e73f-b8c6-4778-8fdb-d43397a3b263" href="https://linear.app/muvit/issue/MUV-9/auditar-e-polir-ux-do-app-mobile-com-impeccable">MUV-9</issue>.
* Não existe spec separada para esta tarefa; o card já define o contrato funcional e este documento operacionaliza a auditoria.
* Impeccable é ferramenta de apoio à auditoria e ao polish, não um gatilho para redesign.

## Restrições globais

* Não alterar regras de negócio, contratos REST, validators, banco, autenticação, autorização, ownership, storage, journal offline ou políticas de role.
* Não criar funcionalidades novas para resolver achados; necessidade funcional nova vira card separado.
* Preservar loading, vazio, erro, retry, offline, sucesso, retomada, confirmação de saída, sincronização pendente e conclusão quando aplicáveis.
* Reutilizar apps/mobile/src/lib/styles.ts, apps/mobile/src/components/ui e componentes de domínio existentes.
* Preservar safe area, inset da tab bar, teclado, scroll e touch targets mínimos de 48dp.
* Textos visíveis permanecem em pt-BR com UTF-8 literal.
* Para defeitos comportamentais reproduzíveis, adicionar ou ajustar regressão automatizada quando houver superfície adequada.
* Não mexer em telas aprovadas pela auditoria apenas por preferência estética.

## Classificação dos achados

* P0 / Critical: crash, bloqueio de fluxo, perda de progresso, role errada, ação essencial inacessível ou estado inseguro. Bloqueia conclusão.
* P1 / Important: interação ambígua, estado sem tratamento útil, teclado cobrindo ação, overflow, safe area, touch target, feedback assíncrono ou divergência visual relevante. Bloqueia conclusão.
* P2 / Minor: cosmético e não bloqueante. Corrigir apenas se localizado e de baixo risco.
* Out of scope: regra de negócio, contrato, nova feature ou redesign. Registrar separadamente e não implementar na <issue id="e8c6e73f-b8c6-4778-8fdb-d43397a3b263" href="https://linear.app/muvit/issue/MUV-9/auditar-e-polir-ux-do-app-mobile-com-impeccable">MUV-9</issue>.

## Task 1 — Baseline e auditoria

1. Antes de alterar código, executar:
   * pnpm.cmd --dir apps/mobile test
   * pnpm.cmd --dir apps/mobile typecheck
   * pnpm.cmd --dir apps/mobile doctor
2. Auditar primitives e shell compartilhado com Impeccable:
   * Screen / safe area / scroll / tab bar inset
   * AppButton / disabled / touch target / feedback de toque
   * Field / teclado / unidade / foco / erro
   * StatePanel / loading / empty / error / retry
   * InlineMessage / success / warning / error / acessibilidade
   * AppTabs / seleção / labels / inset
   * tipografia / spacing / tokens / contraste
3. Auditar autenticação e entrada por role.
4. Auditar aluno: Hoje, overview, sessão guiada, registro, salvar/sair, retomar, concluir/sincronizar, Progresso, Nova avaliação e Perfil.
5. Auditar trainer: Home, Alunos, busca, paginação, refresh, detalhe, Avaliações, nova avaliação, Treinos, detalhe, criação/edição e Perfil.
6. Exercitar pelo menos phone Android padrão e cenário reduzido/font scale quando possível.
7. Consolidar worklist transitória com ID, fluxo, severidade, reprodução, evidência, arquivos prováveis e validação esperada.

Somente P0/P1 entram obrigatoriamente na fila de correção. P2 é opcional e out-of-scope não entra no diff.

## Task 2 — Corrigir achados compartilhados

Priorizar correção no nível compartilhado mais baixo quando o problema aparece em múltiplas telas: styles, Button, Field, Screen, StatePanel, InlineMessage ou AppTabs.

Para cada defeito automatizável:

1. escrever a regressão;
2. confirmar a falha;
3. aplicar a menor correção;
4. confirmar o teste verde;
5. rodar os testes de UI/navigation afetados.

Não mudar props públicas ou comportamento de domínio sem necessidade.

## Task 3 — Corrigir P0/P1 do aluno

Cobrir apenas achados confirmados em:

* login/signup;
* Hoje e visão geral;
* sessão guiada e registro;
* Progresso;
* Nova avaliação;
* Perfil.

Preservar /students/me/*, cache, rascunho, journal, tombstones e Better Auth.

Regressão direcionada:
pnpm.cmd --dir apps/mobile test src/**tests**/auth-screens.test.tsx src/screens/today-workout.test.tsx src/screens/workout-overview.test.tsx src/screens/log-workout.test.tsx src/screens/progress.test.tsx src/screens/new-assessment.test.tsx src/screens/profile.test.tsx

Depois, reexecutar manualmente a jornada principal do aluno e confirmar zero P0/P1 restante.

## Task 4 — Corrigir P0/P1 do professor/personal

Cobrir apenas achados confirmados em:

* Home;
* carteira de alunos;
* detalhe do aluno;
* avaliações;
* nova avaliação;
* treinos;
* catálogo/editor;
* Perfil.

Preservar ownership e autorização no backend, contratos existentes e isolamento de role. Não adicionar CRUD de exercícios, storage offline do editor ou novas regras de plano ativo.

Regressão direcionada:
pnpm.cmd --dir apps/mobile test src/screens/trainer-home.test.tsx src/screens/trainer-students.test.tsx src/screens/trainer-student-detail.test.tsx src/screens/trainer-assessments.test.tsx src/screens/trainer-assessment-detail.test.tsx src/screens/trainer-new-assessment.test.tsx src/screens/trainer-workouts.test.tsx src/screens/trainer-workout-detail.test.tsx src/screens/trainer-workout-editor.test.tsx

Depois, reexecutar manualmente a jornada principal do trainer e confirmar zero P0/P1 restante.

## Task 5 — Gate final e handoff para <issue id="a4aefb83-c2da-4dd7-a6ab-3b45bbeb067d" href="https://linear.app/muvit/issue/MUV-14/criar-e2e-dos-fluxos-principais-de-aluno-e-professor-no-mobile">MUV-14</issue>

1. Repetir auditoria somente nas superfícies alteradas.
2. Encerrar a worklist com:
   * P0: 0 aberto
   * P1: 0 aberto
   * P2: corrigido ou explicitamente não bloqueante
   * out-of-scope: não implementado na <issue id="e8c6e73f-b8c6-4778-8fdb-d43397a3b263" href="https://linear.app/muvit/issue/MUV-9/auditar-e-polir-ux-do-app-mobile-com-impeccable">MUV-9</issue>
3. Rodar:
   * pnpm.cmd --dir apps/mobile test
   * pnpm.cmd --dir apps/mobile test:coverage:core
   * pnpm.cmd --dir apps/mobile test:coverage:ui
   * pnpm.cmd --dir apps/mobile typecheck
   * pnpm.cmd exec biome check apps/mobile
   * pnpm.cmd --dir apps/mobile doctor
   * git diff --check
4. Confirmar UTF-8 literal e ausência de expansão funcional em apps/api, packages/db e packages/validators.
5. Smoke Maestro mínimo:
   * aluno: login → Hoje → treino → sessão → saída/conclusão → Progresso
   * trainer: login → Home → Alunos → detalhe → Avaliações → Treinos
6. Revalidar teclado, scroll, safe area e tabs em viewport padrão e reduzido.
7. Registrar no handoff quantidade de P0/P1, áreas corrigidas, P2 não bloqueantes, itens out-of-scope, comandos executados, cenários Maestro e limitações de dispositivo/plataforma.

## Critério de conclusão

A <issue id="e8c6e73f-b8c6-4778-8fdb-d43397a3b263" href="https://linear.app/muvit/issue/MUV-9/auditar-e-polir-ux-do-app-mobile-com-impeccable">MUV-9</issue> só está pronta quando:

* aluno e trainer concluem os fluxos principais sem bloqueio ou ambiguidade relevante;
* P0/P1 estão resolvidos;
* estados funcionais relevantes estão tratados;
* não há problema relevante de teclado, overflow, safe area, touch target ou navegação;
* ações assíncronas têm feedback consistente;
* tokens/componentes permanecem coerentes com DESIGN.md;
* nenhuma feature/regra nova foi absorvida pelo polish;
* testes, coberturas, typecheck, Biome, Expo Doctor e diff check passam;
* validação manual foi executada e limitações foram registradas.

## Handoff de execução

Ao iniciar a task, salvar este plano no repositório em:

docs/superpowers/plans/2026-09-07-<issue id="e8c6e73f-b8c6-4778-8fdb-d43397a3b263" href="https://linear.app/muvit/issue/MUV-9/auditar-e-polir-ux-do-app-mobile-com-impeccable">MUV-9</issue>-mobile-ux-polish.md

Execução recomendada: superpowers:subagent-driven-development, com auditoria centralizada e workers focados por lote. Alternativa: superpowers:executing-plans com checkpoints sequenciais.
