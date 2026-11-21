# MUV-55 — Salvamento de preferências de notificações

## Objetivo

Um treinador autenticado deve conseguir alterar **Dias de inatividade** de 7 para 9 em **Configurações → Notificações**, receber a confirmação **Preferências salvas.** e encontrar 9 ao recarregar e ao reabrir a tela. O aceite exige reproduzir e classificar a ocorrência em desenvolvimento e em build local de produção, preservando as demais preferências. A auditoria MUV-10 registrou a falha em desenvolvimento como F03 e deixou produção para o MUV-55.

## Evidência e causa confirmada

A auditoria relatou `NotificationFormState is not defined` ao salvar no Next 16.2.9 com Turbopack. Na base `1571c087822fde01c1394980b55817dceb064263`, o commit `8813e3b` já havia movido o tipo para `notification-form-data.ts` e deixado em `actions.ts` uma reexportação local `export type { NotificationFormState }` de um tipo importado. A action de perfil usa uma reexportação com origem explícita e tem cenário de salvamento e persistência em `personal-journey.spec.ts`. Os testes de notificações em Vitest exercitam parsing, erro de campo, estado pendente e resposta simulada da action, além do carregamento da página. A fronteira compilada de Server Actions e a gravação real ficam sem cobertura nesses testes.

O formulário envia `FormData` via `useActionState`. A action valida pelo módulo de aplicação, encaminha a sessão ao SDK do servidor, faz PATCH e revalida Configurações e Notificações. A página consulta GET. Ambas as operações usam `/trainers/me/notification-preferences` com papel trainer e o ID do perfil da sessão. O caso de uso de atualização delega a gravação ao repositório. Uma conta inédita recebe 7 pelo default da API.

**Causa confirmada.** Na base `1571c087822fde01c1394980b55817dceb064263`, a jornada falhou em desenvolvimento/Turbopack e em build local de produção: o loader compilado da Server Action passou a tratar a reexportação local `export type { NotificationFormState }` como valor (`ensureServerEntryExports`/`registerServerReference`), e sua avaliação lançou `ReferenceError: NotificationFormState is not defined` ao processar o POST. A action de perfil, cuja reexportação tem origem explícita, não gerou referência de valor. Após remover a reexportação local e importar o tipo diretamente no formulário, os módulos compilados deixaram de conter a referência e as duas jornadas passaram. Os recortes estão em `artifacts/MUV-55/2026-11-20_0c95844d-673f-4818-b3c7-c09a2828292b/logs/compiled-evidence.txt`; o relatório com a matriz e os códigos de saída está em `artifacts/MUV-55/2026-11-20_0c95844d-673f-4818-b3c7-c09a2828292b/relatorio.md`.

## Abordagens

1. **Remover a passagem do tipo pela action se a hipótese se confirmar.** O formulário importa o tipo diretamente do módulo que o declara, com `import type`, e importa a função de `./actions`. A action usa o tipo localmente e exporta a função assíncrona. São dois arquivos de produto e uma fronteira de runtime mais simples.
2. **Reexportar o tipo com origem explícita.** É a opção de menor diff e segue a forma usada pelo perfil. Serve como comparação se for necessário discriminar a forma de reexportação. Mantém o tipo exposto pela action.
3. **Corrigir o ponto efetivamente observado.** Se a requisição alcançar a API ou a falha ocorrer na reabertura, rastrear resposta, persistência e nova leitura para localizar o defeito antes de escolher um diff. O worker devolve a evidência ao coordenador para ajustar o plano se a causa cair fora dos arquivos previstos.

A primeira abordagem foi selecionada após a reprodução e a discriminação da fronteira compilada; a correção mínima foi aplicada e verificada nos dois modos. A reexportação explícita permaneceu apenas como comparação observada no módulo de perfil.

## Validação e escopo

