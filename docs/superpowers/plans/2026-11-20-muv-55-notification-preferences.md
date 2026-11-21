# MUV-55 Notification Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduzir e corrigir a falha confirmada de salvamento de 7 para 9 e provar persistência na reabertura em desenvolvimento e em build local de produção.

**Architecture:** Exercitar a Server Action compilada pelo Next com navegador, API e PostgreSQL reais no runner isolado. A reprodução confirmou que o loader tratava a reexportação local apagada como valor; remover essa passagem do tipo deixa o formulário importá-lo diretamente da aplicação e preserva a action exportada.

**Tech Stack:** Next 16.2.9, Turbopack, React, TypeScript, Fastify, PostgreSQL, Playwright, Vitest.

**Spec:** [Design do MUV-55](../specs/2026-11-20-muv-55-notification-preferences-design.md).

## Global Constraints

- Usar a worktree `muv-55` existente. Base do experimento `1571c087822fde01c1394980b55817dceb064263`. Execução inline dentro do papel delegado com TDD e diagnóstico sistemático. Seguir autoridade do coordenador para integração.
- Next 16.2.9 e Turbopack como comparação inicial em `next dev` e em `next build` seguido de `next start`. Mesmos passos e dependência resolvida, conta nova por execução, API e PostgreSQL descartáveis, portas livres e confirmadas. Manter o virtual store do pnpm padrão.
- Manter o contrato de `updateNotificationPreferencesAction`, validação, payload, textos, feedback, revalidação, SDK, API, esquema e banco. Zero dependências novas. Código e documentação em UTF-8 literal.
- Aplicar RED → GREEN → REFACTOR. Um defeito ambiental ou cenário já verde na base exige investigação antes de mudar produto.
- Usar `artifacts/muv-55/<execucao>/`, sem credenciais, cookies ou valores de ambiente. Preservar a reserva e deixar Linear com o coordenador.

## Review Focus

- A mensagem de sucesso pode aparecer com estado apenas local. A tarefa 1 faz GET e confere 9 após recarga e nova entrada.
- Um payload de formulário completo pode alterar preferências vizinhas. A tarefa 1 exige igualdade com a resposta anterior, exceto pelo novo prazo de inatividade.
- Um clique adicional durante a espera pode duplicar o envio. A tarefa 2 reexecuta o teste existente que verifica botão desabilitado e chamada única.
- Erro de campo ou falha na leitura deve continuar visível. A tarefa 2 reexecuta os cenários de campo vazio, acessibilidade do erro e falha do GET.
- Falha na compilação, preparação de fixture ou início do servidor pode impedir a reprodução. A tarefa 1 distingue cada etapa da falha observada na action.

---

### Task 1: Reproduzir no Next compilado

**Files:**

- Modify: `scripts/web-e2e.mjs` e `scripts/web-e2e.test.mjs` para execução explícita de produção.
- Modify: `docs/operations/web-e2e.md` para o comando e o significado de build local de produção.
- Test: `apps/web/test/e2e/personal-journey.spec.ts`.
- Read: `apps/web/test/e2e/fixtures.ts`, `apps/web/test/e2e/playwright.config.ts` e `apps/api/src/routes/notifications.ts`.

**Interfaces:** Reusar `test`, `expect` e `loginAs(page: Page, account: Account): Promise<void>` de `./fixtures`, com fixtures `page`, `account` e `api`. O runner mantém `--scenario jornada` e ganha `--production` (flag booleana, padrão falso).

