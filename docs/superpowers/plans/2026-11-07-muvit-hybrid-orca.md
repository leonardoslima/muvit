# Muvit autonomous v9 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formalizar os perfis Codex Plus/OpenCode Go e a delegação hierárquica aprovada para a skill Muvit.

**Architecture:** `agents.toml` dentro da skill reúne instruções comuns e roteamento por perfil `hybrid_go` ou `codex_only`. O coordenador escolhe o perfil antes do claim e o aplica explicitamente ao Orca; `.codex/config.toml` espelha somente o coordenador para o host.

**Tech Stack:** Markdown, TOML, Orca CLI, OpenCode CLI, unittest Python.

**Spec:** `docs/superpowers/specs/2026-11-07-muvit-hybrid-orca-design.md`

## Global Constraints

- Um card por rodada; quatro agentes vivos no máximo; dois níveis de delegação.
- Nenhum worker ou card foi iniciado nesta manutenção; commit e push foram autorizados pelo usuário após a validação. A autorização não inclui PR.
- Manter UTF-8 literal, Superpowers, QA real e revisão independente.

## Review Focus

- Diferenciar `opencode-go/deepseek-v4.1-flash` do modelo Free.
- Não aplicar `--effort` a OpenCode nem tratar `agents.toml` como registro automático do Orca.
- Não apresentar `--from` como subdelegação já comprovada.
- Impedir que revisor edite ou chame implementador.
- Contar auxiliares no teto e encerrar subworkers antes de `worker_done` do pai.

### Task 1: Contrato e perfis

**Files:** `.agents/skills/muvit-autonomous/agents.toml`, `.agents/skills/muvit-autonomous/tests/test_contract.py`, `.codex/config.toml`, `.agents/skills/muvit-autonomous/SKILL.md`, `.agents/skills/muvit-autonomous/references/superpowers-and-delegation.md`. Remover `.codex/agents/muvit-*.toml`.

**Interfaces:** `agents.toml` define instruções por papel e agente, modelo e esforço por perfil; o protocolo define seleção, delegação e limites. O coordenador lê ambos antes de lançar cada worker.

- [x] Escrever testes estáticos para os perfis híbridos e delegação e observar falha esperada.
- [x] Reunir perfis na skill, remover os TOMLs antigos e atualizar o protocolo, preservando os gates da v8.2.
- [x] Rodar o teste de contrato e confirmar aprovação.

### Task 2: Documentação e validação

**Files:** `.agents/skills/muvit-autonomous/README.md`, `.agents/skills/muvit-autonomous/CHANGELOG.md`, testes de contrato e demais referências que contradigam a v9.

**Interfaces:** README e changelog descrevem o mesmo contrato da skill; testes detectam divergências relevantes.

- [x] Atualizar documentação de uso, limites e estado de validação.
- [x] Rodar toda a suíte da skill, validação do frontmatter, `git diff --check` e busca de escapes Unicode nos arquivos alterados.
- [x] Conferir o diff e relatar limitações sem declarar subdelegação testada.

### Task 3: Compatibilidade para colaborador somente Codex

**Files:** `.agents/skills/muvit-autonomous/agents.toml`, `SKILL.md`, `references/superpowers-and-delegation.md`, `README.md`, `CHANGELOG.md`, `MIGRATION-NOTE.md` e `tests/test_contract.py`.

**Interfaces:** `profiles.hybrid_go` e `profiles.codex_only` definem os mesmos papéis; `roles` fornece as instruções comuns. O perfil escolhido antes do claim rege toda a rodada.

- [x] Escrever teste de contrato para os dois perfis e observar falha da versão anterior.
- [x] Adicionar perfil somente Codex e seleção antes do claim, sem troca durante a rodada.
- [x] Revalidar suíte, skill, diff e UTF-8 e registrar resultados.

### Task 4: Economia real no perfil somente Codex

**Files:** `agents.toml`, `SKILL.md`, `references/superpowers-and-delegation.md`, documentação e `tests/test_contract.py`.

**Interfaces:** O coordenador classifica o escopo antes do claim. `bounded` usa Luna medium no plano e implementação; `complex` usa Sol medium. O revisor permanece Sol medium e QA visual aplicável permanece Terra medium. Uma descoberta nova exige replanejamento ou escalação com evidência, sem troca automática de rota por cota.

- [x] Consultar a orientação oficial de modelos e as faixas de uso do Codex Plus, sem equiparar preço de API a consumo da assinatura.
- [x] Fazer o teste de contrato falhar com a rota antiga de Sol medium em toda implementação.
- [x] Aplicar a classificação, os modelos e a documentação de manutenção.
- [x] Revalidar suíte, frontmatter, diff e UTF-8.

### Task 5: Esforço do coordenador

**Files:** `agents.toml`, `.codex/config.toml`, `SKILL.md`, `README.md`, documentação e `tests/test_contract.py`.

**Interfaces:** Os dois perfis e o host usam Luna xhigh para coordenação. Planejamento, implementação e revisão conservam os esforços próprios de cada rota.

- [x] Confrontar orientação oficial com relatos da comunidade; não tratar relatos isolados como benchmark do Muvit.
- [x] Fazer o teste do perfil falhar com Luna medium e aplicar xhigh nos dois perfis e no host.
- [x] Revalidar suíte, frontmatter, diff e UTF-8.

## Evidência desta manutenção

O teste de contrato falhou antes da mudança; após os dois perfis, a suíte completa passou com 23 testes. `quick_validate.py` retornou `Skill is valid!`; `git diff --check` não encontrou erros. Os arquivos existentes alterados ou novos foram lidos como UTF-8 estrito e não houve escapes Unicode de acentuação. Nenhum worker, subworker, card ou PR foi iniciado. A aplicação do perfil do coordenador a uma sessão real e as capacidades de QA visual permanecem não comprovadas.

Na reorganização do perfil Codex, o teste voltou a falhar como esperado com Sol medium em todos os cards e passou após a mudança. A suíte completa teve 23 testes aprovados, `quick_validate.py` retornou `Skill is valid!`, `git diff --check` ficou limpo e nove arquivos desta etapa passaram pela leitura UTF-8 estrita e busca de escapes Unicode. A página oficial do [Codex Plus](https://chatgpt.com/codex/pricing/) estima 350–3.000 mensagens locais com Luna e 15–160 com Sol 6.1 por janela de cinco horas, com variação por tarefa e limites semanais possíveis; isso orienta a rota, mas não mede economia real por card. [Orientação de modelos](https://developers.openai.com/api/docs/guides/model-selection) posiciona Luna para tarefas delimitadas, Terra para QA visual e correções localizadas, e Sol para trabalho técnico complexo. Nenhum worker ou card foi iniciado nesta manutenção.

Na escolha do esforço de coordenação, a [orientação oficial](https://developers.openai.com/api/docs/guides/model-selection) aponta Luna xhigh para reunir contexto entre aplicativos e priorizar trabalho. Há exemplos públicos de Luna xhigh e max como coordenador, mas são relatos e perfis, sem comparação controlada no Muvit. O teste do perfil falhou com Luna medium antes da alteração e a suíte de 23 testes passou após xhigh nos dois perfis e no espelho do host. `quick_validate.py` retornou `Skill is valid!`, `git diff --check` ficou limpo e dez arquivos passaram por UTF-8 estrito e busca de escapes. Nenhuma sessão já iniciada recebeu novo esforço por essa edição.