- Next 16.2.9 e Turbopack como comparação inicial em `next dev` e em `next build` seguido de `next start`, com a mesma dependência resolvida, API e PostgreSQL descartáveis, conta artificial inédita e os mesmos passos. Produção aqui é o build local.
- Reusar a jornada Playwright e o runner isolado. Acrescentar opção explícita de produção ao runner para repetir a comparação com build e start sob o mesmo isolamento. Preservar a execução padrão de desenvolvimento.
- Aplicar RED → GREEN → REFACTOR. O RED requer falha no cenário ou na etapa de build pelo defeito observado. Erros de dependência, fontes, autenticação, porta ou infraestrutura exigem diagnóstico próprio.
- Manter o contrato de `updateNotificationPreferencesAction`, validação, payload, textos, feedback, revalidação, SDK, API, esquema e banco. Zero dependências novas. Código e documentação em UTF-8 literal. Usar a worktree `muv-55` existente.
- Registrar por modo o SHA, diffs em execução, versões, bundler, etapa, status e persistência, com evidências sanitizadas em `artifacts/muv-55/<execucao>/`. Registrar suíte automatizada, fluxo integrado real e inspeção visual como evidências distintas. Usar `NOT_PROVEN` para gates sem evidência.

## Limites observados

- O status do PATCH servidor-a-servidor não é exposto pelo runner; foi marcado `NOT_PROVEN`, enquanto o GET posterior, o reload e a reentrada provaram a persistência de 9 e a preservação das demais preferências.
- Uma primeira jornada de produção após a mudança de isolamento falhou uma vez em outro cenário de treino; a repetição fria passou todos os cenários. Na Task 10, a produção `8872d29aeb42` falhou uma vez no mesmo cenário de treino (`personal-journey.spec.ts:209`, nome do plano após **Ver treino**) com cleanup vazio, e a repetição fria `28c3f05d2764` passou. A causa não foi confirmada; o registro está no relatório local.
- Builds simultâneos na mesma worktree ainda compartilham `next-env.d.ts`; a restauração conservadora preserva conteúdo divergente e registra `cleanupWarnings`, mas não há teste de duas builds simultâneas.

## Correção da revisão independente (P2/P3 do runner)

A revisão apontou dois riscos no runner de produção, ambos corrigidos sem alterar o contrato de produto:

- **P2 — isolamento do build local.** O build de produção não pode usar o `.next` compartilhado, porque uma segunda execução poderia remover bundles ainda servidos pela primeira. Como `next build`/`next start` não aceitam `--dist-dir`, o runner passa `MUVIT_WEB_DIST_DIR=.next-e2e-<runId>`; `apps/web/next.config.ts` lê essa variável explícita e aplica o valor em `distDir`, com fallback `.next`. Build e start recebem o mesmo valor, e o runner remove somente o `distDir` da própria execução após encerrar o servidor.
- **P3 — preservação de `next-env.d.ts`.** O Next reescreve `apps/web/next-env.d.ts` no build. O runner captura o conteúdo antes do build e restaura apenas se o conteúdo final for exatamente o gerado conhecido do Next para aquele `distDir`. Conteúdo diferente é tratado como edição concorrente: é preservado e registrado em `cleanupWarnings`, sem sobrescrita.

Testes unitários cobrem isolamento entre runIds e o caminho propagado até a configuração, restauração do arquivo gerado e preservação de conteúdo concorrente. A execução de produção confirma `.next` intocado, `next-env.d.ts` com o hash original e ausência do `distDir` após a limpeza.

## Correção da segunda revisão (lock de `next-env.d.ts` e ENOENT)

A revisão apontou que a captura/restauração de `apps/web/next-env.d.ts` ainda era compartilhada entre execuções e que erros de leitura diferentes de ausência eram silenciados. Correções:

- **Lock exclusivo por worktree.** `scripts/web-e2e.mjs` serializa somente a região captura→build→restauração com `apps/web/.next-e2e-next-env.lock`, criado atomicamente com `flag: 'wx'` e liberado antes do `next start`. O `distDir` continua único por `runId`.
- **Espera e diagnóstico.** Uma segunda execução espera o lock ativo e então captura o conteúdo original, nunca o temporário de outra execução. A recuperação automática de lock stale foi removida após revisão: lock existente nunca é movido ou removido automaticamente, e a execução aguarda até o timeout mesmo para registro conhecido e PID morto. Ao esgotar, falha com `runId`, host e PID (quando disponíveis) e instrui inspeção/remoção manuais após confirmar que o PID está morto, evitando a corrida entre `rename`/token que poderia apagar o lock de outro concorrente.
- **ENOENT estrito.** `readOptionalFile` retorna ausência somente para `ENOENT`; `EISDIR`, `EACCES` e outros erros propagam. Na captura, o erro é registrado em `cleanupErrors` e falha a execução; na restauração, o erro é registrado e falha quando o build terminou, sem mascarar a falha original do build.
- **Arquivo inexistente antes do build.** Se `next-env.d.ts` não existia, apenas conteúdo gerado conhecido é removido; conteúdo divergente é preservado com warning.

Testes cobrem duas execuções concorrentes (a segunda espera e recebe o conteúdo original), lock ativo, lock stale de dono conhecido preservado com timeout diagnosticado, lock de dono desconhecido preservado, falha que libera o lock, `EISDIR`, `EACCES`, ausência real, remoção de conteúdo gerado e preservação de conteúdo divergente.

## Correção da quarta revisão (parada comprovada e lock no dev)

- **P2 — parada não comprovada.** `StopNotProvenError` propaga explicitamente falha/timeout de `stopChild`. Nesse estado o runner não restaura `next-env.d.ts`, não libera o lock e não remove o `distDir`; registra `cleanupErrors` com `runId` e PID. A parada só é considerada comprovada após confirmar `exit`/`close`/ausência do processo (no Windows, aguardando após `taskkill /T /F`).
- **P3 — dev sob o mesmo lock.** `next dev` captura `next-env.d.ts`, adquire o lock antes do snapshot e o mantém até a parada comprovada no cleanup, restaurando o arquivo somente depois. Se a parada do dev não for comprovada, o lock e o arquivo são preservados e o run registra o bloqueio. Produção mantém `distDir` por `runId` e libera o lock após build+restauração, antes do `next start`.
- **P3 — asserção extra removida.** O cenário E2E não exige mais o heading **Meu perfil** ao passar por Configurações; mantém a navegação, a URL `/settings/profile` e o heading **Notificações**. A asserção era extra e causou o flake de `b3f7f40117a9`.

O lock serializa todos os runners Next que escrevem `next-env.d.ts` (dev e produção). Um `next dev` ativo bloqueia produção até o timeout; se um lock não for liberado, a execução seguinte exige inspeção manual.

## Correção da quinta revisão (árvore Windows, restore atômico e retenção)

- **Árvore Windows completa.** `stopChild` enumera todos os PIDs descendentes via PowerShell/CIM, executa `taskkill /T /F` com prazo limitado e aguarda todos os PIDs identificados e o `exit`/`close` do líder. Falha de enumeração, timeout do `taskkill` ou processo remanescente resultam em `StopNotProvenError`; lock, `next-env.d.ts` e `distDir` são preservados. A enumeração depende de `powershell.exe`.
- **Restauração não comprovada.** Em produção, erro ou status `preserved` na restauração de `next-env.d.ts` mantém lock e `distDir` (`RestoreNotProvenError`). No dev, erro ou `preserved` mantém o lock. Cleanup registra `runId`, PIDs e artefatos e não apaga saída possivelmente referenciada.
- **Restore atômico.** O conteúdo anterior é escrito em arquivo temporário irmão, o arquivo atual é comparado imediatamente antes do `rename` atômico e conteúdo divergente é preservado. A janela residual entre a última comparação e o `rename` não é eliminável no Node/Windows contra um escritor externo não cooperativo; a documentação não promete preservação incondicional.
- **Teste Unix.** O cenário de grupo usa `spawn` com `detached: true` e limpa descendentes em `finally`; permanece pulado no Windows. O teste Windows de pai+descendente vivo é executado e confirma ambos terminados.