- [x] **Preparar a prova de modos.** Em `scripts/web-e2e.test.mjs`, testar que `parseArgs([])` tem `production: false`, que `parseArgs(['--production'])` tem `production: true` e que `nextStartArgs(options)` produz `start --hostname 127.0.0.1 --port <porta web>`. Preservar testes dos argumentos de dev. Verificar RED com `node --test scripts/web-e2e.test.mjs`.
- [x] **Adicionar o modo isolado.** Implementar `--production` e `nextStartArgs(options)` em `scripts/web-e2e.mjs`. Na etapa `web`, executar via helper `command` o script `pnpm --dir apps/web run build --turbopack` (ou `--webpack` se solicitado), com `NODE_ENV=production` e a URL da API isolada em `NEXT_PUBLIC_API_URL`. Iniciar `next start` com o mesmo ambiente, preservando readiness, sanitização, aborto e cleanup da execução. O bundler pertence ao build e os argumentos de start contêm apenas host e porta. Registrar `mode` no relatório e manter o log de build separado. Atualizar help e `docs/operations/web-e2e.md`. Verificar GREEN com `node --test scripts/web-e2e.test.mjs`.
- [x] **Escrever o cenário `salva dias de inatividade e reabre as preferências persistidas`.** Usar conta nova. Fazer GET de `/trainers/me/notification-preferences` pela fixture `api`, exigir sucesso e capturar as preferências com `inactivity.afterDays === 7`. Usar `loginAs`, seguir links **Configurações** e **Notificações**, conferir URL `/settings/notifications`, título **Notificações** e campo **Dias de inatividade** com valor `'7'`. Preencher `'9'` e clicar **Salvar preferências**. Exigir **Preferências salvas.**, campo `'9'` e GET 200 com igualdade ao snapshot original exceto `inactivity.afterDays: 9` (preservar as outras propriedades de `inactivity`). Recarregar e exigir `'9'`. Sair da tela pelo link **Meu perfil**, voltar por **Notificações** e exigir `'9'`. Se a linha de base revelar corrida de hidratação, reproduzir e usar a espera de montagem já aplicada no cenário de perfil.
- [x] **Executar a linha de base com o produto intacto.** Usar os comandos abaixo sequencialmente e repetir o modo que falhar em processo frio com nova fixture. Substituir as portas pelas livres confirmadas se houver conflito. Registrar versões, bundler, SHA e alterações de teste, etapa de falha, status do POST da action e do PATCH no lado da API quando observável, primeiro frame útil e sintoma da UI. Guardar recortes sanitizados de server logs e, se acessíveis, dos módulos emitidos em `.next/dev/server` e `.next/server`, buscando `NotificationFormState`. A ausência de um nome em bundle minificado exige evidência complementar.

```powershell
pnpm --dir apps/web exec next --version
pnpm web:e2e --scenario jornada --artifact-scope muv-55
pnpm web:e2e --scenario jornada --artifact-scope muv-55 --production
```

- [x] **Classificar antes do GREEN.** Se a referência aparecer como valor gerado sem definição ou a stack localizar a reexportação, testar a alteração isolada da tarefa 2. Se houver evidência ambígua, variar um fator por vez (reexportação local versus com origem explícita, ou Turbopack versus webpack no mesmo modo). Se o PATCH chegar à API, verificar status e persistência antes de escolher a fronteira a alterar. Se ambos passarem, registrar a ausência de reprodução no SHA, comparar com o erro histórico e registrar `NOT_PROVEN` caso o gatilho siga sem prova. Se o runner falhar antes da etapa relevante, registrar o bloqueio e retomar a comparação após o diagnóstico. Devolver causa fora do escopo ao coordenador com evidência para revisão do plano.

### Task 2: Corrigir a hipótese confirmada e verificar

**Files:**

- Modify, condicionado à evidência: `apps/web/src/app/(app)/settings/notifications/actions.ts` e `apps/web/src/app/(app)/settings/notifications/_notification-form.tsx`.
- Test: `apps/web/test/e2e/personal-journey.spec.ts`, `apps/web/src/app/(app)/settings/notifications/actions.test.ts`, `apps/web/src/app/(app)/settings/notifications/_notification-form.test.tsx`, `apps/web/src/app/(app)/settings/notifications/page.test.tsx`, `apps/web/src/application/settings/notification-form-data.test.ts`.

**Interfaces:** Preservar `updateNotificationPreferencesAction(_: NotificationFormState, formData: FormData): Promise<NotificationFormState>` e `useActionState<NotificationFormState, FormData>`. `NotificationFormState` continua declarado em `@/application/settings/notification-form-data`.

