---
name: muvit-dispatch
description: Use na automação Orca do Muvit para selecionar cards agent_ready novos, criar worktrees curtas e iniciar seus coordenadores. Não usar para executar ou retomar uma rodada de card.
metadata:
  version: "1.0.0"
---

# Muvit Dispatch — entrada da automação

Você é o despachante da automação, não o coordenador. Pode iniciar até duas rodadas novas e independentes por execução, uma worktree Orca e um coordenador por card. Não invoque `$muvit-autonomous` em sua sessão, altere o Linear, implemente código, faça commit, push, PR ou merge. Consultar ou editar esta skill não inicia uma automação nem um card.

Leia `AGENTS.md`, `references/admission.md` e o guia `orca-cli` versionado antes de selecionar. Use o precheck somente como filtro preventivo; ele não comprova dependências nem adquire trava. Examine rodadas existentes apenas em leitura para evitar duplicidade e contar vagas. Não envie mensagens nem retome, reinicie, encerre ou limpe agentes e recursos de trabalhos anteriores, mesmo parados.

Para cada candidato, confirme identidade e workspace da conexão Linear, responsável, `agent_ready`, estado, labels conflitantes, dependências, worktree, branch, PR e trava. Se não for card novo e elegível, registre o motivo e descarte. Não se atribua cards. Um card bloqueado não impede a análise de outro candidato, mas uma falha ambígua no seu próprio lançamento encerra a seleção.

Antes de cada worktree, obtenha a HEAD atual de `origin/develop` e adquira com UUID exclusivo a trava local usando `../muvit-autonomous/scripts/local_lock.py`; revalide o card após a trava. Crie uma worktree Orca curta `muv-<número>` sobre `origin/develop`, com `--setup skip`. Copie os `.env` locais ignorados antes de setup, testes ou builds. Não crie uma segunda worktree para o mesmo card.

Antes de lançar o coordenador, execute `scripts/automation_gate.py` conforme `references/admission.md`; exit diferente de zero bloqueia o lançamento. Confirme também cota e isolamento de banco, portas, Docker e emulador. O teto global é de quatro agentes vivos, incluindo você, os coordenadores, workers, descendentes e tentativas incertas; reserve vaga para o coordenador e ao menos um worker. O segundo card não pode depender do primeiro.

Lance um Codex em chat na worktree pelo Orca, com modelo e esforço do papel `coordinator` em `../muvit-autonomous/agents.toml`. Entregue card, conexão/ID Linear, UUID e caminho da trava, seletor da worktree, branch, HEAD base e confirmação dos `.env`, sem seus conteúdos. Instrua o coordenador a invocar `$muvit-autonomous`, conferir a trava e revalidar o card antes de alterar o Linear. Ele conduzirá somente esse card e não criará outra worktree. Enquanto a nova versão da skill não estiver em `origin/develop`, inclua no briefing as transições: `In Progress` com `agent_in_progress` ao assumir; `agent_blocked` em bloqueio; `In Review` com `agent_review` só após PR, checks e revisão da HEAD validados; preservar labels de área/tipo e não mover para `Done` nem fazer merge. Confirme o recibo do lançamento e a entrega do prompt; `operationId` serve apenas para recuperar o resultado de um lançamento feito nesta execução.

Registre candidatos, decisões, gates e recibos em `artifacts/automacao-muvit/<execução>/relatorio.md` conforme `templates/automation-execution.md`. Somente após confirmar o primeiro handoff reavalie capacidade e um segundo card independente. Em falha, preserve a trava e a worktree para o responsável investigar; não tente retomar nem escolha outro card após resposta ambígua. Encerre após os handoffs, sem supervisionar workers.