## Correção da sexta revisão (líder já encerrado com descendente vivo)

A versão anterior de `stopChild` retornava cedo quando `exitCode`/`signalCode` já existia, pulava a enumeração Windows e deixava descendentes vivos. Correção:

- No Windows, a enumeração por PID raiz ocorre sempre, mesmo com líder já encerrado; cada PID vivo (incluindo raízes descendentes) recebe `taskkill /T /F` com prazo limitado e todos os PIDs são confirmados ausentes, além do `exit`/`close` do líder quando aplicável.
- Se não for possível enumerar ou encerrar, ou restar qualquer processo, `StopNotProvenError` preserva lock, `next-env.d.ts` e `distDir`.
- O cenário Windows com líder que sai naturalmente e descendente vivo é testado e confirma ambos mortos; o cenário com ambos vivos continua coberto. Não há early return por líder encerrado: o Unix sinaliza o PGID conhecido depois que o líder sai e o Windows enumera a partir do PID raiz; a prova só ocorre após a ausência do grupo/PIDs.

## Correção da sétima revisão (close normal e limite da árvore Windows)

- **P2 — `close` normal do build.** `runAbortableCommand` passou a encerrar e provar a ausência dos descendentes próprios depois do `close` do líder e antes de devolver o resultado. O caminho normal usa o mesmo `stopChild` do cancelamento, é idempotente e, se a prova falhar, lança `StopNotProvenError`; assim o restore de `next-env.d.ts`, a liberação do lock e a remoção do `distDir` não ocorrem. No Unix, o grupo próprio é sinalizado mesmo com o líder já encerrado.
- **P2 — árvore Windows com intermediário morto.** A sonda real em `artifacts/MUV-55/2026-11-20_0c95844d-673f-4818-b3c7-c09a2828292b/probes/windows-dead-intermediate.mjs` registrou `proven: true` com o neto ainda vivo. O intermediário já havia saído e o snapshot CIM perdeu o elo pelo `ParentProcessId`. Isso limita a afirmação de completude da quinta revisão. A tarefa 10 define a decisão e as provas exigidas para sanar esse caso.

## Contrato proposto para a parada do Next no Windows

### Escopo e decisão

O Job Object é viável como um supervisor privado e descartável por comando, limitado a `next build`, `next dev` e `next start` no Windows. Esses pontos controlam a restauração de `next-env.d.ts` e a remoção do `distDir`. Essa é uma escolha de planejamento, condicionada à prova no host Windows suportado, inclusive sob Orca. O custo inclui lançamento Win32, protocolo, streams e testes reais. Cabe no runner apenas como adaptador isolado, usando PowerShell com `Add-Type` a partir de fonte local fixa se a política do host permitir. Reescrever o gerenciamento de processos, distribuir binário, adicionar dependência ou adaptar IPC da API, Docker, Playwright e Unix exigiria outro escopo. A prova também fica limitada aos descendentes criados dentro do job, sem abranger serviços externos acionados pelo comando.

### Admissão e propriedade

