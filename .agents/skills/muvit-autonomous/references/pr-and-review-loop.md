# PR, revisão e merge em develop

## Antes de abrir o PR

- Publique só a branch de entrega do card, após validar a mudança integrada. Abra PR no mesmo repositório, com base `develop`, e vincule o URL do PR ao card no Linear. Use o ID imutável do card na mesma conexão e workspace do claim.
- Confirme no precheck que o ruleset ativo de `develop` corresponde à política de [proteção da branch](develop-protection.md), que squash está habilitado e que a conta da rodada tem permissão normal de merge. Proteção indisponível ou divergente bloqueia a entrega e deve ser reportada. A rodada não altera regras.
- Use referência comum ao card no título/corpo e vínculo no Linear. Evite palavras-chave de fechamento automático no GitHub ou na integração do Linear e confirme que a integração não antecipa as transições de estado controladas pelo coordenador.

## Após abrir o PR e após cada push

1. Compare a HEAD do PR com a HEAD local. Registre revisão independente de `muvit-reviewer` sobre a HEAD final, validação integrada, QA aplicável e os checks do GitHub. Se QA for inaplicável, registre a justificativa na mesma HEAD.
2. Confira se o Codex Review do GitHub está habilitado. Quando ativo, confirme a revisão para a HEAD corrente. Consulte a cada **5 minutos**, até **6 checagens por espera**. Se a revisão esperada não chegar, registre `REVIEW_PENDING` e bloqueie a entrega. Quando desabilitado, registre a constatação e prossiga com a revisão independente obrigatória.
3. Trate threads e achados com evidência, severidade, arquivo, cenário e HEAD. Corrija `P0/P1` acionáveis. Adie `P2/P3` somente com justificativa objetiva e pendência rastreável. Registre a decisão nas threads que couberem ao coordenador. Se a conversa continuar aberta ou exigir a decisão do autor, preserve o bloqueio do GitHub.
4. Após cada correção, push ou atualização da branch, invalide evidências da HEAD anterior. Rode checks e QA afetados e obtenha nova revisão independente na HEAD remota atual. Repita **sem limite fixo de ciclos**. Preserve o histórico no template `review-iteration.md`.
5. Somente com os gates comprovados, confirme no Linear o vínculo com o PR exato e passe para `In Review` com `agent_review`. Essa etapa registra validação técnica para merge, sem aprovação humana rotineira.

## Executar merge e fechar

Somente o coordenador de uma rodada autorizada usa `scripts/delivery_gate.py`, na worktree reservada. Antes de chamar o script, confirme exclusividade da execução no Orca e reconcilie GitHub/Linear. A trava local não protege contra outro clone. O coordenador não muda o destino do PR e deve bloquear se outro executor estiver editando o mesmo PR ou card.

Salve o registro JSON da rodada antes da primeira tentativa, em `artifacts/<escopo>/<execução>/`. Os campos são:

- `card`, `issue_id`, `workspace_id`, `assignee_id`, `run_id`, `profile` (`hybrid_go`), `pr` (número), `branch` e `head` (SHA completo).
- `review`, `qa` e `threads`, cada um com `head`, `result` e `evidence`. Use `PASS` ou, somente para QA inaplicável, `NOT_APPLICABLE`. Em `evidence`, aponte para recibos da revisão, relatório de QA ou inspeção/decisões das threads. O coordenador valida o conteúdo dessas evidências.
- Em outro JSON, grave uma leitura recente do Linear com `card`, `issue_id`, `workspace_id`, `assignee_id`, `state`, `labels` (nomes) e `links` (URLs canônicos vinculados). Leia pela mesma conexão usada no claim e confira o responsável autenticado.

```powershell
python -B -X utf8 .agents/skills/muvit-autonomous/scripts/delivery_gate.py merge --record $muvitDeliveryRecord --linear $muvitLinearSnapshot
```

O gate confere trava, identidade do PR, evidências, ruleset e checks bem-sucedidos da HEAD. O GitHub aplica as regras no momento do squash via API de PR com `sha` obrigatório. Não use `--admin`, `--auto`, merge local, push direto, alteração de regras ou método alternativo para contornar uma recusa. O GitHub garante a HEAD esperada, mas a API não oferece condição atômica para a base do PR. A leitura mais recente e a prova pós-merge conferem `develop`. Se a base mudar ou a resposta ficar incerta, suspenda a entrega e reconcilie antes de agir.

Após o merge, releia o Linear, atualize o snapshot e rode:

```powershell
python -B -X utf8 .agents/skills/muvit-autonomous/scripts/delivery_gate.py close-plan --record $muvitDeliveryRecord --linear $muvitLinearSnapshot
```

O script autoriza o fechamento somente após ler o PR correto como mesclado, confirmar que o commit de merge integra `develop` e conferir o vínculo com o card. Em `UPDATE_LINEAR`, atualize esse card para `Done` e retire só as labels de automação listadas, preservando as demais e o vínculo. Use o conector Linear da rodada, sem copiar credenciais. Registre os SHAs da HEAD e do merge e releia estado, labels e vínculo. `DONE_CONFIRMED` confirma uma releitura já consistente. Preserve a trava até essa confirmação.

Após timeout, recusa ou reinício, reconcilie o mesmo PR, HEAD, card e trava antes de repetir. Se a mesma HEAD já foi mesclada, confirme o merge e retome somente o fechamento pendente. Se o PR ainda estiver aberto e a HEAD mudou, refaça os gates e persista as novas evidências antes de nova tentativa. Se a escrita no Linear ficou incerta, releia e aplique só o delta restante. Estado ou ownership divergente exige bloqueio e relatório com a ação concreta pendente.

## Registro por iteração

`head_sha`, `review_id`, `timestamp`, `poll_count`, `findings`, `severity`, `accepted/rejected`, `rationale`, `correction_commit`, `checks`, `review_status`, `remaining`. Preserve rastro pequeno, seguro e reprodutível. Veja `templates/review-iteration.md`.
