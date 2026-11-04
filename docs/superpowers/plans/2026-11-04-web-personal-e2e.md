# E2E web do personal trainer — plano de implementação

> **Para o implementador:** usar `superpowers:executing-plans` para executar tarefa por tarefa no escopo delegado. Não iniciar agentes adicionais. Este documento não autoriza commit, push, PR ou alterações no Linear.

**Goal:** provar a jornada principal do personal no navegador real com persistência, isolamento e limpeza reproduzíveis.

**Architecture:** runner Node controla PostgreSQL 16 descartável, migrations, API real e Next dev próprios. Playwright prepara pré-requisitos por HTTP e executa as ações críticas pela UI, consultando os contratos HTTP existentes para confirmar persistência. Recursos são exclusivos por comando e contas/contextos por teste.

**Tech Stack:** Node 24+, pnpm 10, Playwright Test/Chromium, Next.js 16, Fastify, Better Auth, PostgreSQL 16, migrations Drizzle existentes.

**Spec:** `docs/superpowers/specs/2026-11-04-web-personal-e2e-design.md` e aceite do MUV-13.

## Restrições globais

- Preservar edições alheias; conferir Git antes de editar. Não alterar código de produto para destravar teste.
- Sem dependência de seed demo, SQLite, banco/servidor compartilhado, R2 real ou e-mail externo.
- Textos pt-BR em UTF-8 literal; sem `any` ou non-null assertion em TypeScript.
- Testes nomeados por funcionalidade, sem ID de card; ID somente nas evidências/histórico.
- Comandos executados na raiz. Não sobrescrever `.env`/`.env.test`; fornecer variáveis exclusivas aos subprocessos.
- Não transformar falha de UI em skip, retry permissivo ou chamada de API substituindo uma ação crítica.

## Foco de revisão

1. Falha no meio do setup e teste: cleanup de tudo que foi criado e exit code diferente de zero (tarefa 1).
2. Cookie real chega tanto ao navegador quanto às chamadas server-side; contexto novo não herda login (tarefas 2/3).
3. Salvamento não persiste vínculo/valores/status: releitura de UI e API deve falhar (tarefa 3).
4. Treinador B não vê aluno/plano de A e não consegue acessá-los por ID (tarefa 3).
5. Duas execuções consecutivas não colidem com contas, portas, container ou lock Next anterior (tarefas 1/3).

## Tarefa 1 — runner isolado e contrato operacional

**Criar:** `scripts/web-e2e.mjs`, `scripts/web-e2e.test.mjs`.

**Modificar:** `package.json` raiz (`web:e2e` e testes leves do runner), `apps/web/package.json` (devDependency `@playwright/test` e `test:e2e`), `pnpm-lock.yaml`.

**Interfaces produzidas:**

- `parseArgs(argv: string[])`: objeto com `ports: { web, api, db }`, `artifactScope`, `headed`, `scenario: 'all' | 'jornada' | 'isolamento'`; padrões `3013`, `3353`, `5453`, `web-e2e`, `false`, `all`. Validar portas distintas 1024–65535 e escopo como slug, rejeitar opções inválidas antes de criar recursos.
- `run(options)`: executa ambiente e Playwright, retorna relatório sem segredos e falha com exit code original em erro. `--help` somente imprime uso.
- Ambiente entregue a Playwright: `WEB_E2E_BASE_URL`, `WEB_E2E_API_URL`, `WEB_E2E_RUN_ID`, `WEB_E2E_ARTIFACT_DIR`, `WEB_E2E_SCENARIO`; não fornecer URL/secret do banco aos testes browser.
- Script raiz `web:e2e = node scripts/web-e2e.mjs`; script Web `test:e2e = playwright test --config=test/e2e/playwright.config.ts` (runner fornece ambiente obrigatório).

