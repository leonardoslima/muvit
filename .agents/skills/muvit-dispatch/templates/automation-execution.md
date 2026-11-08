# Execução da automação Muvit

- Execução: data/hora, automação e workspace:
- Precheck: resultado e motivo:
- Identidade Linear: conexão, workspace e ID autenticado, sem credenciais:
- Candidatos: identificador, decisão (selecionado/descartado) e motivo verificável, incluindo dependências, labels e trabalho existente:
- Rodada 1: card, run_id, trava, worktree, branch, HEAD base, gate, recibo do lançamento e handle:
- Rodada 2: card, run_id, trava, worktree, branch, HEAD base, gate, recibo do lançamento e handle; ou motivo de não iniciar:
- Capacidade: agentes vivos observados, cota disponível e isolamento de banco, portas, Docker e emulador:
- Uso da automação: tokens/custo somente quando o Orca fornecer valores, com fonte; caso contrário `indisponível`:
- Resultado: handoffs confirmados, bloqueios e próxima ação:

Salve este resumo em `artifacts/automacao-muvit/<data-hora>-selecao/relatorio.md` na workspace de entrada, com os JSON de cada gate na mesma pasta. Não inclua conteúdo de `.env`, tokens ou dados pessoais desnecessários. Não trate recibo de lançamento como conclusão do card.
