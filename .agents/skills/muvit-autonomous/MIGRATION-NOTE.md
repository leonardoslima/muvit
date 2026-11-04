# Nota de migração e proveniência

## Estado atual — v8.2 local, 2026-11-04

A delegação usa workers supervisionados do Orca, com chat nativo preferencial conforme a configuração do usuário e CLI como fallback autorizado. O coordenador transmite modelo, esforço e instruções dos TOMLs explicitamente; os perfis da v8.1 foram preservados. Não há dependência de Batuta nem fallback para subagentes internos deste chat.

O ciclo usa os guias versionados servidos pelo binário Orca, eventos para retomar o coordenador, mensagens para correções e `worker_done` para reportar conclusão. O limite de threads internas Codex não limita workers Orca. Manutenção não inicia workers ou rodada; validação estática não comprova lançamento, superfície ou entrega de eventos no runtime.

## Registro histórico — v8.1 local, 2026-11-03

A base v8.0.0 foi restaurada do ZIP original em Downloads, com conferência byte a byte dos 17 arquivos. Após aprovação explícita dos modelos e esforços, a v8.1 usa Terra medium como coordenador, Sol high para planejamento e revisão em sessões independentes, Terra xhigh para implementação, Luna medium para checks e Terra medium para QA visual. As configurações ficam em `.codex/` do projeto; a delegação é direta, sem dependência de orchestrator ou Batuta. QA visual não exige comparação com design de referência.

Os perfis são uma escolha baseada nos benchmarks consultados e na preferência por economizar a assinatura Plus; não garantem consumo por card. O pacote v7.6 em Downloads foi consultado para recuperar a ideia dos agentes especializados. A limitação abaixo descreve a criação histórica da v8, não a disponibilidade atual desse ZIP. Testes estáticos e validação dos TOMLs não comprovam uma rodada real.

## Registro histórico do pacote v8.0.0

Data: 2026-10-25
Pacote: `muvit-autonomous` v8.0.0 standalone

O usuário pediu uma versão **completa da skill**, não um atualizador. Esta entrega contém `SKILL.md`, protocolos de execução detalhados, templates e testes em um único diretório instalável, sem precisar executar `apply.py` sobre a versão anterior.

**Limitação importante:** a versão `muvit-autonomous-harness-v7.6.zip` está indexada na Biblioteca, mas as tentativas de leitura/materialização de bytes falharam por indisponibilidade do arquivo de Projeto. Não foi possível realizar diff nem preservar conteúdos desconhecidos daquele pacote; o presente ZIP é uma reconstrução organizada segundo os requisitos aprovados e as informações recuperadas. Não alegar que todas as convenções, testes e personalizações não vistas foram preservadas.

## Compatibilidade verificada por regras

- exatamente um card `agent_ready` por run; dependências e claim;
- main Codex coordenador, Superpowers autônomo, `orchestrator` para modelos e workers;
- native e CLI permitidos; sem proibição de subagentes internos;
- worktree/branch curtas, DB+API com Docker isolados por card;
- mobile via `adb`, web com browser Orca, `.pen` via Pen CLI;
- PR, Codex Review após PR/push, polling 5 min/6 checks por espera;
- reparos ilimitados, P0/P1 obrigatórios, P2/P3 com justificativa;
- PR para revisão humana, sem merge automático; limpeza segura;
- sem agentes com modelo/effort fixo, sem `model-router`.

## Instalação segura

1. Faça backup local da skill anterior que realmente estiver instalada.
2. Extraia `muvit-autonomous/` para sua pasta de skills, substituindo apenas após conferir diferenças relevantes.
3. Execute os testes de contrato. Para a versão atual, verifique os guias e runtime Orca, perfis, Superpowers e ambiente antes de habilitar a rodada agendada. O uso de `orchestrator` acima pertence ao registro histórico da v8.0.
4. Somente com autorização específica, use workers ou um card simples e independente como smoke test; não declare compatibilidade operacional só pelos testes textuais.

Esta migração não editou a instalação local nem removeu as skills antigas do computador.
