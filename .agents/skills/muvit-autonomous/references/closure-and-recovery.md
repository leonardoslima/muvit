# Fechamento e retomada sem supervisor persistente

- Cada agendamento do Orca inicia **uma rodada independente com um card**. Sem supervisor externo permanente, agente pai separado, watchdog próprio ou automação que fica retomando agentes órfãos. Uma execução futura pode escolher outro card desbloqueado; não duplicar card ainda em andamento.
- O Codex principal conserva estado de trabalho: ID e status do Linear, branch, worktree, HEAD, infra isolada, plano Superpowers, testes, PR, últimas revisões, pendências e próximos passos. Registrar nos artefatos/repositório apropriados sem segredo. Incluir Run/Task/Dispatch Orca, workspace, handles quando expostos, perfis solicitados/efetivos, superfície chat/CLI, estado das tentativas e próxima ação indicada nos recibos; usar `templates/progress.md`.
- Ao terminar com sucesso técnico, publicar resumo no Linear/PR e deixar ambos prontos para análise humana. É proibido merge automático e Done sem procedimento humano do projeto.
- Após esse handoff e a atualização do Linear, liberar somente a trava local da própria rodada pelo `scripts/local_lock.py release`, conforme `selection-and-state.md`. Em bloqueio, interrupção ou review pendente, preservar trava e UUID para retomada; não remover por idade nem criar reserva remota substituta.
- Fechar emuladores próprios e containers de teste criados. Para workers Orca, seguir o ciclo de liberação do guia versionado e os recibos, sem fechar terminais diretamente. Preservar sessões mantidas abertas pelo usuário e recursos não comprovados. Limpar somente recursos comprovadamente exclusivos. Não deletar branch remota/PR/worktree com alterações não integradas.
- Se qualquer etapa estiver bloqueada por ambiente, cota, dependência, conflito ou review após 6 polls, documentar precisamente e manter dados necessários para retomar. Não declarar como PASS nem apagar histórico útil.
- Não iniciar outra issue nesta rodada para preencher tempo após finalizar uma. Paralelismo só entre execuções distintas de cards independentes.
- Não atualizar state para Done enquanto a PR ainda depende de revisão humana/merge; usar status de revisão no fluxo real do Linear.

## Resultado final mínimo

- Card e branch; PR; HEAD; progresso e testes comprovados; emulador/browser/DB usados; resumo dos achados de review e decisões; estado de revisão humana; status de limpeza; bloqueios e próximos passos.

## Espera e recuperação dos workers Orca

- Encerrar o turno após delegar é espera da mesma rodada. Preservar trava, UUID, Run, Task e Dispatch; retomar por evento, seguindo o `check` indicado. Não emitir entrega final da rodada enquanto existir tarefa necessária pendente.
- Ao retomar uma sessão, reconciliar o estado persistido com a Run e os workers reais antes de enviar entrada ou lançar outro especialista. Não iniciar outro worker para substituir um que apenas ficou silencioso.
- Em lançamento falho ou desconhecido, carregar `ORCA skills get orchestration --reference references/recovery-and-cleanup.md` com o executável resolvido; se o binário não suportar `--reference`, carregar `--full` e ler a referência indicada. Inspecionar `failedStage`, efeitos, recursos residuais e `next` quando expostos, além do Dispatch exato. Silêncio, timeout ou liveness `unverifiable` não provam saída nem autorizam retry, stop ou limpeza automática.
- Fallback CLI autorizado não contorna recuperação: preferir a decisão de superfície do próprio lançamento. Uma nova tentativa precisa ser segura conforme o guia e manter a Task original, `--retry-of` quando aplicável e placement explícito. Não criar Run/Task nova para driblar falhas ou o circuit breaker; se ele disparar, reportar e parar retries automáticos.
- Seguir `next` e o guia versionado para liberação/recuperação; não usar reset para apagar histórico sem autorização explícita. Cancelar, abandonar e liberar são ações distintas e nenhuma prova, por si só, saída de processo. Preservar recursos necessários à retomada e registrar bloqueios honestamente.
