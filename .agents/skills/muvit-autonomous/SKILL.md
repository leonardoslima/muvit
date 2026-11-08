---
name: muvit-autonomous
description: Use quando o usuário pedir uma rodada autônoma do Muvit para um card agent_ready ou a retomada de uma rodada identificada. Consultar ou editar a skill não inicia uma rodada.
metadata:
  version: "9.1.0"
---

# Muvit Autonomous — fluxo específico do projeto Muvit

Esta skill define **o que fazer, os critérios de qualidade, o contexto do Muvit e quando considerar a entrega concluída**. O chat principal usa Codex Luna xhigh para coordenar workers supervisionados do Orca. `agents.toml` oferece os perfis `hybrid_go` (Codex Plus + OpenCode Go) e `codex_only` (somente Codex Plus). Em rodada manual, o perfil é escolhido antes do claim; em handoff do despachante, o coordenador o escolhe antes de atualizar o Linear ou lançar workers. O perfil permanece até o fim da rodada; ambos preservam planejamento, implementação, QA aplicável e revisão independente. Priorize comandos determinísticos, contexto delimitado, reuso de sessões e execução sequencial. Workers podem convocar auxiliares nas condições de `references/superpowers-and-delegation.md`, respeitando o teto de agentes.

Consultar ou editar esta skill autoriza somente manutenção: não inicia rodada, claim, workers, commit, push ou PR. `agents.toml` nesta skill define todos os papéis e modelos; `.codex/config.toml` apenas espelha o perfil do coordenador para o host, que precisa aplicá-lo. A skill não troca o modelo de uma sessão já iniciada. Quando `$muvit-dispatch` entregar um card, o coordenador assume somente aquela rodada, verifica a reserva e usa a worktree recebida.

## Pré-requisitos e precedência

- Carregue `references/selection-and-state.md` e `references/superpowers-and-delegation.md` antes da seleção e do claim; use `references/environment.md` ao preparar a worktree e os serviços, `references/quality-and-qa.md` na validação, `references/pr-and-review-loop.md` ao preparar a PR e `references/closure-and-recovery.md` no handoff ou fechamento. Carregue mobile/web quando o card tocar essas superfícies.
- Antes do claim, escolha e registre `hybrid_go` ou `codex_only`; neste último, classifique o card na rota `bounded` ou `complex` conforme `references/superpowers-and-delegation.md`. No handoff da automação, o agente de entrada apenas adquire a trava; o coordenador escolhe e registra o perfil antes de alterar o Linear ou iniciar workers. Carregue os guias versionados de `orchestration` e `orca-cli` do executável Orca resolvido e confirme runtime, identidade do coordenador para receber eventos, ferramentas, autenticação e modelos da rota escolhida. `codex_only` não exige OpenCode Go. Inicie cada worker com agente, modelo e esforço quando aplicável, conforme `agents.toml`; os nomes dos papéis não são IDs de agentes Orca. Perfil obrigatório ou orquestração indisponível é bloqueio, sem substituição por subagentes internos deste chat ou execução simulada.
- Todo planejamento e execução de mudanças seguem **Superpowers**, com decisões e planejamento internos autônomos, sem exigir aprovação humana intermediária. Se ferramenta/skill não existir, não chame um planejamento comum de Superpowers: explicite o bloqueio.
- Prioridade: segurança e instruções expressas do usuário > instruções de repo validadas > requisitos do card > regras desta skill. Conflitos materiais precisam ser registrados antes de agir.
- Uma rodada = **um card**. Este coordenador não seleciona outro card na mesma rodada. Respeite o teto global de quatro agentes Muvit vivos, incluindo outros coordenadores, despachante, workers, descendentes e tentativas incertas.

## Loop de execução obrigatório