- [ ] Escrever testes Node do runner: argumentos inválidos não criam recursos; portas ocupadas são rejeitadas; container com label estrangeira não é removido; falha de migração/API/Next/Playwright libera recursos registrados; erro de cleanup impede sucesso; exit code de Playwright é preservado; sanitização e encerramento de subprocessos em Windows com caminho contendo espaços.
- [ ] Rodar os testes e conferir falha pela ausência das funções; implementar o runner mínimo e repetir.
- [ ] Reutilizar `runCommand`, `runWithResources`, `sanitizeRecursively` já exportados do runner mobile; manter específico no novo runner somente preflight, banco, processos Web/API e chamada Playwright. Se reutilização exigir mudar contratos mobile, parar esse refactor e manter o escopo da suíte web.
- [ ] Criar container `muvit_web_e2e_<runId>_test`, labels `muvit.owner=muvit-web-e2e` e `muvit.run=<runId>`, usuário/senha exclusivos e DB `muvit_web_e2e_test`. Publicar somente `127.0.0.1:<db>:5432`; conferir nome e labels antes de remover somente esse container/volumes.
- [ ] Aplicar `packages/db/src/migrate.ts` em subprocesso com `cwd=packages/db`, `--import tsx` e `DATABASE_URL` exclusiva. Usar builds runtime existentes: `pnpm.cmd --filter @muvit/api run build:runtime` antes dos serviços.
- [ ] Iniciar API via `node --import tsx src/server.ts`, `cwd=apps/api`, `NODE_ENV=test`, `API_HOST=127.0.0.1`, API_PORT próprio, BETTER_AUTH_URL próprio, WEB_URL própria, secret aleatório com 32+ caracteres, R2 com valores locais fictícios, `EMAIL_NOTIFICATIONS_ENABLED=false`, sem Resend. Aguardar `/health` com timeout e checar morte precoce.
- [ ] Iniciar Next pelo binário local com `next dev --hostname 127.0.0.1 --port <web>`, `NODE_ENV=development`, `NEXT_PUBLIC_API_URL=<api>` e telemetria desabilitada. Não reutilizar serviço ou sobrescrever lock `.next/dev`; abortar com diagnóstico se a worktree já estiver ocupada. Aguardar `/login`.
- [ ] Executar Playwright pelo script Web; registrar cleanup imediatamente após cada aquisição; tratar SIGINT/SIGTERM e sucesso/falha. Encerrar apenas PIDs/árvores de processos próprios, com janelas ocultas no Windows. Não usar kill global por nome.
- [ ] Gravar metadados, logs sanitizados, exit codes e relatório em `artifacts/<escopo>/<data-hora-runId>/`; manter senhas/secret/cookies apenas em memória. Não salvar trace/HAR/storage state/vídeo.

**Validação:** `node --test scripts/web-e2e.test.mjs scripts/mobile-e2e.test.mjs` deve terminar sem falhas. A chamada mobile garante que a reutilização dos exports não mudou seus contratos. Não executar Android.

## Tarefa 2 — Playwright e fixtures HTTP mínimas

**Criar:** `apps/web/test/e2e/playwright.config.ts`, `apps/web/test/e2e/fixtures.ts`.

**Interfaces produzidas:**

- Fixture estendida `test`/`expect` de Playwright com `account: { name: string; email: string; password: string; profileId: string }`, `catalogExercise: { id: string; name: string }`, `referenceDate: string` e `api: APIRequestContext` independente. Cada teste cria a própria conta, exercício e contexto vazio; `profileId` vem de `GET /trainers/me`, nunca de `user.id`.
- Helper `loginAs(page: Page, account: Account): Promise<void>` preenche `E-mail`, `Senha`, clica `Entrar` e exige `/dashboard` + nome visível. Não injeta cookie na página.
- Config valida variáveis obrigatórias, usa `testDir` atual e `*.spec.ts`, Chromium desktop, `workers: 1`, `retries: 0`, timeout explícito compatível com compilação inicial do Next e outputDir dentro dos artefatos. Não configurar `webServer` paralelo ao runner.