- [x] **Aplicar a menor alteração após o RED.** Retirar `export type { NotificationFormState }` de `actions.ts`. Usar `import type { NotificationFormState } from '@/application/settings/notification-form-data'` no formulário, com `updateNotificationPreferencesAction` ainda vindo de `./actions`. Manter a action, o parsing, o PATCH, as duas revalidações e os estados do formulário.
- [x] **Verificar GREEN nos dois modos.** Repetir os comandos de jornada da tarefa 1 e exigir que o cenário específico passe nas duas execuções. Comparar a etapa e o resultado com a base. Caso a hipótese caia, retomar o diagnóstico com o diff experimental isolado. Quando for seguro e necessário para atribuir a causa, repetir o modo que falhou sem a alteração candidata e depois com ela para descartar coincidência.
- [x] **Refatorar apenas se a mudança introduzir duplicação.** Repetir os checks após qualquer limpeza. Os testes Vitest devem continuar protegendo parsing, erro de campo, erro de carregamento e envio pendente.

```powershell
pnpm --dir apps/web test notifications notification-form-data
pnpm --dir apps/web test
pnpm --dir apps/web typecheck
pnpm exec biome check apps/web scripts/web-e2e.mjs scripts/web-e2e.test.mjs
node --test scripts/web-e2e.test.mjs
git diff --check
```

- [ ] **Registrar a aceitação.** Em execução visual autorizada, percorrer a rota com conta artificial, editar, salvar e reabrir, inspecionar a confirmação, o valor 9 e a ausência de página de erro. Guardar capturas sanitizadas e registrar o que foi inspecionado. No relatório, separar estático, suíte automatizada, fluxo integrado e inspeção visual. Incluir SHA, comandos, códigos de saída, matriz antes/depois por modo, diferenças, logs relativos, limites e resultado da limpeza. Diagnosticar falhas de fontes remotas do build, sessão, Docker ou lock do Next como infraestrutura quando a evidência apontar para isso. Confirmar diff restrito, procurar escapes Unicode nos textos alterados e devolver ao coordenador com riscos e pendências.

### Task 3: Corrigir os achados da revisão independente no runner (P2/P3)

**Files:**

- Modify: `scripts/web-e2e.mjs` e `scripts/web-e2e.test.mjs`.
- Modify: `apps/web/next.config.ts` para ler o `distDir` explícito do runner.
- Create: `apps/web/test/next-config.test.ts`.
- Modify: `.gitignore` para ignorar `.next-e2e-*`.
- Modify: `docs/operations/web-e2e.md`, este plano e o design.

**Interfaces:**

- `productionDistDir(runId: string): string`, `distDirAbsolute(runId: string): string`, `webEnvironment({ production, apiUrl, distDir })`, `generatedNextEnvContent(distDir, eol?)` e `restoreGeneratedNextEnv({ file, before, distDir, onWarning })`.
- `next build`/`next start` continuam sem `--dist-dir`; o caminho viaja pela variável explícita `MUVIT_WEB_DIST_DIR`, lida por `apps/web/next.config.ts`.

- [x] **RED do isolamento e da restauração.** Adicionar testes para `productionDistDir` distinto por runId, caminho sob `apps/web` e envio em `MUVIT_WEB_DIST_DIR`; restauração de `next-env.d.ts` quando o conteúdo é o gerado conhecido; preservação com warning quando o conteúdo é concorrente; e leitura do `distDir` pela configuração do Next. Observar a falha com `node --test scripts/web-e2e.test.mjs` e `pnpm --dir apps/web test next-config`.
- [x] **GREEN do isolamento.** Adicionar `distDir` em `apps/web/next.config.ts` a partir de `MUVIT_WEB_DIST_DIR`, com fallback `.next`. No runner, usar `.next-e2e-<runId>`, passar o mesmo ambiente para build e start, registrar `distDir` no relatório e remover somente o `distDir` da execução depois de parar o servidor.
- [x] **GREEN da preservação.** Capturar `apps/web/next-env.d.ts` antes do build; restaurar apenas se o conteúdo final for exatamente o gerado conhecido do Next; caso contrário, preservar e registrar `cleanupWarnings`.
- [x] **Verificar em execução real.** Rodar `pnpm web:e2e --scenario jornada --artifact-scope muv-55 --production` e `...` sem `--production`, confirmando `.next` intocado, `next-env.d.ts` com hash original, `distDir` removido, cenários verdes e nenhum container/porta remanescente.
- [x] **Checks finais.** Rodar `node --test scripts/web-e2e.test.mjs`, `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck`, `pnpm exec biome check apps/web scripts/web-e2e.mjs scripts/web-e2e.test.mjs` e `git diff --check`.

