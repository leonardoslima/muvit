---
name: muvit-autonomous
description: Use quando o usuário pedir uma rodada autônoma do Muvit para um card em Todo ou a retomada de uma rodada identificada. Consultar ou editar a skill não inicia uma rodada.
metadata:
  version: "9.2.0"
---

# Muvit Autonomous — fluxo específico do projeto Muvit

O coordenador Codex Luna xhigh conduz uma rodada autorizada de um card com o perfil obrigatório `hybrid_go` (Codex Plus + OpenCode Go), até merge em `develop` e confirmação de `Done` no Linear. Use a mesma worktree Orca durante toda a rodada. `agents.toml` especifica papéis e modelos. Priorize comandos determinísticos, contexto delimitado, reuso de sessões e execução sequencial.

Consultar ou editar esta skill autoriza somente manutenção: não inicia rodada, claim, workers, commit, push ou PR. `agents.toml` nesta skill define todos os papéis e modelos; `.codex/config.toml` apenas espelha o perfil do coordenador para o host, que precisa aplicá-lo. A skill não troca o modelo de uma sessão já iniciada. Quando `$muvit-dispatch` entregar um card, o coordenador assume somente aquela rodada, verifica a reserva e usa a worktree recebida.

## Pré-requisitos e precedência

- Carregue `references/selection-and-state.md` e `references/superpowers-and-delegation.md` antes da seleção e do claim; use `references/environment.md` ao preparar a worktree e os serviços, `references/quality-and-qa.md` na validação, `references/pr-and-review-loop.md` ao preparar a PR e `references/closure-and-recovery.md` no handoff ou fechamento. Carregue mobile/web quando o card tocar essas superfícies.
- Antes do claim manual ou após conferir o handoff, registre `hybrid_go`, leia os guias versionados de `orchestration` e `orca-cli` e confirme runtime, identidade do coordenador, autenticação e modelos. Go indisponível ou perfil divergente bloqueia a rodada. `codex_only` permanece no manifesto para trabalhos com autorização separada.
- Todo planejamento e execução de mudanças seguem **Superpowers**, com decisões e planejamento internos autônomos, sem exigir aprovação humana intermediária. Se ferramenta/skill não existir, não chame um planejamento comum de Superpowers: explicite o bloqueio.
- Prioridade: segurança e instruções expressas do usuário > instruções de repo validadas > requisitos do card > regras desta skill. Conflitos materiais precisam ser registrados antes de agir.
- Uma rodada = **um card**. Este coordenador não seleciona outro card na mesma rodada. Respeite o teto global de quatro agentes Muvit vivos, incluindo outros coordenadores, despachante, workers, descendentes e tentativas incertas.

## Loop de execução obrigatório

1. **Precheck**: confirme repo, `origin/develop`, proteção ativa conforme `references/develop-protection.md`, ferramentas, identidade e workspace do Linear e isolamento. Somente cards próprios, atribuídos ao ID autenticado e elegíveis conforme `references/selection-and-state.md` entram na rodada. Identidade ou gates indisponíveis exigem bloqueio. Sem card próprio elegível, reporte sem abrir trabalho.
2. **Claim local de rodada nova**: selecionar só um card do time `MUV` no workspace `18309e87-272d-4c09-aa18-ed1711c84dcf`, com estado exato `Todo`, atribuído ao usuário autenticado, com dependências concluídas e livre de conflitos. Adquirir a trava local atômica com `scripts/local_lock.py` conforme `references/selection-and-state.md`. Se a reserva veio de `$muvit-dispatch`, conferir seu `run_id` e ownership sem adquiri-la novamente. Logo antes de mover para `In Progress`, revalidar a elegibilidade após a reserva e descartar se o estado mudou. Conferir o resultado no Linear e preservar todas as labels. Retomadas autorizadas seguem `references/closure-and-recovery.md`. Não criar/publicar branches de reserva `automation/claims/*`.
3. **Contexto e plano**: aprofundar a leitura de issue, comentários, dependências, critérios e documentos, avaliar worktrees/branches/PRs associados. Delegar o plano ao worker Orca do papel `planner` na rota registrada, aplicando Superpowers integralmente de modo autônomo. Encerrar o turno para aguardar o evento de resposta, preservando rodada e trava; retomar pelo protocolo Orca antes da próxima etapa. O principal coordena a execução do plano, sem refazê-lo.
4. **Isolamento**: criar worktree e branch de nome curto do card sobre base remota atualizada, e ambiente de teste separado (Docker, PostgreSQL, API, dados e `.env`). Se a worktree veio de `$muvit-dispatch`, verificar base e HEAD e não duplicá-la. Nunca reutilizar banco mutável de outra rodada. Verificar serviços e seed antes de testes.
5. **Implementar/validar**: delegar implementação e correções ao implementador da rota registrada, sem sobreposição de escrita. O implementador executa checks determinísticos; convoca o verificador do mesmo perfil somente quando uma investigação independente trouxer valor. Em interface afetada, QA visual testa os fluxos reais via `adb` e emulador dedicado para mobile ou navegador Orca para web, após comprovar que o worker recebe capturas e controla as ferramentas necessárias; sem essa capacidade, registrar o gate como não comprovado e resolver antes da entrega. Tarefas explícitas de edição de `.pen` usam Pen CLI.
6. **Integrar e abrir PR**: valide e revise de forma independente a HEAD integrada. Publique somente a branch de entrega do card, abra PR para `develop` e vincule ao Linear. Registre a HEAD remota e as evidências.
7. **Revisar após PR**: aplique `references/pr-and-review-loop.md`. Obtenha revisão independente, CI e QA aplicável na HEAD final e trate threads acionáveis. Confira Codex Review quando habilitado. Após alteração, revalide e obtenha nova revisão, sem limite fixo de ciclos.
8. **Entregar**: em rodada autorizada, use o gate de entrega para mesclar a HEAD comprovada em `develop`, sujeito às regras do GitHub. Só feche o card após confirmar o merge e o vínculo do PR. Releia o Linear antes de liberar a trava. Em bloqueio, preserve a rodada e registre a condição pendente. Siga `references/closure-and-recovery.md` para limpeza segura.

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

**Escopo desta versão:** entrega autônoma da rodada autorizada em `hybrid_go`. Manutenção da skill não autoriza execução de card nem comprova o runtime Orca.