- [ ] Instalar `@playwright/test` somente como devDependency Web usando pnpm e gerar lockfile pelo gerenciador; instalar Chromium com `pnpm.cmd --dir apps/web exec playwright install chromium`. Resolver versão pelo registro oficial na implementação; não editar lock manualmente.
- [ ] Preparar conta trainer com `POST /api/auth/sign-up/email`, JSON `{ name, email, password, role: 'trainer' }` e `Origin: <web>`. E-mail único `web-e2e-<runId>-<testId>@example.invalid`; usar contexto API separado do navegador.
- [ ] Resolver perfil pelo endpoint público `/trainers/me`; preparar um exercício privado com `POST /exercises`, nome exclusivo, `muscleGroup: 'full_body'`. Reutilizar tipos/validators existentes onde aplicável.
- [ ] Disponibilizar contexto API autenticado para leituras posteriores; nunca imprimir header/cookie/token ou anexar request/response de autenticação. Fechar os contextos após cada teste; limpeza de contas/dados é a remoção automática do banco exclusivo ao fim do comando, inclusive em falha.
- [ ] Confirmar descoberta via `--list` com ambiente fornecido pelo runner ou teste isolado da configuração, sem iniciar recurso externo implicitamente. Confirmar que `pnpm.cmd --dir apps/web test` não coleta `*.spec.ts` de Playwright.

**Validação:** typecheck Web, testes Web existentes, runner unitário e listagem dos cenários devem passar; ambiente ausente deve falhar com mensagem clara. Falhas nesta etapa não equivalem a defeito de produto sem reprodução.

## Tarefa 3 — jornadas observáveis, regressão e documentação

**Criar:** `apps/web/test/e2e/personal-journey.spec.ts`, `apps/web/test/e2e/session-isolation.spec.ts`, `docs/operations/web-e2e.md`.

**Modificar:** `apps/web/AGENTS.md` somente para registrar comando, localização `*.spec.ts` e exigência do runner isolado.

**Consome:** fixtures/config da tarefa 2 e ambiente da tarefa 1. Não cria interfaces de produto.

- [ ] Criar teste `autentica e cadastra aluno, avaliação e plano ativo com persistência`, com passos de login → aluno → avaliação → treino → releitura.
- [ ] Partir de contexto sem sessão; login pelo formulário e navegação `Novo aluno`. Wizard: Nome completo `Aluno E2E <testId>`, e-mail único, `Continuar`, `Hipertrofia`, `3 dias`, `Cadastrar aluno`; exigir `Aluno cadastrado com sucesso`. Capturar studentId do link público `Ver perfil do aluno`, sem ler estado React.
- [ ] Clicar `Registrar avaliação`; preencher data explícita `referenceDate`, Peso `78.5`, Altura `170`, Observações da avaliação `Avaliação E2E <testId>`; salvar. Exigir URL do histórico, aluno correto e data/peso visíveis; recarregar e repetir assertions. Verificar observação no perfil do aluno após recarga e novo login, onde a UI a apresenta. Em `/students/<id>/assessments`, exigir exatamente uma avaliação com data, peso, altura e observação esperados; normalizar decimais de resposta para número.
- [ ] Voltar ao perfil e navegar pelo link de criar treino disponível na UI; escolher aluno pelo ID/nome, Nome do plano `Plano E2E <testId>`, Data inicial explícita. Conferir status inicial Rascunho e selecionar `Ativo` explicitamente. Adicionar exercício do catálogo pela busca/controle acessível; preencher Séries `3`, Repetições `12`, Carga `24`, Descanso `60`. Clicar `Salvar treino` e exigir `/workouts/<id>`.
- [ ] Exigir nome do plano, selo `Ativo`, dia `Treino A`, exercício e prescrição visíveis; recarregar e repetir. Consultar `GET /workout-plans/<id>` e exigir `studentId`, nome, `status: active`, `trainerId` se exposto, datas, um dia e um exercício com ID/séries/repetições/carga/descanso esperados. Conferir vínculo também via `GET /students/<id>/workout-plans` e `GET /students/<id>`.
- [ ] Fazer logout pelo botão `Sair`, login real novamente, abrir lista/busca do aluno, perfil, avaliações e plano pelos links visíveis; exigir os mesmos valores e IDs. Usar locators por label/role/texto; sem sleeps fixos, seletores CSS de estilo ou `force: true` para contornar interação.
- [ ] Criar teste independente `isola sessões e recursos entre treinadores`: sem sessão, URL protegida redireciona para login e API `/students` retorna 401. Preparar A/B e recurso estrangeiro por HTTP exclusivamente para este teste; login A, logout e login B no mesmo contexto de navegador. Lista/busca B não contém aluno A; URL direta do aluno/plano de A não mostra seus valores; API com sessão B retorna 404 nos recursos de A. Releitura por A confirma dados preservados. Não depender do resultado de `personal-journey.spec.ts`.
- [ ] Capturar evidência depois do login e ao final; em falha, apenas captura segura da etapa atual. Documentar limites das capturas e não ligar traces automaticamente.
- [ ] Executar duas chamadas completas consecutivas, cada uma com novo runId/DB/contas. Depois de cada uma, conferir ausência dos próprios containers/PIDs/portas e preservação de outros serviços. Testes automatizados do runner cobrem também caminho de falha.
- [ ] Demonstrar sensibilidade a regressão sem alterar produto: executar experimento temporário no próprio teste que omite a escolha Ativo ou espera status incompatível; exigir falha na assertion de ativação/persistência. Restaurar o teste e repetir execução verde. Documentar esse experimento em artifacts, sem deixar modo de falha artificial na suíte versionada.
- [ ] Escrever documentação com pré-requisitos, instalação Chromium, execução Windows/Unix, comandos por cenário, portas, ambiente automático, cleanup/recuperação por runId, evidências e limites. Reconciliar cada checkbox do aceite com resultado de execução; defeitos funcionais encontrados são reportados ao coordenador com passo mínimo/evidência e mantêm o E2E vermelho.