### Task 4: Serializar `next-env.d.ts` por worktree e tratar erros de leitura (segunda revisão)

**Files:**

- Modify: `scripts/web-e2e.mjs` e `scripts/web-e2e.test.mjs`.
- Modify: `docs/operations/web-e2e.md`, este plano, o design e o relatório.

**Interfaces:**

- `nextEnvLockPath(): string`, `readOptionalFile(file): Promise<string | null>`, `acquireNextEnvLock({ lockFile, runId, timeoutMs, pollMs, hostname, isProcessAlive, onWait })`, `releaseNextEnvLock({ file, token })` e `runWithNextEnvLock(options, task)`.
- `readOptionalFile` retorna `null` exclusivamente para `ENOENT`; qualquer outro erro propaga.
- `restoreGeneratedNextEnv` aceita `before: string | null` e devolve `unchanged`, `restored`, `removed` ou `preserved`.

- [x] **RED do lock e do ENOENT.** Adicionar testes de duas execuções concorrentes (a segunda espera e captura o conteúdo original), lock ativo, lock stale de dono conhecido preservado com timeout diagnosticado, lock de dono desconhecido preservado, liberação em falha, `EISDIR`, `EACCES`, ausência real, remoção de conteúdo gerado quando o arquivo não existia e preservação de conteúdo divergente. Observar falha com `node --test scripts/web-e2e.test.mjs`.
- [x] **GREEN do lock.** Criar o lock atomicamente com `flag: 'wx'`; esperar qualquer lock existente, sem recuperação automática de stale (ver Task 5). Serializar apenas captura→build→restauração e liberar antes do `next start`.
- [x] **GREEN do ENOENT estrito.** Substituir `readFile(...).catch(() => null)` por `readOptionalFile`, registrando `cleanupErrors` e falhando em erros diferentes de `ENOENT`, sem mascarar falha de build. Se `before === null`, remover só o conteúdo gerado conhecido; divergente recebe warning e é preservado.
- [x] **Verificar em execução real.** Rodar produção e desenvolvimento; confirmar lock ausente, `next-env.d.ts` com hash original, `.next` intocado, `distDir` removido e cenários verdes.
- [x] **Checks finais.** Rodar `node --test scripts/web-e2e.test.mjs`, `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck`, `pnpm exec biome check apps/web scripts/web-e2e.mjs scripts/web-e2e.test.mjs` e `git diff --check`.

### Task 5: Remover recuperação automática de lock stale (terceira revisão)

**Files:**

- Modify: `scripts/web-e2e.mjs` e `scripts/web-e2e.test.mjs`.
- Modify: `docs/operations/web-e2e.md`, este plano, o design e o relatório.

**Interfaces:**

- `acquireNextEnvLock` não move nem remove lock existente em nenhuma hipótese. Ele espera até o timeout e falha com `runId`, host e PID quando disponíveis, instruindo inspeção/remoção manuais.
- `readOptionalFile(file, reader?)` mantém o contrato de só tratar `ENOENT` como ausência; o parâmetro opcional permite provar a propagação de `EACCES`.

