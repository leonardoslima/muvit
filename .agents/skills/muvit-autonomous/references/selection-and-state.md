# Seleção, elegibilidade, claim e estado

1. Descubra o repositório e a branch base configurada. A base habitual é `develop`, mas verifique `origin/develop` e proteções; **não** tomar branch local desatualizada como base.
2. Consulte **Linear via conector/plugin disponível no ambiente Codex**, não por token manual inventado. Identifique o usuário autenticado e o workspace nessa mesma conexão (`whoami`/usuário atual ou equivalente suportado), registre seu ID e filtre somente cards Muvit com `agent_ready` **atribuídos a esse usuário**, em estados elegíveis (normalmente Backlog/Todo), sem `agent_in_progress`, `agent_blocked` ou `agent_review`, sem execução conflitante e com dependências realmente concluídas. Mesmo se `agent_ready` coexistir por erro com uma dessas labels, não selecione o card: registre a inconsistência sem corrigir a rodada alheia. Consulte com `assignee: me` ou o ID confirmado e confira `assignee.id` no resultado; nomes de exibição, Git e usuário do Windows não comprovam identidade no Linear. Ignore cards sem responsável ou de outro usuário; não se atribua cards para torná-los elegíveis. Se identidade/workspace não puderem ser confirmados, encerre como bloqueado, sem ampliar a consulta. Ler descrições, comentários, links, labels, relações e prioridade.
3. Se houver vários, selecione conforme prioridade, bloqueios e prontidão. **Exatamente um card por rodada**. Uma dependência incompleta torna o card inelegível; itens dependentes não podem ser executados apenas porque parecem independentes. Quando receber um card de `$muvit-dispatch`, não selecione outro.
4. Antes de modificar o Linear ou código, verifique PR/worktree/execução concorrente e adquira a trava local abaixo. Depois da aquisição, releia o card na mesma conexão e workspace: `assignee.id` deve continuar igual ao ID autenticado, a label `agent_ready` deve existir e os demais critérios devem permanecer válidos. Se responsável/label/estado mudar, libere somente a própria trava e encerre sem editar o card ou código. Somente se continuar elegível, o coordenador registra a tomada, move o estado para `In Progress`, remove `agent_ready`, adiciona `agent_in_progress` e confirma a leitura posterior. Em caso de corrida ou falha de claim, interrompa a tomada; se uma escrita ficar incerta ou parcial, leia o card antes de qualquer nova tentativa e reconcilie as labels. A label comunica disponibilidade; a criação exclusiva do arquivo evita a corrida entre worktrees locais.
5. Vincule branch e worktree com identificador curto, por exemplo `muv-42`/`MUV-42`; confirme que não colide com branches ativos. Trabalho paralelo em rodadas separadas é permitido quando cards forem de fato independentes.
6. Não fazer merge, fechar card como Done, criar releases ou remover branch remota automaticamente. Ao finalizar entrega validada, mover para `In Review` e trocar a label de andamento por `agent_review`, conforme o quadro abaixo. GitHub/Linear devem refletir o estado **real**, não só o plano.
7. Se o card já tiver PR, branch ou trabalho em andamento, não sobrescrever. Retomada segura e documentada cabe somente ao coordenador responsável por aquela rodada ou a uma solicitação específica de retomada.

Registro mínimo de claim: ID, título, prioridade, estado/label antes/depois, dependências, branch, worktree, data de início e link para PR quando existir. Não inserir dados sensíveis em logs.

## Estado e labels durante a rodada

Confirme no time e workspace autenticados que os estados e labels abaixo existem antes de escrever. Preserve labels de área, tipo e outras não relacionadas; use adição/remoção pontual, não substituição da lista inteira. Somente o coordenador altera o Linear, inclusive após receber o card de `$muvit-dispatch`. Faça leitura posterior de cada transição e registre estado/labels efetivos no handoff; resposta de escrita sem leitura não comprova a mudança.