## Comandos finais de validação propostos

Executar na raiz após implementação, sem afirmar estes resultados durante o planejamento:

```powershell
node --test scripts/web-e2e.test.mjs scripts/mobile-e2e.test.mjs
pnpm.cmd --dir apps/web test
pnpm.cmd --dir apps/web typecheck
pnpm.cmd exec biome check scripts/web-e2e.mjs scripts/web-e2e.test.mjs apps/web package.json
pnpm.cmd web:e2e --scenario all --artifact-scope muv-13
pnpm.cmd web:e2e --scenario all --artifact-scope muv-13
pnpm.cmd --dir apps/web build
git diff --check
git diff --stat
git check-ignore -- artifacts/muv-13/probe.txt
git ls-files -- artifacts
```

Esperado: testes/checks exit 0, duas execuções completas aprovadas, relatório de limpeza sem resíduos próprios, nenhum artefato rastreado. Build Web exige runtime compilado e ambiente local previsto; registrar qualquer limitação concreta. Rodar API/db tests apenas se houver mudança inesperada nesses workspaces; não usar seu banco para o E2E. CI atual não executa navegador.

Antes do handoff, pesquisar `\\u[0-9a-fA-F]{4}` apenas nos arquivos alterados e remover escapes usados como acentuação. Preservar nomes de arquivos com colchetes/parênteses usando `-LiteralPath` no PowerShell. Revisar os dois documentos contra o aceite e registrar comandos/exit codes reais em `artifacts/muv-13/<execucao>/relatorio.md`.

## Obstáculos verificados e limites do planejamento

Playwright ainda não está instalado como dependência; é trabalho da tarefa 2, não falha de produto. Node, pnpm, Docker e dependências base estão disponíveis. A consulta de contexto compartilhado Linear falhou por ferramenta indisponível; descrição/aceite/relações da issue foram lidos. Não foi executado browser, build ou teste de produto nesta fase. A interpretação de ativação está explicitada no design e deve acompanhar a revisão do coordenador.