- [x] **RED da preservação de stale.** Substituir o teste de recuperação de stale por um que prove que o lock de dono conhecido/PID morto é preservado byte a byte e que o timeout traz `runId`, host, PID e instrução manual. Manter testes de lock ativo, dono desconhecido e abort. Adicionar teste de `EACCES` além de `EISDIR`/ausência.
- [x] **GREEN conservador.** Remover `reclaimStaleNextEnvLock` e qualquer `rename`/remoção automática; manter somente `writeFile` atômico, espera e liberação do próprio lock. Nenhum lock existente é movido ou removido.
- [x] **Verificar em execução real.** Rodar produção e desenvolvimento; confirmar lock ausente, `next-env.d.ts` com hash original, `.next` intocado, `distDir` removido e cenários verdes. Se o runner bloquear por stale, preservar o lock do MUV-55 e reportar.
- [x] **Checks finais.** Rodar `node --test scripts/web-e2e.test.mjs`, `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck`, `pnpm exec biome check apps/web scripts/web-e2e.mjs scripts/web-e2e.test.mjs` e `git diff --check`.

### Task 6: Parada comprovada, lock no dev e asserção extra do E2E (quarta revisão)

**Files:**

- Modify: `scripts/web-e2e.mjs` e `scripts/web-e2e.test.mjs`.
- Modify: `apps/web/test/e2e/personal-journey.spec.ts`.
- Modify: `docs/operations/web-e2e.md`, este plano, o design e o relatório.

**Interfaces:**

- `StopNotProvenError` (`stopProven: false`, `retainLock: true`, `pid`) propaga falha/timeout de encerramento.
- `stopChild(child, { timeoutMs })` retorna `{ proven: true, pid }` somente após confirmar o encerramento; no Windows aguarda `exit`/`close` após `taskkill`.
- `runWithNextEnvLock` não libera o lock quando o erro da região tem `retainLock`.
- `next dev` usa o mesmo lock, captura `next-env.d.ts` antes do start e restaura/libera somente após parada comprovada no cleanup.

- [x] **RED da parada não comprovada.** Adicionar testes de falha e timeout de stop resultando em `StopNotProvenError`, `stopChild` só retornando após o processo encerrar e lock retido quando a região protegida falha com parada não comprovada.
- [x] **GREEN da parada comprovada.** Propagar o estado de stop, aguardar `exit`/`close` no Windows, manter lock/`next-env.d.ts`/`distDir` quando a parada não for comprovada e registrar `cleanupErrors` com `runId`/PID.
- [x] **GREEN do dev.** Adquirir o lock antes do snapshot, manter até a parada comprovada, restaurar `next-env.d.ts` só depois e liberar o lock por último na ordem de cleanup. Se o dev não parar comprovadamente, preservar lock e arquivo.
- [x] **Remover asserção extra do E2E.** Retirar somente a espera pelo heading **Meu perfil**, mantendo navegação, URL e heading **Notificações**.
- [x] **Verificar em execução real.** Rodar dev e produção; confirmar lock ausente, hash de `next-env.d.ts`, `.next` intocado, `distDir` removido e cenários verdes.
- [x] **Checks finais.** Rodar `node --test scripts/web-e2e.test.mjs`, `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck`, `pnpm exec biome check apps/web scripts/web-e2e.mjs scripts/web-e2e.test.mjs` e `git diff --check`.

### Task 7: Prova da árvore Windows, restore atômico e retenção (quinta revisão)

**Files:**

- Modify: `scripts/web-e2e.mjs` e `scripts/web-e2e.test.mjs`.
- Modify: `docs/operations/web-e2e.md`, este plano, o design e o relatório.

**Interfaces:**

- `stopChild` no Windows enumera descendentes via PowerShell/CIM, executa `taskkill /T /F` com prazo limitado e aguarda todos os PIDs + `exit`/`close`.
- `RestoreNotProvenError` (`retainLock: true`, `retainOutput: true`) mantém lock e `distDir` quando a restauração falha ou retorna `preserved`.
- `restoreGeneratedNextEnv` grava temp irmão, compara imediatamente antes do `rename` atômico e aceita `beforeReplace` para testar edição divergente no último ponto.

