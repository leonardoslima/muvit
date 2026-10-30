# Nota de migração e proveniência

## Revisão local v9 — 2026-10-30

Esta cópia do projeto foi migrada para Batuta v19 a partir dos arquivos v8 disponíveis localmente. A instalação global não foi alterada. Foram aplicados critérios das aulas 04 e 05 do Módulo 03 do curso Harness Engineering: descoberta precisa, referências sob demanda e separação de capacidade, procedimento e informação. Os testes estáticos e cenários em `tests/behavioral-scenarios.md` não comprovam uma rodada real em serviços externos. A nota abaixo permanece como registro histórico da origem v8; suas instruções de instalação e dependência antiga não definem o fluxo v9.

## Origem v8 (histórico)

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
3. Execute os testes de contrato. Verifique `orchestrator` e Superpowers reais, plugins e ambiente antes de habilitar a rodada agendada.
4. Use um card simples e independente como smoke test; não declare compatibilidade operacional só pelos testes textuais.

Esta migração não editou a instalação local nem removeu as skills antigas do computador.