1. **Precheck**: confirmar repo correto, branch base remota (normalmente `origin/develop`, verificar), ferramentas disponíveis, usuário autenticado e workspace do Linear pela conexão utilizada, isolamento do ambiente e card desbloqueado. Somente cards atribuídos ao ID desse usuário podem ser elegíveis; sem responsável ou de outra pessoa ficam excluídos. Não inferir identidade por nome/Git/Windows. Identidade indisponível é bloqueio. Se não houver card próprio elegível, relatar sem abrir trabalho. Para `codex_only`, ler o card selecionável o suficiente para classificar a rota antes do claim.
2. **Claim local**: selecionar só um card `agent_ready` elegível por rodada, atribuído ao usuário autenticado, checar conflitos e adquirir a trava local atômica com `scripts/local_lock.py`, conforme `references/selection-and-state.md`, antes de alterar o Linear ou código. Reconsultar elegibilidade e responsável após a trava; o coordenador move o card para `In Progress`, troca `agent_ready` por `agent_in_progress` e confere o resultado no Linear. Se a reserva veio de `$muvit-dispatch`, conferir seu `run_id` e ownership sem adquiri-la novamente. Não criar/publicar branches de reserva `automation/claims/*`.
3. **Contexto e plano**: aprofundar a leitura de issue, comentários, dependências, critérios e documentos, avaliar worktrees/branches/PRs associados. Delegar o plano ao worker Orca do papel `planner` na rota registrada, aplicando Superpowers integralmente de modo autônomo. Encerrar o turno para aguardar o evento de resposta, preservando rodada e trava; retomar pelo protocolo Orca antes da próxima etapa. O principal coordena a execução do plano, sem refazê-lo.
4. **Isolamento**: criar worktree e branch de nome curto do card sobre base remota atualizada, e ambiente de teste separado (Docker, PostgreSQL, API, dados e `.env`). Se a worktree veio de `$muvit-dispatch`, verificar base e HEAD e não duplicá-la. Nunca reutilizar banco mutável de outra rodada. Verificar serviços e seed antes de testes.
5. **Implementar/validar**: delegar implementação e correções ao implementador da rota registrada, sem sobreposição de escrita. O implementador executa checks determinísticos; convoca o verificador do mesmo perfil somente quando uma investigação independente trouxer valor. Em interface afetada, QA visual testa os fluxos reais via `adb` e emulador dedicado para mobile ou navegador Orca para web, após comprovar que o worker recebe capturas e controla as ferramentas necessárias; sem essa capacidade, registrar o gate como não comprovado e resolver antes da entrega. Tarefas explícitas de edição de `.pen` usam Pen CLI.
6. **Integrar e abrir PR**: obter revisão independente de `muvit-reviewer` sobre a HEAD integrada, preservar integridade do branch e conferir validação integrada. Manter a branch da rodada local até esta etapa; publicar somente a branch de entrega do card para abrir PR, nunca uma branch auxiliar da automação. Em rodada completa autorizada, commitar/push conforme padrão repo, abrir PR apontando para base correta e vincular card. A autorização não inclui merge.
7. **Revisar após PR**: conferir revisão automática do Codex no GitHub (se habilitada), esperar/pollar a cada 5 min até 6 verificações por espera (~30 min). Corrigir findings acionáveis, rodar checks, push e aguardar nova revisão; repetir **sem limite fixo de ciclos e sem teto agregado de 90 minutos**.
8. **Entregar**: só marcar pronto para revisão humana quando CI/checks e revisão na HEAD corrente realmente não tiverem findings acionáveis, ou documentar bloqueio/timeout. No Linear, aplicar estado e labels da etapa conforme `references/selection-and-state.md`, vincular PR, registrar testes e pendências e conferir a leitura posterior. Após a entrega concluída, encerrar os processos e emuladores exclusivos da rodada conforme `references/closure-and-recovery.md`; preservar Docker e a worktree para possíveis correções.

## Gates de conclusão

- `P0/P1` acionáveis **sempre** devem ser corrigidos; `P2/P3` só podem ser adiados com justificativa técnica verificável e rastreio explícito. Rejeitar achados falsos com evidência, não por conveniência.
- O ciclo de revisão termina quando não restam problemas acionáveis na HEAD revisada. Uma espera individual pode encerrar com bloqueio após 6 polls sem resposta: ausência de review **não significa aprovação**.
- Resultado de worker não é prova: conferir alterações no Git, testes e evidência do comportamento. Não reduzir testes nem requisitos para fazer a pipeline passar.
- Se bloqueado por autenticação, cota, dependências, serviço externo ou revisão pendente, preservar estado e reportar honestamente; não declarar sucesso nem remover recursos necessários para retomada.

## Localizar os protocolos

- `references/selection-and-state.md` — elegibilidade, claim, dependências, branch e Linear.
- `agents.toml` — fonte dos agentes, modelos, esforços e instruções por papel.
- `references/superpowers-and-delegation.md` — aplicação dos perfis, Superpowers, delegação hierárquica e ownership.
- `references/environment.md` — worktree, Docker, banco, API e segredos.
- `references/quality-and-qa.md` — testes, gates e evidência.
- `references/mobile.md` — adb, emulador e fluxo mobile.
- `references/web-and-design.md` — navegador Orca, Pen CLI e design.
- `references/pr-and-review-loop.md` — PR, reviews, prioridade, polling, ciclos ilimitados.
- `references/closure-and-recovery.md` — estados finais, retomada e cleanup.
- `references/project-boundaries.md` — restrições relevantes ao repositório/negócio.
- `templates/` — descrições/relatórios de handoff e PR.

**Escopo desta v9 local:** perfis híbrido e somente Codex, com delegação limitada por papel. A manutenção não comprova worker real nem subdelegação no Orca. Consulte `MIGRATION-NOTE.md` para a proveniência e as limitações históricas do pacote original.
