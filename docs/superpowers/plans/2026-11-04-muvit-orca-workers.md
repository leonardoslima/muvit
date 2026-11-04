# Plano de implementação — workers Orca da muvit-autonomous

> Executar com `superpowers:executing-plans`, nesta sessão, sem iniciar workers reais.

**Objetivo:** aplicar o desenho aprovado de chat Orca preferencial com CLI como fallback autorizado.

**Arquitetura:** os TOMLs existentes fornecem modelos, esforços e instruções; o coordenador aplica esses dados aos workers supervisionados do Orca. O runtime administra superfície, mensagens e eventos de conclusão.

**Tecnologias:** Markdown, TOML, Python unittest e CLI Orca instalada.

**Especificação:** [desenho aprovado](../specs/2026-11-04-muvit-orca-workers-design.md).

## Restrições

Preservar perfis, qualidade, um card por rodada e isolamento; manter a assinatura Plus sem extras. Não iniciar rodada ou workers reais, alterar configurações globais, commitar, publicar ou abrir PR nesta manutenção. Executar localmente no checkout atual; testes da skill não exigem instalação ou ambiente da aplicação. A aprovação do desenho autoriza a implementação; não acrescentar outra pausa de aprovação para este plano.

## Foco de revisão

Conferir chat e fallback CLI, resultado desconhecido sem duplicação, retomada por eventos sem liberar a trava, aplicação explícita dos perfis e contagem de workers fora do limite interno do Codex. Validação documental não comprova esses comportamentos no runtime.

## Tarefa 1 — contrato e protocolo Orca

- [x] Atualizar `tests/test_contract.py` para a versão 8.2.0 e conferir o exemplo de lançamento contra o TOML do planejador e a presença dos contratos de recuperação e retomada; executar e observar falha antes da mudança.
- [x] Atualizar `SKILL.md` e `references/superpowers-and-delegation.md`: backend Orca, guias versionados, aplicação explícita dos perfis, tarefa autossuficiente, chat/CLI, eventos e restrições de workers.
- [x] Atualizar `references/closure-and-recovery.md`, `references/environment.md` e `templates/progress.md`: workspace, preparação de `.env`, identidade Run/Task/Dispatch, superfície e próxima ação.
- [x] Atualizar README, changelog e nota de migração para a versão atual, preservando registros históricos.

## Tarefa 2 — validação e entrega local

- [x] Executar `python -B -X utf8 -m unittest discover -s .agents/skills/muvit-autonomous/tests -v` e o `quick_validate.py` da skill-creator.
- [x] Conferir diff, UTF-8 estrito, escapes Unicode, referências locais e aderência ao desenho. Revisar manualmente os cenários chat, CLI, falha desconhecida e evento de conclusão sem iniciar agentes.
- [x] Marcar o desenho como aprovado e registrar os resultados e limites reais, sem commit.

## Registro de execução

Plano e desenho aprovados orientam manutenção documental local. A avaliação comportamental com subagentes fica fora desta execução porque o desenho proíbe iniciar workers para validá-la; não apresentar checks estáticos como execução real.

Contrato inicial: nove testes executados, sete falhas esperadas em versão e protocolo ainda ausentes. Após a alteração: 21 testes passaram. O Python local não tinha PyYAML; a validação foi executada com `uv run --no-project --with pyyaml python -B -X utf8 C:/Users/Leonardo/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/muvit-autonomous`, com resultado `Skill is valid!`. A ajuda instalada confirmou as flags de lançamento e leitura. Valores de `.codex/` preservados. Revisão feita nesta sessão, sem avaliação independente ou lançamento real de workers.
