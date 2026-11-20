# Seleção, elegibilidade, claim e estado

1. Descubra o repositório e a branch base configurada. A base habitual é `develop`, mas verifique `origin/develop` e proteções; **não** tomar branch local desatualizada como base.
2. Consulte o Linear pela conexão disponível no Orca ou no conector/plugin do harness. Para rodadas novas, filtre o workspace `18309e87-272d-4c09-aa18-ed1711c84dcf`, time `MUV`, estado de nome exato `Todo` e responsável autenticado. No Orca, use `linear list-issues --team MUV --state Todo --assignee me --workspace <ID-Linear> --json`. O Orca resolve `me` na conexão desse workspace e informa `assignee.id` nos cards. Confira `result.truncated: false`, `result.meta.partial: false`, `hasMore: false`, ausência de erros, contagem, workspace da consulta e de cada card, time, estado, ID do card e ID do responsável. No conector, confirme o ID autenticado na mesma conexão, resolva o estado exato do time e percorra todas as páginas com os mesmos critérios. Ignore cards sem responsável ou atribuídos a outro usuário. Se não puder confirmar identidade, escopo ou completude, encerre como bloqueado. Leia descrições, comentários, links, relações e prioridade.
3. Se houver vários, selecione conforme prioridade, bloqueios e prontidão. **Exatamente um card por rodada**. Uma dependência incompleta torna o card inelegível; itens dependentes não podem ser executados apenas porque parecem independentes. Quando receber um card de `$muvit-dispatch`, não selecione outro.
4. Antes de modificar o Linear ou código, verifique bloqueios registrados, PR/worktree/execução concorrente e adquira ou valide a trava local abaixo. Confira dependências e conflitos pela leitura completa do card. Após a reserva e imediatamente antes da transição, repita a consulta autenticada da fila na mesma conexão e workspace, confira os IDs do card, estado e responsável contra a seleção e comprove que o estado atual ainda é exatamente `Todo`. Se disponível, use o `admission_probe.py --recheck` da skill `muvit-dispatch` para essa consulta no Orca. Se o estado, responsável ou outro critério mudar, libere somente a própria reserva e encerre a tomada sem editar o card ou código. Leitura incompleta bloqueia a tomada. Somente com a reserva e a elegibilidade comprovadas, mova para `In Progress` e confirme por leitura. Em escrita incerta, reconcilie estado e ownership antes de qualquer nova tentativa.
5. Vincule branch e worktree com identificador curto, por exemplo `muv-42`/`MUV-42`; confirme que não colide com branches ativos. Trabalho paralelo em rodadas separadas é permitido quando cards forem de fato independentes.
6. O coordenador só mescla o PR em `develop` e fecha o card na rodada autorizada pelo protocolo de `pr-and-review-loop.md`. Use o estado que corresponde às evidências. Criação de releases e remoção de branches ficam fora da rodada.
7. Se o card já tiver PR, branch ou trabalho em andamento, não sobrescrever. Retomada segura e documentada cabe somente ao coordenador responsável por aquela rodada ou a uma solicitação específica de retomada.

Registro mínimo de claim: ID, título, prioridade, estado antes/depois, dependências, branch, worktree, data de início e link para PR quando existir. Não inserir dados sensíveis em logs.

## Estado e labels durante a rodada

Confirme no time e workspace autenticados os estados antes de escrever. As labels `agent_ready`, `agent_in_progress`, `agent_review` e `agent_blocked` são metadados legados, inclusive se coexistirem. Preserve todas as labels, inclusive as de área e tipo, em cada transição. Somente o coordenador altera o Linear. Faça leitura posterior de cada transição e registre o estado efetivo no handoff.

| Situação comprovada | Estado |
| --- | --- |
| Card ainda elegível, sem claim concluído | `Todo` |
| Claim validado e trabalho iniciado | `In Progress` |
| Rodada bloqueada | Preservar o estado observado e registrar o bloqueio nas evidências |
| Bloqueio resolvido e mesma rodada retomada | Reconciliar estado e ownership para continuar da etapa comprovada |
| PR vinculado, CI, QA aplicável, threads e revisão da HEAD validados para merge | `In Review` |
| Merge e vínculo comprovados pelo gate | `Done` |

A abertura do PR por si só mantém `In Progress`. Registre motivo, evidência e condição de retomada de cada bloqueio no relatório da rodada e preserve reserva, contexto e worktree. Se o merge já ocorreu e o fechamento ficou pendente, retome pelo gate de fechamento. Estado ausente ou falha de escrita exigem reconciliação e relatório.

## Responsável na rodada

