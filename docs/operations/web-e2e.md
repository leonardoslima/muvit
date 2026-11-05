# E2E web do personal

A suíte verifica no Chromium a jornada do personal com API e PostgreSQL reais, além do isolamento entre treinadores. A execução é local e explícita; os testes web comuns não iniciam navegador. Não use um banco ou servidores compartilhados.

## Pré-requisitos

Node 24+, pnpm 10, Docker com daemon ativo e acesso à imagem `postgres:16-alpine`. Instale dependências e o navegador na raiz da worktree:

```powershell
pnpm install --frozen-lockfile
pnpm --dir apps/web exec playwright install chromium
```

A primeira execução compila pacotes e páginas, podendo demorar mais.

## Executar

```powershell
pnpm web:e2e --scenario all
pnpm web:e2e --scenario jornada --artifact-scope web-e2e
pnpm web:e2e --scenario isolamento --headed
pnpm web:e2e --scenario confirmacao-email
```

As portas padrão são Web 3013, API 3353 e PostgreSQL 5453. Altere com `--web-port`, `--api-port` e `--db-port`; precisam ser distintas e livres. `--artifact-scope` aceita slug minúsculo. O runner cria credenciais e container próprios, aplica migrations, compila runtime, inicia API e Next exclusivos e executa Playwright. O Next usa o lock desta worktree: se outra instância ocupar `.next/dev`, encerre-a pelo seu responsável e execute novamente; não remova seu lock manualmente. Não são usados seed demo, R2 real ou envio externo de e-mail. Um servidor exclusivo injeta a entrega em uma caixa em memória, acessível apenas localmente com credencial efêmera; o fluxo de confirmação e as contas das demais jornadas usam o link nativo capturado.

Por padrão o Next usa Turbopack. Se o virtual store físico do pnpm estiver fora da raiz observada pelo Turbopack e impedir a resolução de pacotes, acrescente `--webpack` ao comando do runner. O relatório registra o bundler utilizado; uma execução com webpack não valida Turbopack.

## Evidência e limpeza

Cada execução escreve relatório e logs em `artifacts/<escopo>/<data-hora-runId>/`. Capturas usam apenas contas artificiais após login. Não compartilhe capturas sem revisão; trace, HAR, vídeo e storage state estão desabilitados. Senhas, cookies e tokens não devem constar em logs ou relatórios.

O runner tenta encerrar seus processos e remover seu container e volumes em sucesso, erro e interrupção. Se o host ou o processo for encerrado abruptamente, encontre o `runId` no relatório e confira o container específico antes de removê-lo:

```powershell
docker ps -a --filter label=muvit.owner=muvit-web-e2e --filter label=muvit.run=<runId>
docker inspect muvit_web_e2e_<runId>_test
docker rm --force --volumes muvit_web_e2e_<runId>_test
```

O relatório registra falhas de limpeza em `cleanupErrors`, preservando o erro original. Uma interrupção ou timeout durante a criação do container pode deixar uma operação em andamento no daemon Docker mesmo após o cliente ser encerrado; nesse caso, `cleanupWarnings` orienta verificar novamente o `runId` antes de considerar a limpeza concluída.

No Unix, o runner encerra o grupo próprio de cada subprocesso; processos que criem outro grupo não estão cobertos. No Windows, usa `taskkill /T` enquanto o processo inicial ainda existe; se ele já tiver encerrado, não é possível garantir a identificação de descendentes remanescentes. A validação local não enviou sinais externos no Windows.

Confirme nome e labels `muvit.owner=muvit-web-e2e` e `muvit.run=<runId>` antes de remover; não remova outros containers. O runner não valida entrega real de e-mail, uploads, aplicativos móveis, outros navegadores ou execução de navegador em CI.