- [x] **RED da árvore e do restore.** Adicionar teste Windows com pai+descendente vivo, teste de edição divergente antes do replace e teste de lock retido em `RestoreNotProvenError`; atualizar o teste Unix para `detached: true` com cleanup em `finally`.
- [x] **GREEN da árvore Windows.** Enumerar descendentes, limitar `taskkill`, aguardar todos os PIDs e `exit`/`close`; falha de verificação vira `StopNotProvenError` e preserva lock/`next-env.d.ts`/`distDir`, com PIDs/artefatos em `cleanupErrors`.
- [x] **GREEN do restore não comprovado.** Em produção, erro ou `preserved` mantém lock e `distDir`; no dev, mantém o lock. A remoção do `distDir` só ocorre com parada e restauração comprovadas.
- [x] **GREEN do restore atômico.** Preparar temp irmão, comparar antes do `rename` e preservar divergência; documentar a janela residual contra escritor não cooperativo.
- [x] **Verificar em execução real.** Rodar dev e produção; confirmar lock ausente, hash de `next-env.d.ts`, `.next` intocado, `distDir` removido e cenários verdes.
- [x] **Checks finais.** Rodar `node --test scripts/web-e2e.test.mjs`, `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck`, `pnpm exec biome check apps/web scripts/web-e2e.mjs scripts/web-e2e.test.mjs` e `git diff --check`.

### Task 8: Enumerar árvore Windows mesmo com líder já encerrado (sexta revisão)

**Files:**

- Modify: `scripts/web-e2e.mjs` e `scripts/web-e2e.test.mjs`.
- Modify: `docs/operations/web-e2e.md`, este plano, o design e o relatório.

**Interfaces:**

- `stopChild` no Windows não retorna cedo por `exitCode`/`signalCode`; enumera descendentes por PID raiz, encerra cada PID vivo com `taskkill /T /F` limitado e confirma todos os PIDs.
- Não há early return por líder encerrado: o Unix verifica e sinaliza o PGID conhecido mesmo depois do líder sair; o Windows enumera a partir do PID raiz. A parada só é considerada comprovada após a ausência do grupo (Unix) ou de todos os PIDs enumerados e do `exit`/`close` do líder (Windows).

- [x] **RED do líder já encerrado.** Adicionar teste Windows em que o pai gera descendente, sai naturalmente e `stopChild` remove o descendente, provando ambos mortos; manter o teste com ambos vivos.
- [x] **GREEN da enumeração tardia.** Remover o early return Windows, enumerar mesmo com líder morto, encerrar cada raiz viva e confirmar todos os PIDs; falha vira `StopNotProvenError` com artefatos preservados.
- [x] **Verificar em execução real.** Rodar dev e produção; confirmar lock ausente, hash de `next-env.d.ts`, `.next` intocado, `distDir` removido e cenários verdes.
- [x] **Checks finais.** Rodar `node --test scripts/web-e2e.test.mjs`, `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck`, `pnpm exec biome check apps/web scripts/web-e2e.mjs scripts/web-e2e.test.mjs` e `git diff --check`.

### Task 9: Provar a árvore depois do close normal e tratar o limite Windows (sétima revisão)

**Files:**

- Modify: `scripts/web-e2e.mjs` e `scripts/web-e2e.test.mjs`.
- Modify: este plano, o design, o relatório e a sonda em `artifacts`.

**Interfaces:**

- `runAbortableCommand` só resolve depois de `stopChild` provar a ausência dos descendentes próprios, inclusive no caminho de término normal; falha vira `StopNotProvenError` e mantém lock/`next-env.d.ts`/`distDir`.
- `stopChild` no Unix trata o PGID mesmo com líder encerrado; no Windows, a enumeração PowerShell/CIM continua limitada à árvore viva.

