# Fechamento e retomada sem supervisor persistente

- Cada agendamento do Orca inicia **uma rodada independente com um card**. Sem supervisor externo permanente, agente pai separado, watchdog próprio ou automação que fica retomando agentes órfãos. Uma execução futura pode escolher outro card desbloqueado; não duplicar card ainda em andamento.
- O Codex principal conserva estado de trabalho: ID e status do Linear, branch, worktree, HEAD, infra isolada, plano Superpowers, testes, PR, últimas revisões, pendências e próximos passos. Registrar nos artefatos/repositório apropriados sem segredo.
- Ao terminar com sucesso técnico, publicar resumo no Linear/PR e deixar ambos prontos para análise humana. É proibido merge automático e Done sem procedimento humano do projeto.
- Fechar emuladores próprios, shells do Orca associados à worktree quando possível e containers de teste criados. Limpar somente recursos comprovadamente exclusivos. Não deletar branch remota/PR/worktree com alterações não integradas.
- Se qualquer etapa estiver bloqueada por ambiente, cota, dependência, conflito ou review após 6 polls, documentar precisamente e manter dados necessários para retomar. Não declarar como PASS nem apagar histórico útil.
- Não iniciar outra issue nesta rodada para preencher tempo após finalizar uma. Paralelismo só entre execuções distintas de cards independentes.
- Não atualizar state para Done enquanto a PR ainda depende de revisão humana/merge; usar status de revisão no fluxo real do Linear.

## Resultado final mínimo

- Card e branch; PR; HEAD; progresso e testes comprovados; emulador/browser/DB usados; resumo dos achados de review e decisões; estado de revisão humana; status de limpeza; bloqueios e próximos passos.