- O supervisor abre um handle `SYNCHRONIZE` para a instância exata do Node pai antes de autorizar qualquer lançamento e monitora sua sinalização durante toda a sessão. Vincular o handle à sessão privada e confirmar o handshake com o pai vivo, com identidade de criação verificada se a aquisição usar PID. EOF no controle também aciona parada. Se o pai morrer, o supervisor encerra o job no prazo e sai, preservando o lock que o pai detinha.
- Criar um job sem nome por invocação, com handle exclusivo do supervisor, não herdável, e `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` aplicado antes do lançamento. Proibir `CREATE_BREAKAWAY_FROM_JOB`, `JOB_OBJECT_LIMIT_BREAKAWAY_OK` e `JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK`. Validar associação ao job privado, inclusive quando o host já impuser um job externo. [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects), [Nested Jobs](https://learn.microsoft.com/en-us/windows/win32/procthread/nested-jobs)
- Preferir `CreateProcessW` com `CREATE_SUSPENDED` e associação atômica por `PROC_THREAD_ATTRIBUTE_JOB_LIST` em `STARTUPINFOEXW`. Verificar a associação e o canal de controle antes do primeiro `ResumeThread`. Restringir herança aos handles de stdio por `PROC_THREAD_ATTRIBUTE_HANDLE_LIST`. [UpdateProcThreadAttribute](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute), [CreateProcessW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw)
- Considerar `CREATE_SUSPENDED` seguido de `AssignProcessToJobObject` somente para ausência comprovada de suporte ao atributo atômico. Em qualquer falha, nunca retomar e usar o handle do filho para terminar e aguardar confirmação. A morte do supervisor entre criação e associação pode deixar um processo suspenso fora do job. Habilitar esse fallback somente se houver proteção comprovada para essa janela, com teste de morte exatamente nela, dentro do mesmo escopo. Caso contrário, bloquear nessa plataforma. Uma associação negada, um job externo incompatível ou uma falha de inicialização do PowerShell/`Add-Type` resulta em parada não comprovada, sem tentativa de iniciar fora do job.

### Parada, prova e recuperação

- `stopChild` e a finalização normal usam uma operação idempotente. Capturar o código de saída do líder pelo handle. Ao terminar normalmente, começar a parada quando o líder sair, mesmo que descendentes ainda detenham pipes. No abort, timeout de execução ou morte do pai, parar imediatamente. O supervisor chama `TerminateJobObject` e consulta `QueryInformationJobObject(JobObjectBasicAccountingInformation)` até `ActiveProcesses === 0` no handle privado, com prazo monotônico de parada (5 s por padrão). `KILL_ON_JOB_CLOSE` cobre a perda do supervisor como proteção adicional. [QueryInformationJobObject](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-queryinformationjobobject)
- O canal privado, não herdado pelo comando, transporta eventos de admissão, saída do líder e uma única confirmação final vinculada à sessão e ao pedido de parada. O Node só aceita a confirmação de contagem zero dentro do prazo e aguarda a drenagem dos streams para concluir normalmente. EOF de controle, saída do supervisor, `close` do líder, `taskkill` e PID ausente são insuficientes. Um abort ou timeout de execução com prova válida devolve o erro original de cancelamento. Um timeout de parada, erro Win32 ou de transporte, protocolo inválido, perda do supervisor antes da prova ou falha de admissão gera `StopNotProvenError` com `retainLock: true`. A confirmação tardia não muda esse estado.
- Registrar a propriedade e o cleanup antes de aguardar a admissão, inclusive no dev. Em parada não comprovada, manter `next-env.d.ts`, o lock que a invocação detém e o `distDir` aplicável. No `next start`, o lock de build já terá sido liberado após prova de parada e restore, então preservar somente a saída dessa execução e registrar a falha. Se o Node morrer, o lock existente permanece e não há restore pelo supervisor. Uma execução concorrente deve aguardar e falhar no timeout diante de lock retido. `cleanupErrors` registra `runId`, etapa e código da falha, sem payload do protocolo ou segredos.

### Compatibilidade de lançamento e streams

- O supervisor recebe executável, vetor de argumentos, `cwd`, ambiente efetivo e opções por canal privado, com enquadramento validado e separado de stdin/stdout/stderr. Sua própria linha de comando contém apenas o bootstrap fixo. Valores sensíveis seguem pelo ambiente ou stdin do comando e ficam fora das linhas de comando, do protocolo de status e dos diagnósticos. Manter a sanitização existente dos artefatos.
- `CreateProcessW` usa executável resolvido explicitamente, diretório recebido e bloco de ambiente Unicode com a mesma semântica de substituição do `spawn`. Reproduzir o quoting de executáveis diretos e a forma verbatim já usada pelo runner com `cmd.exe` para `.cmd`/`.bat` no build, incluindo as rejeições existentes. Manter a inicialização oculta e propagar o código do comando real (incluindo código diferente de zero), independentemente do exit code do supervisor.
- Manter stdin fechado para os callers atuais e suportar repasse com EOF quando configurado. Encaminhar stdout e stderr em canais separados, com backpressure e sem transcodificação no supervisor. Drenar até EOF após parar o job para preservar os bytes já escritos, inclusive o último bloco e caracteres divididos entre chunks. O timeout de drenagem impede resultado normal e retém os recursos. Bytes que o alvo ainda não escreveu antes de um encerramento forçado ficam fora desse contrato.

### Correção da oitava revisão (Job Object comprovado no Windows)

O P2 do intermediário morto foi fechado com a implementação da Task 10. `next build`, `next dev` e `next start` no Windows passam a rodar sob um Job Object privado por comando:

- **Admissão atômica.** O supervisor `powershell.exe` carrega `scripts/web-e2e-windows-job.ps1` via `Add-Type` e cria o processo suspenso com `STARTUPINFOEXW`, `PROC_THREAD_ATTRIBUTE_JOB_LIST` e `PROC_THREAD_ATTRIBUTE_HANDLE_LIST`. `IsProcessInJob` é verificado antes do primeiro `ResumeThread`; não há caminho alternativo que crie o comando fora do job.
- **Propriedade e proteção.** O job é anônimo, com `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, sem `BREAKAWAY_OK`/`SILENT_BREAKAWAY_OK`. Um handle da instância do Node pai (PID e tempo de criação verificados) e o EOF do controle acionam a parada. A morte do supervisor é coberta pelo kill-on-close.
- **Controle autenticado.** Dois pipes privados por invocação (`-in` e `-out`) com token aleatório transportam o lançamento e os eventos. A linha de comando do supervisor contém apenas o bootstrap fixo; executável, argumentos, `cwd` e ambiente do comando viajam no protocolo. O comando recebe somente os handles de stdin/stdout/stderr; stdout e stderr são herdados diretamente, sem relay.
- **Saída e prova.** O código real do líder é lido por handle. Ao sair o líder, os descendentes restantes são encerrados com `TerminateJobObject` e a contagem é consultada até `ActiveProcesses === 0` no prazo de 5 s; só então a sessão confirma e os streams são drenados. Abort/timeout com prova devolvem o erro original; supervisor/`Add-Type` indisponível, admissão negada, job de host incompatível, protocolo inválido, EOF, erro Win32 ou confirmação tardia geram `StopNotProvenError` e mantêm lock, `next-env.d.ts` e `distDir`.
- **Limite da garantia.** A prova cobre os processos membros do job criados por `CreateProcessW`; serviços externos acionados pelo comando (daemon Docker, serviços do sistema, processos que quebrem o job por mecanismo não bloqueado) não são capturados. O caminho `taskkill`/CIM continua apenas para os demais subprocessos do runner.

A matriz real em Windows 11 (PowerShell 5.1.26100.9818) cobriu intermediário morto com neto vivo, término normal com descendente segurando pipes, abort e timeout, morte do supervisor e do Node pai, crash antes do resume, admissão negada, job de host restrito, breakaway, streams grandes concorrentes, stdin com EOF, `cwd`/ambiente/argumentos, `cmd`/`.bat`, códigos de saída e falha de PowerShell/`Add-Type`. As execuções `pnpm web:e2e --scenario jornada` em dev e produção passaram com lock liberado, `next-env.d.ts` restaurado por hash, `.next` intacto e `distDir` removido.

## Bloqueio de entrega

Se o host real não comprovar associação antes do primeiro resume, proteção sem breakaway, parada com contagem zero e protocolo confiável, falha fechada e compatibilidade de I/O e invocação, manter o P2 aberto como `NOT_PROVEN`. Aplicar o mesmo bloqueio se a solução exigir infraestrutura fora do escopo acima. Um caminho Windows baseado na enumeração pós-hoc fica inelegível para aceitar esta entrega, restaurar arquivos ou liberar recursos em nome da nova garantia.