- A regra de responsável vale para a rodada recebida, execução manual e retomada. Ao retomar, confira também se o card continua atribuído ao usuário autenticado; uma transferência de responsável exige encerrar a execução anterior e reconciliar a reserva, sem continuar trabalho em nome de outra pessoa.
- Cada colaborador usa sua própria conexão do Linear. `me` significa o dono dessa conexão, não quem iniciou o computador ou escreveu a mensagem. Não fixar Leonardo/Sergio nem seus IDs pessoais na skill compartilhada. Com conta compartilhada não existe separação automática: reportar o conflito de identidade antes da rodada.
- O despachante valida cards na própria sessão, pela conexão Linear disponível no harness ou pelo CLI Orca como fallback. O coordenador sempre repete identificação, filtro de responsável, elegibilidade e conferência da reserva recebida na conexão que usar.

## Trava local por card

Se receber um handoff de `$muvit-dispatch`, confira card, workspace, responsável, ID do estado, `run_id`, caminho e conteúdo da trava, worktree, branch e HEAD de `origin/develop`, além do recibo de lançamento. Verifique que não há outro executor e que o card continua atribuído ao usuário autenticado e em `Todo` antes de mover para `In Progress`. Não adquira outra trava nem crie outra worktree para esse card. Se o handoff estiver incompleto ou ambíguo, preserve estado e bloqueie a rodada até esclarecer ownership.

Execute da raiz da worktree, usando o script da skill carregada. Gere um UUID exclusivo para a rodada e conserve-o no estado da execução; não use o PID do script como identidade, pois ele termina logo após registrar a trava.

```powershell
$muvitRunId = [guid]::NewGuid().ToString()
python -B -X utf8 .agents/skills/muvit-autonomous/scripts/local_lock.py acquire --card MUV-15 --run-id $muvitRunId
if ($LASTEXITCODE -ne 0) { throw 'Tomada interrompida; conferir a reserva local.' }
```

- Substitua `MUV-15` pelo card selecionado. O script resolve `git rev-parse --path-format=absolute --git-common-dir` e cria `<git-common-dir>/muvit-autonomous/locks/MUV-15.json` com criação exclusiva, sem sobrescrita. Esse diretório é compartilhado por todas as worktrees do mesmo clone, fica fora da árvore versionada e não requer alteração de `.gitignore`.
- O JSON registra card, UUID da rodada (`run_id`), horário UTC, host, worktree, branch no momento da aquisição e caminho da trava. Conserve o caminho e o UUID no estado da rodada. Branch/worktree e HEAD atuais continuam registrados no relatório se mudarem depois.
- Exit code diferente de zero bloqueia a tomada: não editar Linear/código nem usar reserva remota como alternativa. Um arquivo vazio, ilegível ou parcialmente escrito também deve ser preservado para investigação.
- Para consultar: `python -B -X utf8 .agents/skills/muvit-autonomous/scripts/local_lock.py show --card MUV-15`. Ausência retorna JSON `null`; a consulta não adquire nem libera a trava.
- Não criar ou enviar `automation/claims/*` ao remoto. Branches de agendamento ficam locais; o primeiro push ocorre somente ao preparar a PR na branch de entrega do card. Reservas remotas antigas não devem ser apagadas durante uma rodada por conta desta mudança.
- A trava cobre worktrees do mesmo clone nesta máquina. Entre clones/máquinas, confira conflitos e releia o Linear imediatamente antes de escrever. A leitura e a transição são operações distintas e a trava local não torna a escrita atômica entre hosts.

## Liberação e retomada

- Sem candidato elegível, não criar trava. Se a elegibilidade desaparecer após adquirir a trava e antes de iniciar trabalho, liberar somente a própria reserva e encerrar.
- Após confirmar `Done` e vínculo em nova leitura do Linear, libere somente a própria trava. Merge sem confirmação do Linear ainda é entrega pendente.
- Para liberar: `python -B -X utf8 .agents/skills/muvit-autonomous/scripts/local_lock.py release --card MUV-15 --run-id $muvitRunId`. O script exige o `run_id` gravado; dono divergente, JSON inválido ou falha de leitura não autorizam remoção.
- Bloqueio, interrupção ou review pendente preservam a trava, UUID e dados de retomada. Não usar TTL, idade do arquivo ou ausência do PID do script para apagar automaticamente uma reserva.
- Ao retomar uma reserva existente, conferir dono/execução, worktree, Git, PR e Linear. Prosseguir na mesma rodada somente com ownership comprovado e sem executor concorrente; preservar o UUID existente. Uma reserva órfã só pode ser liberada após comprovar que o executor anterior terminou e reconciliar trabalho e estado do card; registrar a decisão nas evidências antes da liberação. Em caso de dúvida, reportar bloqueio.
