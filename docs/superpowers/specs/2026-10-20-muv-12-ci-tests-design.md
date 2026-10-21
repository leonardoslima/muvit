# MUV-12 — Testes canônicos no CI

## Objetivo e escopo

Cada pull request deve executar `pnpm test` da raiz com PostgreSQL descartável e preparação automatizada do schema e dos dados necessários. Preservar lint, build e typecheck existentes. Não criar E2E, alterar contratos, introduzir dependências ou corrigir bugs funcionais revelados pela ampliação da suíte.

O planejamento segue brainstorming e writing-plans; o fluxo autônomo delegado permite produzir os dois documentos sem gates humanos intermediários. A implementação e a publicação pertencem ao agente principal.

## Contexto confirmado

- `.github/workflows/ci.yml` executa somente os testes mobile; os demais gates são `pnpm lint`, `pnpm build` e `pnpm typecheck`.
- O comando canônico `pnpm test` chama `turbo run test`, que inclui API, mobile, web, db, validators e config, conforme os scripts de cada workspace.
- `apps/api/package.json` aplica `@muvit/db migrate:test` antes do Vitest. Esse comando garante a existência do banco e aplica as migrations versionadas, inclusive Better Auth.
- API e DB exigem `.env.test`; seus exemplos apontam para o mesmo `postgres://muvit:muvit@localhost:5433/muvit_api_test`.
- Os testes da API criam seus próprios dados e limpam seu estado. O seed de demonstração não é pré-requisito da suíte e seu comando operacional envolve mídia no R2.
- A tarefa Turbo `test` usa cache por padrão. O ambiente estrito permite `NODE_ENV`, mas não encaminha arbitrariamente variáveis do shell; os comandos atuais carregam os arquivos de teste diretamente.

## Abordagens consideradas

1. **Reutilizar o bootstrap existente e adicionar service PostgreSQL no job:** menor mudança, mesma entrada local/CI e migrations reais. Escolhida.
2. Criar um script novo de bootstrap: acrescenta uma camada sem necessidade, pois os exemplos e `migrate:test` já cumprem essa responsabilidade.
3. Subir todo o Docker Compose ou usar banco externo: adiciona serviços, volumes ou credenciais sem necessidade e enfraquece o isolamento do runner.

## Desenho escolhido

Substituir o job de testes mobile por um job `test`, com nome `Test (Turborepo)`, dependente de `check`. Usar service `postgres_test` com imagem `postgres:16-alpine`, usuário e senha fictícios `muvit`, banco `muvit_api_test`, mapeamento `5433:5432` e healthcheck `pg_isready -U muvit -d muvit_api_test`. Não montar volumes persistentes. Cada job recebe seu próprio service descartado pelo GitHub Actions.

Após o install com lockfile congelado, copiar `apps/api/.env.test.example` e `packages/db/.env.test.example` para seus respectivos `.env.test`; executar literalmente `pnpm test` na raiz. Não exportar `DATABASE_URL` global nem copiar arquivos de produção. As migrations continuam pertencendo ao comando de teste da API; os dados mínimos continuam pertencendo às fixtures de cada suíte. Nenhum seed global deve executar antes dos testes.

Definir `cache: false` somente em `turbo.json#tasks.test`, mantendo `dependsOn: ["^build"]` e `outputs: []`. Assim, toda execução chama as suítes mesmo com cache anterior. Não ampliar `globalEnv`, desabilitar o ambiente estrito nem modificar o comando canônico.

Atualizar `build.needs` para `[check, test]`; `typecheck` continua dependente de `build`. Manter triggers, concorrência, Node 24, pnpm e demais gates. Falha no service, migrations ou testes deve falhar o job e impedir os gates dependentes; não usar `continue-on-error`, fallback ou retries para ocultar falhas.

Documentar no README a preparação do CI e a reprodução local. Ajustar a regra de `packages/db/AGENTS.md` para conservar `postgres_test` em `localhost:5433` como padrão compartilhado e permitir PostgreSQL descartável de QA/CI em porta dedicada, sempre com banco de teste e o mesmo destino nos dois `.env.test`. Isso torna explícita a validação local isolada, sem autorizar reset de serviços compartilhados.

## Verificação e aceite

- Executar `pnpm test` com os exemplos de ambiente e um PostgreSQL exclusivo, inicialmente vazio; logs devem mostrar migrations e todas as suítes aplicáveis, sem seed manual ou credenciais externas.
- Repetir `pnpm test` no mesmo ambiente para comprovar migrations idempotentes, dados próprios dos testes e execução real das suítes em vez de cache hit.
- Validar o grafo Turbo e o workflow: nenhuma tarefa `test` cacheável; build depende do novo job; lint, build e typecheck continuam presentes e verificáveis.
- Executar lint, build e typecheck; registrar comandos, resultados e limitações em `artifacts/muv-12/<execucao>/` conforme a convenção do projeto.
- A PR deve apresentar o job completo no GitHub Actions. Execução local não prova que o runner remoto passou. Se nomes de checks forem exigidos na proteção da branch, registrar a necessidade de alinhamento sem alterar essa configuração externa neste escopo.

## Limites e rollback

Falhas funcionais preexistentes reveladas por `pnpm test` devem ser reportadas separadamente; não excluir testes ou reduzir a suíte para obter verde. Não alterar migrations históricas, schema, seeds ou lógica de produto. O rollback se limita ao workflow, à configuração de cache e à documentação; não há migração operacional nem persistência nova.
