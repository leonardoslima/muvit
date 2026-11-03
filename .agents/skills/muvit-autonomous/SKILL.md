---
name: muvit-autonomous
description: Use quando o usuário pedir uma rodada autônoma do Muvit para um card agent_ready ou a retomada de uma rodada identificada. Coordena agentes com modelos e esforços fixos; consultar ou editar a skill não inicia uma rodada.
metadata:
  version: "8.1.0"
---

# Muvit Autonomous — fluxo específico do projeto Muvit

Esta skill define **o que fazer, os critérios de qualidade, o contexto do Muvit e quando considerar a entrega concluída**. O chat principal usa Terra medium para coordenar e delega diretamente aos especialistas de `.codex/agents/` do projeto. Sol high planeja e revisa em sessões independentes; Terra xhigh implementa; Luna medium executa checks; Terra medium faz QA visual quando houver interface afetada. Priorize economia da assinatura Plus, contexto delimitado e execução sequencial. Orca pode disparar agendamentos e oferecer browser para QA.

Consultar ou editar esta skill autoriza somente manutenção: não inicia rodada, claim, commit, push ou PR. A configuração do principal está em `.codex/config.toml`; o host precisa aplicá-la, pois a skill não troca o modelo de uma sessão já iniciada.

## Pré-requisitos e precedência

- Leia `references/selection-and-state.md`, `references/superpowers-and-delegation.md`, `references/environment.md`, `references/quality-and-qa.md`, `references/pr-and-review-loop.md` e `references/closure-and-recovery.md` antes de agir. Referências extras de mobile/web quando aplicáveis.
- Confirme que o host consegue aplicar os perfis de `.codex/config.toml` e `.codex/agents/muvit-*.toml` antes do claim. Use os nomes dos agentes ou os mesmos modelos, esforços e instruções explicitamente na ferramenta nativa. Perfil obrigatório indisponível é bloqueio, sem substituição silenciosa ou execução simulada.
- Todo planejamento e execução de mudanças seguem **Superpowers**, com decisões e planejamento internos autônomos, sem exigir aprovação humana intermediária. Se ferramenta/skill não existir, não chame um planejamento comum de Superpowers: explicite o bloqueio.
- Prioridade: segurança e instruções expressas do usuário > instruções de repo validadas > requisitos do card > regras desta skill. Conflitos materiais precisam ser registrados antes de agir.
- Uma rodada = **um card**. Rodadas diferentes podem ocorrer paralelamente em cards sem dependências e com ambientes isolados.

## Loop de execução obrigatório

1. **Precheck**: confirmar repo correto, branch base remota (normalmente `origin/develop`, verificar), ferramentas disponíveis, Linear por conector/plugin autorizado, isolamento do ambiente e card desbloqueado. Não inventar estados/ferramentas. Se não houver card elegível, relatar sem abrir trabalho.
2. **Claim**: selecionar só um card `agent_ready` elegível, checar se já há outra rodada executando, registrar tomada/estado no Linear e retirar `agent_ready` assim que começar. Não fazer duas seleções na mesma execução.
3. **Contexto e plano**: ler issue, comentários, dependências, critérios e documentos, avaliar worktrees/branches/PRs associados. Delegar o plano a `muvit-planner`, aplicando Superpowers integralmente de modo autônomo. O principal coordena a execução do plano, sem refazê-lo.
4. **Isolamento**: criar worktree e branch de nome curto do card sobre base remota atualizada, e ambiente de teste separado (Docker, PostgreSQL, API, dados e `.env`). Nunca reutilizar banco mutável de outra rodada. Verificar serviços e seed antes de testes.
5. **Implementar/validar**: delegar implementação e correções a `muvit-implementer`, sem sobreposição de escrita. Usar `muvit-quality-verifier` para a bateria de checks que justifique delegação; checks simples podem ficar com o implementador. Em interface afetada, `muvit-visual-qa` testa os fluxos reais via `adb` e emulador dedicado para mobile ou navegador Orca para web, sem exigir comparação com design. Tarefas explícitas de edição de `.pen` usam Pen CLI.
6. **Integrar e abrir PR**: obter revisão independente de `muvit-reviewer` sobre a HEAD integrada, preservar integridade do branch e conferir validação integrada. Em rodada completa autorizada, commitar/push conforme padrão repo, abrir PR apontando para base correta e vincular card. A autorização não inclui merge.
7. **Revisar após PR**: conferir revisão automática do Codex no GitHub (se habilitada), esperar/pollar a cada 5 min até 6 verificações por espera (~30 min). Corrigir findings acionáveis, rodar checks, push e aguardar nova revisão; repetir **sem limite fixo de ciclos e sem teto agregado de 90 minutos**.
8. **Entregar**: só marcar pronto para revisão humana quando CI/checks e revisão na HEAD corrente realmente não tiverem findings acionáveis, ou documentar bloqueio/timeout. Atualizar Linear com PR, testes e pendências. Limpar somente recursos próprios que não prejudiquem correções subsequentes.

## Gates de conclusão

- `P0/P1` acionáveis **sempre** devem ser corrigidos; `P2/P3` só podem ser adiados com justificativa técnica verificável e rastreio explícito. Rejeitar achados falsos com evidência, não por conveniência.
- O ciclo de revisão termina quando não restam problemas acionáveis na HEAD revisada. Uma espera individual pode encerrar com bloqueio após 6 polls sem resposta: ausência de review **não significa aprovação**.
- Resultado de worker não é prova: conferir alterações no Git, testes e evidência do comportamento. Não reduzir testes nem requisitos para fazer a pipeline passar.
- Se bloqueado por autenticação, cota, dependências, serviço externo ou revisão pendente, preservar estado e reportar honestamente; não declarar sucesso nem remover recursos necessários para retomada.

## Localizar os protocolos

- `references/selection-and-state.md` — elegibilidade, claim, dependências, branch e Linear.
- `references/superpowers-and-delegation.md` — coordenador Terra, perfis fixos, Superpowers, uso por etapa e ownership.
- `references/environment.md` — worktree, Docker, banco, API e segredos.
- `references/quality-and-qa.md` — testes, gates e evidência.
- `references/mobile.md` — adb, emulador e fluxo mobile.
- `references/web-and-design.md` — navegador Orca, Pen CLI e design.
- `references/pr-and-review-loop.md` — PR, reviews, prioridade, polling, ciclos ilimitados.
- `references/closure-and-recovery.md` — estados finais, retomada e cleanup.
- `references/project-boundaries.md` — restrições relevantes ao repositório/negócio.
- `templates/` — descrições/relatórios de handoff e PR.

**Escopo desta v8.1 local:** fluxo v8 com delegação direta e perfis fixos do projeto. Consulte `MIGRATION-NOTE.md` para a proveniência e as limitações históricas do pacote original.
