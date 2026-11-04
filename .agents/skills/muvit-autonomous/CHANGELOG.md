# Changelog

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