- [x] **RED do close normal.** Adicionar teste de processo real em que o líder termina com código 0 e deixa descendente próprio vivo sem herdar pipes; no Windows o descendente usa `detached` e no Unix permanece no grupo do líder. O teste falha antes da correção nas duas plataformas (`descendente próprio sobreviveu ao close normal`).
- [x] **GREEN do close normal.** Reutilizar `stopChild` no caminho normal de `runAbortableCommand`, de forma idempotente e antes de devolver `code`; propagar `StopNotProvenError` para impedir restore/liberação. GREEN no host Windows e em container Linux com `--init`.
- [x] **RED do intermediário morto no Windows.** Sonda de processo real com raiz viva, intermediário já encerrado e neto vivo: `stopChild` retorna `proven: true` e deixa o neto vivo. Evidência em `probes/windows-dead-intermediate.mjs` e `.out.txt`.
- [x] **GREEN do intermediário morto.** Implementado na Task 10 com Job Object; a asserção do neto vivo antes do stop e morto depois passou no Windows real.
- [x] **Verificar em execução real.** `pnpm web:e2e --scenario jornada` em dev e produção passou após a decisão da Task 10; lock ausente, hash de `next-env.d.ts` original, `.next` presente e `distDir` removido. A rodada de RED manteve apenas a sonda e o suite do runner.
- [x] **Checks desta rodada.** Rodar `node --test scripts/web-e2e.test.mjs`, a mesma suíte em container Linux, `pnpm exec biome check scripts/web-e2e.mjs scripts/web-e2e.test.mjs` e `git diff --check`.

### Task 10: Comprovar o encerramento do Next com Job Object no Windows

**Arquivos da implementação:** `scripts/web-e2e.mjs` para seleção do adaptador e cleanup, `scripts/web-e2e-windows-job.mjs` para a ponte Node, `scripts/web-e2e-windows-job.ps1` para o bootstrap e as chamadas Win32 via `Add-Type`, `scripts/web-e2e-windows-job-host.ps1` e `scripts/web-e2e-windows-breakaway.ps1` como fixtures de teste, `scripts/web-e2e.test.mjs` para regressões do runner e `scripts/web-e2e-windows-job.test.mjs` para os testes reais do supervisor. Contrato operacional em `docs/operations/web-e2e.md` e relatório em `artifacts/muv-55/2026-11-20_job-object/relatorio.md`.

**Interfaces implementadas:** `startWindowsJob(command, args, { cwd, env, stdin, windowsVerbatimArguments, stopTimeoutMs, startupTimeoutMs })` devolve uma sessão imediatamente, com `ready`, `completion()`, `stop({ timeoutMs })` idempotente, `pid` do líder, `supervisorPid`, `stdout`/`stderr`, `output()`/`result()` e `failure`. `stop` retorna `{ proven: true, pid }` somente após `ActiveProcesses === 0` e drenagem. Falhas viram `WindowsJobError`/`WindowsJobStopError`; o runner converte falta de prova em `StopNotProvenError`. `runAbortableCommand` conserva `{ code, stdout, stderr }`.

