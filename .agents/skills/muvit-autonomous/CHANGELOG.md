# Changelog

## 9.0.0 — 2026-10-30

- Migração local para Batuta v19, com backends nativo/CLI distintos, cotas e limites aprovados, briefs e rastreamento de workers.
- Descrição com gatilhos e leitura por etapa conforme a aula “Skills como manual de operação” do curso Harness Engineering.
- Autorização delimitada à rodada pedida; manutenção da skill não inicia card nem autoriza publicação ou reconfiguração.
- Ambiente proporcional ao aceite, reaproveitamento de worktree gerenciada e cópia de `.env` antes de setup, testes e builds.
- Correção do mapa do projeto e adoção do diretório oficial de artefatos; revisão da HEAD e demais gates preservados.
- Testes estáticos e cenários comportamentais reproduzíveis; avaliação sem mutações em GitHub/Linear.

## 8.0.0 — 2026-10-25

- Pacote completo e instalável, sem script de atualização e sem depender do ZIP v7.6.
- Responsabilidade da skill limitada ao workflow específico do Muvit; descoberta de modelos/roteamento/delegação enviados à `orchestrator` externa.
- Backend `native` e `cli` autorizados; agentes internos não têm modelo/effort fixo e subagentes internos são permitidos pelo backend quando disponíveis.
- Superpowers autônomo, um `agent_ready` por rodada, worktree/DB exclusivos, QA ADB/web/Pen e PR.
- Codex Review pós-PR e pós-push com polling 5 min/6 checks por espera, ciclos ilimitados e triagem P0/P1/P2/P3.
- Templates de estado, PR e review; testes de contrato.
- Reconstrução baseada nos requisitos conhecidos, sem diff contra o ZIP anterior inacessível (veja MIGRATION-NOTE.md).
