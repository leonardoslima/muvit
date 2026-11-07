# Changelog

## 9.0.0 — 2026-11-07

- Coordenador dos dois perfis ajustado para Luna xhigh; max fica fora do padrão até haver ganho medido que compense tempo e cota.
- Reorganizado `codex_only` para Plus: rota `bounded` usa Luna medium no planejamento e na implementação; rota `complex` usa Sol medium nessas etapas. Sol medium permanece na revisão independente; Terra medium no QA visual; escalação técnica comprovada usa Sol high. A rota é registrada antes do claim, sem troca automática por cota.
- Dois perfis explícitos no mesmo `agents.toml`: `hybrid_go` e `codex_only`; colaboradores sem Go podem usar Codex Plus para todos os papéis sem perder os gates.
- Seleção e registro do perfil antes do claim; falha ou cota durante a rodada não muda o perfil automaticamente.
- Perfis e instruções dos papéis agora vivem em `agents.toml` dentro da skill; removidos os TOMLs de `.codex/agents/`. `.codex/config.toml` permanece como espelho do perfil do coordenador para o host.
- Roteamento híbrido: Codex Luna xhigh coordena, Sol medium planeja e revisa; OpenCode Go DeepSeek implementa e faz QA visual quando comprovado, MiMo verifica sob demanda.
- Workers podem convocar auxiliares conforme matriz de papéis, com dois níveis, ownership delimitado e teto de quatro agentes vivos incluindo o coordenador.
- IDs Go são aplicados no lançamento Orca, sem `--effort`; não há fallback automático para outro perfil.
- Testes estáticos não comprovam lançamento, subdelegação ou QA visual reais; a primeira rodada deve verificar essas capacidades antes de depender delas.

## 8.2.0 — 2026-11-04

- Especialistas passam a usar workers supervisionados do Orca, com chat nativo preferencial e CLI como fallback autorizado, preservando modelos e esforços.
- Perfis TOML são aplicados explicitamente ao lançamento Codex e ao briefing; não há fallback para subagentes internos do chat.
- Retomada por eventos, correções por mensagens e conclusão pelo protocolo Orca, com registro de Run/Task/Dispatch e superfície real.
- Recuperação evita duplicar lançamentos desconhecidos; fim de turno preserva rodada e trava. Mantidos isolamento, teto de agentes e gates de qualidade.
- Testes estáticos conferem o exemplo de lançamento contra o perfil do planejador; não comprovam workers reais ou eventos no runtime.

## 8.1.0 — 2026-11-03

- Base v8 restaurada e adaptada à delegação direta, com coordenador e cinco especialistas configurados em `.codex/` do projeto.
- Terra medium coordena, Sol high planeja e revisa em sessões independentes, Terra xhigh implementa, Luna medium executa checks e Terra medium faz QA visual.
- Execução sequencial como padrão, teto de quatro agentes contando o principal e assinatura Plus sem extras.
- QA visual em aplicação real, sem comparação obrigatória com design de referência.
- Testes de contrato analisam os perfis TOML, incluindo modelo, esforço e limite de especialistas.

## 8.0.0 — 2026-10-25

- Pacote completo e instalável, sem script de atualização e sem depender do ZIP v7.6.
- Responsabilidade da skill limitada ao workflow específico do Muvit; descoberta de modelos/roteamento/delegação enviados à `orchestrator` externa.
- Backend `native` e `cli` autorizados; agentes internos não têm modelo/effort fixo e subagentes internos são permitidos pelo backend quando disponíveis.
- Superpowers autônomo, um `agent_ready` por rodada, worktree/DB exclusivos, QA ADB/web/Pen e PR.
- Codex Review pós-PR e pós-push com polling 5 min/6 checks por espera, ciclos ilimitados e triagem P0/P1/P2/P3.
- Templates de estado, PR e review; testes de contrato.
- Reconstrução baseada nos requisitos conhecidos, sem diff contra o ZIP anterior inacessível (veja MIGRATION-NOTE.md).