- [x] **Gate de viabilidade no Windows.** Validado PowerShell 5.1 (`5.1.26100.9818`) com `Add-Type`, criação com `PROC_THREAD_ATTRIBUTE_JOB_LIST`/`HANDLE_LIST`, associação atômica antes do resume, recusa de breakaway (`erro=5`), recusa sob job de host restrito e transporte por dois pipes privados autenticados. O bootstrap mais `Add-Type` ficou abaixo do orçamento de 5 s de parada. Não foi necessário fallback suspenso; a criação exige o atributo atômico e falha fechada quando ele não é suportado.
- [x] **Fixar o RED.** O caminho gerenciado reproduziu o falso sucesso da sonda com intermediário morto e neto vivo; o teste novo falha no caminho `taskkill`/CIM anterior e passa com a prova de `ActiveProcesses === 0`. A morte do neto é confirmada por `process.kill(pid, 0)` e pela contagem zero antes do resultado.
- [x] **Implementar admissão, controle e saída.** Bootstrap fixo por script, dois pipes privados (entrada e saída de controle) com token de sessão, job sem nome com `KILL_ON_JOB_CLOSE` e sem breakaway, `CreateProcessW` com `CREATE_SUSPENDED`, `STARTUPINFOEXW`, `JOB_LIST` e `HANDLE_LIST`, `IsProcessInJob` antes do primeiro `ResumeThread`, monitor do handle do Node pai e EOF do controle, `TerminateJobObject` seguido de `QueryInformationJobObject` até zero. stdout/stderr são herdados diretamente; stdin fechado usa `NUL` e stdin configurado usa pipe com EOF. Nenhuma falha cai para execução fora do job.
- [x] **Integrar os pontos de uso.** Build usa `runAbortableCommand(..., { windowsJob: true })`; dev e start usam `startWindowsJob`. O cleanup registra a parada antes de aguardar a admissão no dev, mantém o lock até a prova no build e preserva `distDir` quando a prova falta. Abort/timeout com prova devolvem o erro original; falta de prova vira `StopNotProvenError`.
- [x] **Executar a matriz abaixo no Windows real.** `node --test scripts/web-e2e.test.mjs scripts/web-e2e-windows-job.test.mjs` passou com 15 casos Windows e 2 casos Unix pulados; a suíte antiga do runner permaneceu verde. Resultados e comandos no relatório da execução.
- [x] **Verificar o runner completo.** `pnpm web:e2e --scenario jornada --artifact-scope muv-55` passou em dev (`05dbd277ec55`) e produção (`24b02595ebb7`). Uma execução de produção intermediária (`8872d29aeb42`) falhou uma vez no cenário de treino (`personal-journey.spec.ts:209`) com cleanup vazio; a repetição fria passou. Lock ausente, `next-env.d.ts` restaurado por hash, `.next` intacto e `distDir` removido. Biome nos arquivos JS afetados e `git diff --check` executados; registros sanitizados em `artifacts/muv-55/2026-11-20_job-object/`.

| Caso Windows | Evidência exigida |
| --- | --- |
| Intermediário morto com raiz viva, depois líder e intermediário mortos com neto vivo | Sincronizar e observar o neto vivo antes do stop. Confirmar a morte do neto por handle e contagem zero antes do resultado. |
| Término normal com descendente sem pipes, e variante com pipes herdados | Ao sair o líder, encerrar o job sem esperar pipes abertos pelo descendente. Após confirmação e drenagem, devolver o código do líder. |
| Abort e timeout de execução | Matar a árvore e receber a confirmação dentro do prazo. Devolver o erro original, permitindo restore/liberação somente após prova. Injetar prazo de parada vencido e confirmação tardia/ausente para comprovar `StopNotProvenError`, lock e saída retidos. |
| Supervisor morto antes da confirmação, Node pai morto e controle interrompido | Matar supervisor e pai separadamente, com neto vivo. Observar que kill-on-close cobre o primeiro caso e a vigilância do handle cobre o segundo. Confirmar que a perda de prova não libera o lock, inclusive com neto já morto. Se houver fallback, repetir com morte no intervalo suspenso antes da associação. |
| Job externo restrito, associação negada, tentativa de breakaway e falha de PowerShell/`Add-Type` | Sob job real com restrição, provar que nenhum marcador de execução do filho aparece. Em fallback, comprovar morte do filho suspenso pelo handle. Demonstrar que descendente que tenta breakaway fica impedido de escapar. Registro sanitizado, erro de parada e lock retido nos casos de admissão negada. |
| Transporte de streams | Enviar stdin com EOF, escrever stdout e stderr simultâneos acima da capacidade dos pipes, com chunks Unicode divididos e bloco final antes da saída. Comparar bytes por stream e validar o EOF do stdin fechado usado pelo runner. |
| Invocação do real executável e do `.cmd` | Comparar `argv`, cwd com espaço e acento, ambiente Unicode e efetivamente substituído, argumentos vazios, espaços, aspas e barras finais conforme o modo. Verificar rejeições batch existentes, códigos 0 e não zero, e segredo sintético ausente da linha de comando e dos artefatos. |

Um resultado inconclusivo na admissão, proteção, prova ou compatibilidade mantém o P2 aberto como `NOT_PROVEN`. A decisão sobre trabalho adicional volta ao coordenador com o caso que falhou e a alteração de escopo necessária.