| Situação comprovada | Estado | Labels de automação |
| --- | --- | --- |
| Card ainda elegível, sem claim concluído | `Backlog` ou `Todo` | `agent_ready` |
| Claim validado e trabalho iniciado | `In Progress` | Remover `agent_ready`, `agent_blocked` e `agent_review`; adicionar `agent_in_progress`. |
| Rodada bloqueada, sem entrega pronta | Manter `In Progress` | Remover `agent_in_progress` e `agent_review`; adicionar `agent_blocked`. Preservar trava, worktree e contexto para retomada. |
| Bloqueio resolvido e mesma rodada retomada | `In Progress` | Remover `agent_blocked` e `agent_review`; adicionar `agent_in_progress` após reconciliar ownership e elegibilidade. |
| PR e revisão da HEAD validadas, pronta para revisão humana | `In Review` | Remover `agent_in_progress` e `agent_blocked`; adicionar `agent_review`. |

Não marcar `agent_review` apenas por abrir a PR: revisão automática pendente ou findings acionáveis mantêm `agent_in_progress`, ou `agent_blocked` se a rodada realmente parou por impedimento. Não recolocar `agent_ready` em card com trabalho, PR ou trava pendente. Não mover para `Done` antes do procedimento humano do projeto. Se um estado/label esperado estiver ausente ou a escrita falhar, preserve os dados da rodada, registre o bloqueio e não declare a transição concluída.

## Responsável na rodada

- A regra de responsável vale para a rodada recebida, execução manual e retomada. Ao retomar, confira também se o card continua atribuído ao usuário autenticado; uma transferência de responsável exige encerrar a execução anterior e reconciliar a reserva, sem continuar trabalho em nome de outra pessoa.
- Cada colaborador usa sua própria conexão do Linear. `me` significa o dono dessa conexão, não quem iniciou o computador ou escreveu a mensagem. Não fixar Leonardo/Sergio nem seus IDs pessoais na skill compartilhada. Com conta compartilhada não existe separação automática: reportar o conflito de identidade antes da rodada.
- O precheck do despachante é apenas um filtro preventivo: não resolve dependências nem adquire trava. O coordenador sempre repete identificação, filtro de responsável, elegibilidade e conferência da reserva recebida.

## Trava local por card

Se receber um handoff de `$muvit-dispatch`, confira card, `run_id`, caminho e conteúdo da trava, worktree, branch e HEAD de `origin/develop`, além do recibo de lançamento. Verifique que não há outro executor e que o card continua atribuído ao usuário autenticado e elegível antes de retirar `agent_ready`. Não adquira outra trava nem crie outra worktree para esse card. Se o handoff estiver incompleto ou ambíguo, preserve estado e bloqueie a rodada até esclarecer ownership.

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
- A trava cobre worktrees do mesmo clone nesta máquina. Outros clones/máquinas dependem da consulta do Linear e da retirada de `agent_ready`; a label não é uma aquisição atômica entre hosts.

## Liberação e retomada

- Sem candidato elegível, não criar trava. Se a elegibilidade desaparecer após adquirir a trava e antes de iniciar trabalho, liberar somente a própria reserva e encerrar.
- Após entregar a PR validada em revisão humana e registrar esse estado no Linear, liberar a própria trava. Retirar `agent_ready` e os checks de PR/estado impedem que uma nova rodada retome essa entrega como card novo.
- Para liberar: `python -B -X utf8 .agents/skills/muvit-autonomous/scripts/local_lock.py release --card MUV-15 --run-id $muvitRunId`. O script exige o `run_id` gravado; dono divergente, JSON inválido ou falha de leitura não autorizam remoção.
- Bloqueio, interrupção ou review pendente preservam a trava, UUID e dados de retomada. Não usar TTL, idade do arquivo ou ausência do PID do script para apagar automaticamente uma reserva.
- Ao retomar uma reserva existente, conferir dono/execução, worktree, Git, PR e Linear. Prosseguir na mesma rodada somente com ownership comprovado e sem executor concorrente; preservar o UUID existente. Uma reserva órfã só pode ser liberada após comprovar que o executor anterior terminou e reconciliar trabalho e estado do card; registrar a decisão nas evidências antes da liberação. Em caso de dúvida, reportar bloqueio.
